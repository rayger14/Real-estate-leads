import { PropertyRecord, MarketUpdate } from "@/lib/types";

type ContextDoc = {
  id: string;
  content: string;
  tags: string[];
};

const knowledgeBase: ContextDoc[] = [
  {
    id: "playbook-off-market",
    tags: ["off-market", "rundown", "timeline", "certainty"],
    content:
      "Off-market transactions in older South Bay housing stock tend to exchange speed and certainty for a pricing discount. Owners usually prioritize convenience, avoiding repairs, and minimizing showings."
  },
  {
    id: "playbook-listing",
    tags: ["listing", "prep", "showings", "price"],
    content:
      "Listing strategy can maximize gross price when prep quality and market timing align, but cost stack includes agent fees, concessions, hold time, and market volatility risk."
  },
  {
    id: "tax-1031",
    tags: ["1031", "exchange", "tax", "legal"],
    content:
      "A 1031 exchange can defer capital gains for investment property when strict identification and closing timelines are met. Primary residences typically do not qualify under standard 1031 rules."
  },
  {
    id: "compliance-guardrail",
    tags: ["legal", "compliance", "fair-housing"],
    content:
      "Lead scoring should not use protected characteristics. Outreach should be compliant with telemarketing, privacy, and fair housing rules. AI output should be framed as informational and not legal or tax advice."
  }
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function overlapScore(queryTokens: string[], doc: ContextDoc): number {
  const tokens = new Set(tokenize(doc.content + " " + doc.tags.join(" ")));
  let hits = 0;
  for (const token of queryTokens) {
    if (tokens.has(token)) hits += 1;
  }
  return hits;
}

export function retrieveContext(question: string, updates: MarketUpdate[], properties: PropertyRecord[]): string[] {
  const qTokens = tokenize(question);

  const docs = knowledgeBase
    .map((d) => ({ ...d, score: overlapScore(qTokens, d) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) => d.content);

  const updateSnippets = updates.slice(0, 2).map((u) => `${u.city} (${u.asOfDate}): ${u.summary}`);

  const propertySnippet = properties
    .slice(0, 1)
    .map((p) => `${p.city} average-condition target profile: ${p.bedrooms}bd, ${p.sqft} sqft, est value ${Math.round(p.estimatedValue)}`);

  return [...docs, ...updateSnippets, ...propertySnippet];
}

export function composeFallbackAnswer(question: string, context: string[]): string {
  return [
    `Question: ${question}`,
    "South Bay guidance (informational):",
    ...context.map((c) => `- ${c}`),
    "For exact pricing, title, and tax outcomes, confirm with licensed legal/tax professionals and a CMA from current local comps."
  ].join("\n");
}
