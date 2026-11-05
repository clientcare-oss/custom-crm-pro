/**
 * Client-side parsers for .csv (including Google Contacts & Outlook exports),
 * .vcf (vCard 2.1 / 3.0 / 4.0 with multiple TEL and EMAIL fields),
 * and .xlsx (Office Open XML Spreadsheet via DecompressionStream + XML parsing,
 * plus HTML/CSV fallback).
 */

export interface RawImportFileResult {
  fileName: string;
  format: "csv" | "vcf" | "xlsx";
  headers: string[];
  rows: Record<string, string>[];
}

export type MappedTargetField =
  | "skip"
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "additionalEmail"
  | "phone"
  | "additionalPhone"
  | "company"
  | "jobTitle"
  | "address"
  | "city"
  | "state"
  | "zipCode"
  | "notes";

export const TARGET_FIELD_OPTIONS: { value: MappedTargetField; label: string }[] = [
  { value: "skip", label: "— Skip Column —" },
  { value: "fullName", label: "Full Name" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Primary Email" },
  { value: "additionalEmail", label: "Additional Email (2nd / 3rd)" },
  { value: "phone", label: "Primary Phone" },
  { value: "additionalPhone", label: "Additional Phone (Mobile / Work / Home)" },
  { value: "company", label: "Organization / Company / School" },
  { value: "jobTitle", label: "Job Title / Role" },
  { value: "address", label: "Street Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zipCode", label: "Zip / Postal Code" },
  { value: "notes", label: "Notes" },
];

export function autoGuessFieldMapping(headers: string[]): Record<string, MappedTargetField> {
  const mapping: Record<string, MappedTargetField> = {};
  let primaryEmailAssigned = false;
  let primaryPhoneAssigned = false;

  for (const h of headers) {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (clean === "name" || clean === "fullname" || clean === "displayname" || clean === "contactname") {
      mapping[h] = "fullName";
    } else if (clean === "firstname" || clean === "givenname" || clean === "first") {
      mapping[h] = "firstName";
    } else if (clean === "lastname" || clean === "familyname" || clean === "surname" || clean === "last") {
      mapping[h] = "lastName";
    } else if (clean.includes("email") || clean.includes("mail")) {
      if (!primaryEmailAssigned) {
        mapping[h] = "email";
        primaryEmailAssigned = true;
      } else {
        mapping[h] = "additionalEmail";
      }
    } else if (
      clean.includes("phone") ||
      clean.includes("mobile") ||
      clean.includes("cell") ||
      clean.includes("tel")
    ) {
      if (clean.includes("value") || !clean.includes("type")) {
        if (!primaryPhoneAssigned) {
          mapping[h] = "phone";
          primaryPhoneAssigned = true;
        } else {
          mapping[h] = "additionalPhone";
        }
      } else {
        mapping[h] = "skip";
      }
    } else if (
      clean === "company" ||
      clean === "organization" ||
      clean === "organizationname" ||
      clean === "organization1name" ||
      clean === "school" ||
      clean === "district"
    ) {
      mapping[h] = "company";
    } else if (
      clean === "jobtitle" ||
      clean === "title" ||
      clean === "role" ||
      clean === "position" ||
      clean === "organization1title"
    ) {
      mapping[h] = "jobTitle";
    } else if (
      clean === "address" ||
      clean === "street" ||
      clean === "streetaddress" ||
      clean === "businessstreet" ||
      clean === "homestreet" ||
      clean === "address1street"
    ) {
      mapping[h] = "address";
    } else if (clean === "city" || clean === "businesscity" || clean === "homecity" || clean === "address1city") {
      mapping[h] = "city";
    } else if (clean === "state" || clean === "region" || clean === "businessstate" || clean === "homestate") {
      mapping[h] = "state";
    } else if (
      clean === "zip" ||
      clean === "zipcode" ||
      clean === "postalcode" ||
      clean === "businesspostalcode" ||
      clean === "homepostalcode"
    ) {
      mapping[h] = "zipCode";
    } else if (clean === "notes" || clean === "note" || clean === "comments" || clean === "description") {
      mapping[h] = "notes";
    } else {
      mapping[h] = "skip";
    }
  }

  return mapping;
}

/**
 * Parse RFC-4180 CSV text into headers + row objects
 */
export function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const cleanText = text.replace(/^\uFEFF/, ""); // Strip UTF-8 BOM
  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (ch === "\r" && next === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          records.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          records.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      records.push(currentRow);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = records[0].map((h, idx) => h || `Column ${idx + 1}`);
  // Deduplicate header names
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h) => {
    const count = seen.get(h) || 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h} (${count + 1})`;
  });

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const rowArr = records[r];
    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      const val = (rowArr[idx] || "").trim();
      if (val) hasValue = true;
      obj[h] = val;
    });
    if (hasValue) rows.push(obj);
  }

  return { headers, rows };
}

/**
 * Parse vCard (.vcf) 2.1 / 3.0 / 4.0 text into normalized columns supporting multiple phones & emails
 */
export function parseVcfText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const rows: Record<string, string>[] = [];
  let maxPhones = 1;
  let maxEmails = 1;

  for (const rawCard of cards) {
    const body = rawCard.split(/END:VCARD/i)[0] || "";
    const lines = body.split(/\r?\n/);

    let fullName = "";
    let firstName = "";
    let lastName = "";
    let company = "";
    let jobTitle = "";
    let address = "";
    let city = "";
    let state = "";
    let zipCode = "";
    let notes = "";
    const phones: string[] = [];
    const emails: string[] = [];

    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const propPart = line.slice(0, colonIdx).trim();
      const valPart = line
        .slice(colonIdx + 1)
        .trim()
        .replace(/\\n/gi, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";");
      if (!valPart) continue;

      const propName = propPart.split(";")[0].toUpperCase().replace(/^ITEM\d+\./, "");

      if (propName === "FN") {
        fullName = valPart;
      } else if (propName === "N") {
        const parts = valPart.split(";");
        lastName = (parts[0] || "").trim();
        firstName = (parts[1] || "").trim();
      } else if (propName === "TEL") {
        if (!phones.includes(valPart)) phones.push(valPart);
      } else if (propName === "EMAIL") {
        if (!emails.includes(valPart)) emails.push(valPart);
      } else if (propName === "ORG") {
        company = valPart.split(";")[0].trim();
      } else if (propName === "TITLE" || propName === "ROLE") {
        jobTitle = valPart;
      } else if (propName === "ADR") {
        const adrParts = valPart.split(";");
        address = (adrParts[2] || "").trim();
        city = (adrParts[3] || "").trim();
        state = (adrParts[4] || "").trim();
        zipCode = (adrParts[5] || "").trim();
      } else if (propName === "NOTE") {
        notes = valPart;
      }
    }

    if (!firstName && !lastName && fullName) {
      const sp = fullName.trim().split(/\s+/);
      firstName = sp[0] || "";
      lastName = sp.slice(1).join(" ");
    }

    if (!firstName && !lastName && phones.length === 0 && emails.length === 0) continue;

    if (phones.length > maxPhones) maxPhones = phones.length;
    if (emails.length > maxEmails) maxEmails = emails.length;

    const record: Record<string, string> = {
      "First Name": firstName,
      "Last Name": lastName,
      "Full Name": fullName || `${firstName} ${lastName}`.trim(),
      "Primary Email": emails[0] || "",
      "Primary Phone": phones[0] || "",
      Organization: company,
      "Job Title": jobTitle,
      Address: address,
      City: city,
      State: state,
      "Zip Code": zipCode,
      Notes: notes,
    };

    for (let p = 1; p < phones.length; p++) {
      record[`Additional Phone ${p + 1}`] = phones[p];
    }
    for (let e = 1; e < emails.length; e++) {
      record[`Additional Email ${e + 1}`] = emails[e];
    }

    rows.push(record);
  }

  const headers = [
    "First Name",
    "Last Name",
    "Full Name",
    "Primary Email",
    ...Array.from({ length: Math.max(0, maxEmails - 1) }, (_, i) => `Additional Email ${i + 2}`),
    "Primary Phone",
    ...Array.from({ length: Math.max(0, maxPhones - 1) }, (_, i) => `Additional Phone ${i + 2}`),
    "Organization",
    "Job Title",
    "Address",
    "City",
    "State",
    "Zip Code",
    "Notes",
  ];

  return { headers, rows };
}

/**
 * Minimal ZIP reader using browser DecompressionStream("deflate-raw") to extract XML entries from .xlsx
 */
async function extractZipEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = new Map<string, string>();
  const decoder = new TextDecoder("utf-8");

  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Not a valid ZIP/XLSX archive");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let ptr = cdOffset;
  for (let e = 0; e < totalEntries; e++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));
    ptr += 46 + fileNameLen + extraLen + commentLen;

    if (
      fileName === "xl/sharedStrings.xml" ||
      fileName.startsWith("xl/worksheets/sheet")
    ) {
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedSlice = bytes.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        entries.set(fileName, decoder.decode(compressedSlice));
      } else if (compressionMethod === 8 && typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(compressedSlice);
        writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        entries.set(fileName, decoder.decode(new Uint8Array(decompressedBuf)));
      }
    }
  }

  return entries;
}

function colLettersToIndex(letters: string): number {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/**
 * Parse .xlsx ArrayBuffer into headers + rows
 */
export async function parseXlsxBuffer(
  buffer: ArrayBuffer
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  try {
    const entries = await extractZipEntries(buffer);
    const sharedStringsXml = entries.get("xl/sharedStrings.xml") || "";
    const sheetXml =
      entries.get("xl/worksheets/sheet1.xml") ||
      Array.from(entries.entries()).find(([k]) => k.startsWith("xl/worksheets/sheet"))?.[1] ||
      "";

    if (!sheetXml) {
      throw new Error("Worksheet XML not found in XLSX");
    }

    const parser = new DOMParser();
    const sharedStrings: string[] = [];
    if (sharedStringsXml) {
      const ssDoc = parser.parseFromString(sharedStringsXml, "application/xml");
      const siNodes = Array.from(ssDoc.getElementsByTagName("si"));
      for (const si of siNodes) {
        const tNodes = Array.from(si.getElementsByTagName("t"));
        sharedStrings.push(tNodes.map((t) => t.textContent || "").join(""));
      }
    }

    const sheetDoc = parser.parseFromString(sheetXml, "application/xml");
    const rowNodes = Array.from(sheetDoc.getElementsByTagName("row"));
    const grid: string[][] = [];

    for (const rowNode of rowNodes) {
      const cells = Array.from(rowNode.getElementsByTagName("c"));
      const rowValues: string[] = [];
      for (const cell of cells) {
        const ref = cell.getAttribute("r") || "";
        const colMatch = ref.match(/^[A-Z]+/i);
        const colIdx = colMatch ? colLettersToIndex(colMatch[0].toUpperCase()) : rowValues.length;
        const cellType = cell.getAttribute("t") || "";
        const vNode = cell.getElementsByTagName("v")[0];
        const isNode = cell.getElementsByTagName("is")[0];

        let val = "";
        if (cellType === "s" && vNode) {
          const sIdx = parseInt(vNode.textContent || "0", 10);
          val = sharedStrings[sIdx] || "";
        } else if (cellType === "inlineStr" && isNode) {
          val = isNode.textContent || "";
        } else if (vNode) {
          val = vNode.textContent || "";
        }

        while (rowValues.length <= colIdx) rowValues.push("");
        rowValues[colIdx] = val.trim();
      }
      if (rowValues.some((v) => v.length > 0)) {
        grid.push(rowValues);
      }
    }

    if (grid.length === 0) return { headers: [], rows: [] };

    const rawHeaders = grid[0].map((h, i) => h || `Column ${i + 1}`);
    const rows: Record<string, string>[] = [];
    for (let r = 1; r < grid.length; r++) {
      const rowObj: Record<string, string> = {};
      let hasData = false;
      rawHeaders.forEach((h, i) => {
        const v = (grid[r][i] || "").trim();
        if (v) hasData = true;
        rowObj[h] = v;
      });
      if (hasData) rows.push(rowObj);
    }

    return { headers: rawHeaders, rows };
  } catch {
    // Fallback if file is CSV/TSV saved with .xlsx extension
    const text = new TextDecoder("utf-8").decode(new Uint8Array(buffer));
    return parseCsvText(text);
  }
}

export async function parseContactImportFile(file: File): Promise<RawImportFileResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".vcf") || lower.endsWith(".vcard")) {
    const text = await file.text();
    const { headers, rows } = parseVcfText(text);
    return { fileName: file.name, format: "vcf", headers, rows };
  }
  if (lower.endsWith(".xlsx")) {
    const buf = await file.arrayBuffer();
    const { headers, rows } = await parseXlsxBuffer(buf);
    return { fileName: file.name, format: "xlsx", headers, rows };
  }
  const text = await file.text();
  const { headers, rows } = parseCsvText(text);
  return { fileName: file.name, format: "csv", headers, rows };
}

export function generateSampleContactsCsvTemplate(): string {
  return [
    "First Name,Last Name,Email,Additional Email,Phone,Mobile Phone,Organization,Job Title,Address,City,State,Zip Code,Notes",
    '"Sarah","Sterling","sarah.sterling@example.com","s.sterling.work@example.com","(404) 555-0182","(404) 555-0199","Sterling Family","Parent / Guardian","1200 Peachtree St NE","Atlanta","GA","30309","Prefers morning calls before 11am"',
    '"Dr. Marcus","Vance","mvance@atlantaspeech.org","","(770) 555-0144","","Atlanta Pediatric Speech","Speech-Language Pathologist","450 Buckhead Ave","Atlanta","GA","30305","Independent evaluator"',
  ].join("\n");
}

