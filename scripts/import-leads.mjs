#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const CITY_DEFAULT_VALUE = 1500000;

function parseArgs(argv) {
  const args = {
    source: "",
    dest: join(process.cwd(), "data", "importedProperties.json")
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--source" && argv[i + 1]) {
      args.source = argv[i + 1];
      i += 1;
    } else if (token === "--dest" && argv[i + 1]) {
      args.dest = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseCsvRows(content) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function parseMoney(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBool(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return ["yes", "y", "true", "1"].includes(text);
}

function hashText(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

function normalizeAddressKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function inferCity(address, explicitCity) {
  const city = String(explicitCity ?? "").trim();
  if (city) return city;
  const parts = String(address ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts[1] || "Unknown";
}

function inferCityFromFileName(fileName) {
  const lower = String(fileName).toLowerCase();
  if (lower.includes("saratoga")) return "Saratoga";
  if (lower.includes("cupertino") || lower.includes("cup ")) return "Cupertino";
  if (lower.includes("menlo")) return "Menlo Park";
  if (lower.includes("callelites")) return "Redwood City";
  return "Unknown";
}

function inferOwnerName(row) {
  const first = row.firstname || row["1stownersfirstname"] || "";
  const last = row.lastname || row["1stownerslastname"] || "";
  const secondFirst = row["2ndownersfirstname"] || "";
  const secondLast = row["2ndownerslastname"] || "";
  const ownersName = row.ownersname || row.ownername || "";

  const primary = [first, last].filter(Boolean).join(" ").trim();
  const secondary = [secondFirst, secondLast].filter(Boolean).join(" ").trim();
  return ownersName || primary || secondary || "Unknown Owner";
}

function inferOwnershipType(ownerName) {
  const lower = String(ownerName).toLowerCase();
  if (lower.includes("trust")) return "trust";
  if (lower.includes("estate")) return "estate";
  if (lower.includes("llc")) return "llc";
  return "individual";
}

function inferConditionScore(scaleValue, textValue) {
  const numeric = Math.round(parseNumber(scaleValue));
  if (numeric >= 1 && numeric <= 10) return numeric;
  const text = String(textValue ?? "").toLowerCase();
  if (text.includes("poor") || text.includes("repair") || text.includes("fixer")) return 3;
  if (text.includes("fair")) return 5;
  if (text.includes("good")) return 7;
  if (text.includes("great") || text.includes("excellent")) return 8;
  return 5;
}

function inferOwnershipYears(timeline, lastSaleDate) {
  const timelineMatch = String(timeline ?? "").match(/\d{1,2}/);
  if (timelineMatch) return Number(timelineMatch[0]);
  const yearMatch = String(lastSaleDate ?? "").match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return Math.max(0, new Date().getFullYear() - Number(yearMatch[0]));
  return 12;
}

function inferAgeBand(ownershipYears) {
  if (ownershipYears >= 25) return "75+";
  if (ownershipYears >= 15) return "60-74";
  if (ownershipYears >= 7) return "45-59";
  return "<45";
}

function inferEngagementScore(row) {
  const status = String(row.leadstatus || row.status || "").toLowerCase();
  let score = 35;
  if (status.includes("contacted")) score = 60;
  if (status.includes("warm") || status.includes("hot")) score = 72;
  if (status.includes("skip") || status.includes("dead")) score = 12;

  if (String(row.reasonforselling || "").trim()) score += 12;
  if (String(row.shawnconversation || "").trim()) score += 10;
  if (String(row.rayconversation || "").trim()) score += 10;
  if (String(row.additionalinfo || "").trim()) score += 6;

  return Math.min(100, Math.max(0, score));
}

function inferLastOutboundDays(timestamp) {
  if (!timestamp) return 90;
  const date = new Date(String(timestamp));
  if (Number.isNaN(date.getTime())) return 90;
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

function cityBaseline(city) {
  const normalized = String(city ?? "").toLowerCase();
  if (normalized.includes("cupertino")) return 2300000;
  if (normalized.includes("saratoga")) return 2600000;
  if (normalized.includes("menlo")) return 2800000;
  if (normalized.includes("sunnyvale")) return 1900000;
  if (normalized.includes("santa clara")) return 1700000;
  if (normalized.includes("redwood")) return 2000000;
  if (normalized.includes("san jose")) return 1600000;
  return CITY_DEFAULT_VALUE;
}

function inferEstimatedValue(explicitValue, sqft, city) {
  if (explicitValue > 0) return Math.round(explicitValue);
  if (sqft > 0) return Math.round(sqft * 1100);
  return cityBaseline(city);
}

function inferAbsentee(row, propertyAddress) {
  const ownerOccupiedRaw = row.owneroccupied ?? row.occupancy ?? "";
  const ownerOccupied = String(ownerOccupiedRaw).toLowerCase();
  if (ownerOccupied.includes("owner")) return false;
  if (ownerOccupied.includes("tenant") || ownerOccupied.includes("vacant")) return true;

  if (toBool(row.isvacant)) return true;

  const mailingAddress = row.mailingaddress || row.fullmailaddress || "";
  if (!mailingAddress) return false;
  return normalizeAddressKey(mailingAddress) !== normalizeAddressKey(propertyAddress);
}

function normalizeRow(row, fileName) {
  const propertyAddress = String(row.propertyaddress || row.siteaddress || row.address || "").trim();
  if (!propertyAddress) return null;

  const siteCity = row.sitecity || row.city || "";
  const state = row.sitestate || "CA";
  const zip = row.sitezipcode || row.mailingzip || "";
  const parsedCity = inferCity(propertyAddress, siteCity);
  const city = parsedCity === "Unknown" ? inferCityFromFileName(fileName) : parsedCity;

  const address = propertyAddress.includes(",")
    ? propertyAddress
    : `${propertyAddress}, ${city}${state ? `, ${state}` : ""}${zip ? ` ${zip}` : ""}`;

  const ownerName = inferOwnerName(row);
  const sqft = Math.round(parseNumber(row.totalbuildingareasquarefeet || row.buildingsize || row.sqft));
  const lotSqft = Math.round(parseNumber(row.lotsizesqft || row.lotsize || row.lotsqft));
  const bedrooms = Math.max(0, Math.round(parseNumber(row.bedrooms)));
  const bathrooms = Math.max(0, parseNumber(row.baths || row.bathrooms));
  const yearBuilt = Math.round(parseNumber(row.yearbuilt)) || 1970;
  const ownershipYears = inferOwnershipYears(row.ownershiptimeline, row.lastsaledate);
  const ownershipType = inferOwnershipType(ownerName);
  const trustFlag = ownershipType === "trust";
  const conditionScore = inferConditionScore(row.conditiononascaleof1to1o, row.propertycondition);
  const engagementScore = inferEngagementScore(row);
  const estimatedValue = inferEstimatedValue(
    parseMoney(row.marketvalue || row.askingprice || row.estimatedvalue),
    sqft,
    city
  );
  const mortgageRaw = parseMoney(row.mortgage);
  const estimatedMortgageBalance = mortgageRaw > estimatedValue ? 0 : mortgageRaw;

  const record = {
    id: `imp-${hashText(`${address}|${ownerName}|${fileName}`)}`,
    address,
    ownerName,
    city,
    bedrooms,
    bathrooms,
    sqft,
    lotSqft,
    yearBuilt,
    conditionScore,
    estimatedValue,
    estimatedMortgageBalance,
    ownerAgeBand: inferAgeBand(ownershipYears),
    ownershipYears,
    ownershipType,
    absenteeOwner: inferAbsentee(row, propertyAddress),
    trustFlag,
    taxDelinquentMonths: 0,
    permitCount24m: 0,
    codeViolationFlag: false,
    lastOutboundContactDays: inferLastOutboundDays(row.timestamp),
    engagementScore,
    probateFlag: false,
    deathRecordMatch: false
  };

  return record;
}

function richnessScore(record) {
  let score = 0;
  for (const key of ["ownerName", "city", "sqft", "lotSqft", "bedrooms", "bathrooms", "yearBuilt"]) {
    const value = record[key];
    if (typeof value === "number" && value > 0) score += 1;
    if (typeof value === "string" && value && value !== "Unknown") score += 1;
  }
  if (record.estimatedValue > 0) score += 1;
  if (record.engagementScore > 35) score += 1;
  return score;
}

function mapRowsWithHeaders(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const mapped = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => !String(cell ?? "").trim())) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c += 1) {
      const header = headers[c] || `col${c + 1}`;
      if (!(header in obj)) obj[header] = row[c] ?? "";
    }
    mapped.push(obj);
  }
  return mapped;
}

function extractDocxText(docxPath) {
  try {
    const text = execFileSync("textutil", ["-convert", "txt", "-stdout", docxPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return text.trim();
  } catch {
    return "";
  }
}

function inferTemplateTags(fileName, body) {
  const combined = `${fileName} ${body}`.toLowerCase();
  const tags = [];
  if (combined.includes("trust")) tags.push("trust");
  if (combined.includes("estate")) tags.push("estate");
  if (combined.includes("absentee")) tags.push("absentee");
  if (combined.includes("follow up") || combined.includes("follow-up")) tags.push("follow_up");
  if (combined.includes("neighbor")) tags.push("intro");
  if (tags.length === 0) tags.push("intro");
  return Array.from(new Set(tags));
}

function buildTemplateTitle(fileName) {
  return fileName
    .replace(/\.docx$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function parseCsvFile(filePath) {
  const content = await readFile(filePath, "utf8");
  const rows = parseCsvRows(content);
  return mapRowsWithHeaders(rows);
}

async function parseXlsxFile(filePath) {
  let xlsxPkg;
  try {
    xlsxPkg = await import("xlsx");
  } catch {
    console.warn(`Skipping ${basename(filePath)} because package 'xlsx' is not installed.`);
    return [];
  }

  const xlsx = xlsxPkg.default ?? xlsxPkg;
  const workbook = xlsx.readFile(filePath);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const worksheet = workbook.Sheets[firstSheet];
  return xlsx.utils.sheet_to_json(worksheet, { defval: "" });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.source) {
    console.error("Missing --source. Example: node scripts/import-leads.mjs --source '/path/to/folder'");
    process.exit(1);
  }

  const entries = await readdir(args.source, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => [".csv", ".xlsx"].includes(extname(name).toLowerCase()))
    .sort();

  const docxFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => extname(name).toLowerCase() === ".docx")
    .sort();

  if (files.length === 0 && docxFiles.length === 0) {
    console.error("No CSV/XLSX files found in source directory.");
    process.exit(1);
  }

  const records = [];
  const sourceStats = [];

  for (const file of files) {
    const fullPath = join(args.source, file);
    const ext = extname(file).toLowerCase();
    let rows = [];
    if (ext === ".csv") rows = await parseCsvFile(fullPath);
    if (ext === ".xlsx") rows = await parseXlsxFile(fullPath);

    let accepted = 0;
    for (const row of rows) {
      const normalized = normalizeRow(
        Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeHeader(k), v])),
        file
      );
      if (!normalized) continue;
      records.push(normalized);
      accepted += 1;
    }
    sourceStats.push({ file, rows: rows.length, accepted });
  }

  const deduped = new Map();
  for (const record of records) {
    const key = normalizeAddressKey(record.address);
    const existing = deduped.get(key);
    if (!existing || richnessScore(record) > richnessScore(existing)) deduped.set(key, record);
  }

  const output = Array.from(deduped.values()).sort((a, b) => a.address.localeCompare(b.address));
  const templateOutputPath = join(dirname(args.dest), "outreachTemplates.json");
  const templates = docxFiles
    .map((file, idx) => {
      const fullPath = join(args.source, file);
      const text = extractDocxText(fullPath);
      if (!text) return null;
      const body = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      return {
        id: `tpl-${idx + 1}`,
        title: buildTemplateTitle(file),
        channel: file.toLowerCase().includes("email") ? "email" : "letter",
        tags: inferTemplateTags(file, body),
        body
      };
    })
    .filter(Boolean);

  await mkdir(dirname(args.dest), { recursive: true });
  await writeFile(args.dest, JSON.stringify(output, null, 2), "utf8");
  await writeFile(templateOutputPath, JSON.stringify(templates, null, 2), "utf8");

  console.log(`Imported ${output.length} unique properties to ${args.dest}`);
  for (const stat of sourceStats) {
    console.log(`- ${stat.file}: ${stat.accepted}/${stat.rows} rows accepted`);
  }
  console.log(`Extracted ${templates.length} outreach templates to ${templateOutputPath}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
