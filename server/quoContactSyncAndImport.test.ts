import { describe, it, expect } from "vitest";
import {
  extractContactPhones,
  extractContactEmails,
  mergeNotesWithAdditionalChannels,
} from "./services/quo";
import {
  parseCsvText,
  parseVcfText,
  autoGuessFieldMapping,
} from "../client/src/lib/contactFileParser";

describe("Two-Way Quo Contact Sync & Multi-Channel Contact Import", () => {
  it("preserves multiple phone numbers and emails across sync and import", () => {
    const mergedNotes = mergeNotesWithAdditionalChannels(
      "Parent prefers morning calls.",
      ["(404) 555-0101", "(404) 555-0102", "(404) 555-0103"],
      ["primary@example.com", "second@example.com", "third@example.com"]
    );

    const record = {
      phone: "(404) 555-0101",
      secondParentPhone: "(404) 555-0102",
      email: "primary@example.com",
      secondParentEmail: "second@example.com",
      notes: mergedNotes,
    };

    const phones = extractContactPhones(record);
    const emails = extractContactEmails(record);

    expect(phones).toEqual(["(404) 555-0101", "(404) 555-0102", "(404) 555-0103"]);
    expect(emails).toEqual(["primary@example.com", "second@example.com", "third@example.com"]);
    expect(mergedNotes).toContain("Parent prefers morning calls.");
  });

  it("parses CSV files including quoted fields and auto-recognizes columns", () => {
    const csv = [
      "First Name,Last Name,Email,Additional Email,Phone,Mobile Phone,Organization,Job Title,Notes",
      '"Sarah","Sterling","sarah@example.com","sarah.work@example.com","(404) 555-0182","(404) 555-0199","Sterling Family","Parent, Guardian","Prefers mornings"',
    ].join("\n");

    const parsed = parseCsvText(csv);
    expect(parsed.headers).toHaveLength(9);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]["First Name"]).toBe("Sarah");
    expect(parsed.rows[0]["Job Title"]).toBe("Parent, Guardian");

    const mapping = autoGuessFieldMapping(parsed.headers);
    expect(mapping["First Name"]).toBe("firstName");
    expect(mapping["Last Name"]).toBe("lastName");
    expect(mapping["Email"]).toBe("email");
    expect(mapping["Additional Email"]).toBe("additionalEmail");
    expect(mapping["Phone"]).toBe("phone");
    expect(mapping["Mobile Phone"]).toBe("additionalPhone");
    expect(mapping["Organization"]).toBe("company");
    expect(mapping["Job Title"]).toBe("jobTitle");
    expect(mapping["Notes"]).toBe("notes");
  });

  it("parses vCard (.vcf) files with multiple TEL and EMAIL properties", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Vance;David;;;",
      "FN:David Vance",
      "ORG:Vance Family",
      "TITLE:Parent / Guardian",
      "TEL;TYPE=CELL:(404) 555-0194",
      "TEL;TYPE=WORK:(404) 555-0195",
      "EMAIL;TYPE=HOME:david@example.com",
      "EMAIL;TYPE=WORK:dvance@work.org",
      "ADR;TYPE=HOME:;;100 Peachtree St;Atlanta;GA;30303;USA",
      "NOTE:IEP Prep Case",
      "END:VCARD",
    ].join("\r\n");

    const parsed = parseVcfText(vcf);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]["First Name"]).toBe("David");
    expect(parsed.rows[0]["Last Name"]).toBe("Vance");
    expect(parsed.rows[0]["Primary Phone"]).toBe("(404) 555-0194");
    expect(parsed.rows[0]["Additional Phone 2"]).toBe("(404) 555-0195");
    expect(parsed.rows[0]["Primary Email"]).toBe("david@example.com");
    expect(parsed.rows[0]["Additional Email 2"]).toBe("dvance@work.org");
    expect(parsed.rows[0]["City"]).toBe("Atlanta");
  });
});

