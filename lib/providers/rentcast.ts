export type RentCastAvm = {
  price?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  rent?: number;
};

export async function getRentCastAvm(address: string, apiKey?: string): Promise<RentCastAvm | null> {
  if (!apiKey || !address.trim()) return null;

  const url = new URL("https://api.rentcast.io/v1/avm/value");
  url.searchParams.set("address", address);

  const res = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey
    },
    cache: "no-store"
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as RentCastAvm;
  return data;
}
