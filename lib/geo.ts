export function extractZip(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

export function cleanAddressLine(address: string): string {
  return address.split(",")[0]?.trim() ?? address.trim();
}
