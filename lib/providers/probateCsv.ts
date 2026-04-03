export type ProbateCsvSignal = {
  caseNumber: string;
  decedentName: string;
  city: string;
  filedDate: string;
  source: string;
  confidence: number;
};

export function parseProbateCsv(csvContent: string): ProbateCsvSignal[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    caseNumber: headers.indexOf("case_number"),
    decedentName: headers.indexOf("decedent_name"),
    city: headers.indexOf("city"),
    filedDate: headers.indexOf("filed_date"),
    source: headers.indexOf("source")
  };

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      caseNumber: cols[idx.caseNumber] ?? "",
      decedentName: cols[idx.decedentName] ?? "",
      city: cols[idx.city] ?? "",
      filedDate: cols[idx.filedDate] ?? "",
      source: cols[idx.source] ?? "Probate CSV",
      confidence: 0.82
    };
  });
}
