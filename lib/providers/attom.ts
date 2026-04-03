export type AttomSaleSnapshot = {
  lastSalePrice?: number;
  lastSaleDate?: string;
  ownerOccupied?: boolean;
};

export async function getAttomSaleSnapshot(address1: string, postalCode: string, apiKey?: string): Promise<AttomSaleSnapshot | null> {
  if (!apiKey || !address1 || !postalCode) return null;

  const url = new URL("https://api.gateway.attomdata.com/propertyapi/v1.0.0/sale/snapshot");
  url.searchParams.set("address1", address1);
  url.searchParams.set("postalcode", postalCode);

  const res = await fetch(url, {
    headers: {
      apikey: apiKey,
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    property?: Array<{
      sale?: { saleTransPrice?: number; saleTransDate?: string };
      building?: { size?: { universalsize?: number } };
      summary?: { propclass?: string };
      owner?: { absenteeInd?: string };
    }>;
  };

  const row = data.property?.[0];
  return {
    lastSalePrice: row?.sale?.saleTransPrice,
    lastSaleDate: row?.sale?.saleTransDate,
    ownerOccupied: row?.owner?.absenteeInd ? row.owner.absenteeInd !== "Y" : undefined
  };
}
