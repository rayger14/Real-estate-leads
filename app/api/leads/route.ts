import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { properties } from "@/data/properties";
import { rankSellerLeads } from "@/lib/leadScoring";
import { cleanAddressLine, extractZip } from "@/lib/geo";
import { getAttomSaleSnapshot } from "@/lib/providers/attom";
import { readLeadStatuses, setLeadStatus } from "@/lib/leadStatusStore";
import { readImportedProperties } from "@/lib/importedProperties";
import { readOutreachTemplates, suggestOutreachTemplate } from "@/lib/outreachTemplates";
import { readPublicLeads } from "@/lib/publicLeadStore";

const updateSchema = z.object({
  propertyId: z.string().min(1),
  status: z.enum(["new", "verified", "skip", "contacted"])
});

export async function GET(_request: NextRequest) {
  const statuses = await readLeadStatuses();
  const imported = await readImportedProperties();
  const publicLeads = await readPublicLeads();
  const publicProperties = publicLeads.map((x) => x.property);
  const sourceRecords = imported.length > 0 ? [...imported, ...publicProperties] : [...properties, ...publicProperties];
  const ranked = rankSellerLeads(sourceRecords);
  const templates = await readOutreachTemplates();

  const enriched = await Promise.all(
    ranked.map(async (p) => {
      const zip = extractZip(p.address);
      const address1 = cleanAddressLine(p.address);
      const attom = zip
        ? await getAttomSaleSnapshot(address1, zip, process.env.ATTOM_API_KEY)
        : null;

      return {
        ...p,
        workflow: statuses[p.id] ?? {
          status: "new",
          updatedAt: null
        },
        leadSource: publicLeads.some((x) => x.property.id === p.id) ? "public_funnel" : "list_ingest",
        outreach: suggestOutreachTemplate(p, templates),
        liveData: {
          attom: attom ?? null
        }
      };
    })
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    leadCount: enriched.length,
    leads: enriched
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const statuses = await setLeadStatus(parsed.data.propertyId, parsed.data.status);
  return NextResponse.json({
    ok: true,
    propertyId: parsed.data.propertyId,
    workflow: statuses[parsed.data.propertyId]
  });
}
