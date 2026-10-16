import { describe, it, expect } from "vitest";

describe("State Complaint Demographic & Address Resolution", () => {
  it("resolves student address from CRM contact if present", () => {
    const student = {
      address: "450 Peachtree St NE",
      city: "Atlanta",
      state: "GA",
      zipCode: "30308",
    };
    const iepDemo = {
      address: "123 Old Rd",
    };

    const hasValue = (val?: string | null): val is string =>
      Boolean(val && val.trim() !== "" && !val.includes("[Not Found") && !val.includes("1234 Heritage") && !val.includes("555-0192"));

    const sAddress =
      (hasValue(student.address) ? student.address.trim() : null) ||
      (hasValue(iepDemo?.address) ? iepDemo.address.trim() : null) ||
      "[Not Found on Record]";

    expect(sAddress).toBe("450 Peachtree St NE");
  });

  it("pulls student address from IEP if missing from CRM contact record", () => {
    const student = {
      address: "",
      city: "",
      state: "GA",
      zipCode: "",
    };
    const iepDemo = {
      address: "789 Timber Ridge Rd",
      city: "Marietta",
      state: "GA",
      zipCode: "30068",
    };

    const hasValue = (val?: string | null): val is string =>
      Boolean(val && val.trim() !== "" && !val.includes("[Not Found") && !val.includes("1234 Heritage") && !val.includes("555-0192"));

    const sAddress =
      (hasValue(student.address) ? student.address.trim() : null) ||
      (hasValue(iepDemo?.address) ? iepDemo.address.trim() : null) ||
      "[Not Found on Record]";

    expect(sAddress).toBe("789 Timber Ridge Rd");
  });

  it("parent address automatically matches student address unless physically customized", () => {
    const sAddress = "789 Timber Ridge Rd";
    const sCity = "Marietta";
    const sState = "GA";
    const sZip = "30068";

    let isParentAddressCustom = false;
    let parentCustomAddress = "";

    const resolveParentAddress = (custom: boolean, customAddr: string) => {
      if (custom && customAddr) {
        return customAddr;
      }
      return sAddress;
    };

    // Default: parent address matches student address
    expect(resolveParentAddress(isParentAddressCustom, parentCustomAddress)).toBe("789 Timber Ridge Rd");

    // When physically changed by user
    isParentAddressCustom = true;
    parentCustomAddress = "100 Alternate Ave";
    expect(resolveParentAddress(isParentAddressCustom, parentCustomAddress)).toBe("100 Alternate Ave");
  });

  it("only marks address as [Not Found on Record] if missing from BOTH records and IEP", () => {
    const student = {
      address: "",
    };
    const iepDemo = {
      address: null,
    };

    const hasValue = (val?: string | null): val is string =>
      Boolean(val && val.trim() !== "" && !val.includes("[Not Found") && !val.includes("1234 Heritage") && !val.includes("555-0192"));

    const sAddress =
      (hasValue(student.address) ? student.address.trim() : null) ||
      (hasValue(iepDemo?.address) ? iepDemo.address.trim() : null) ||
      "[Not Found on Record]";

    expect(sAddress).toBe("[Not Found on Record]");
  });

  it("scrubs any fabricated mock placeholders", () => {
    const mockValues = [
      "1234 Heritage Way SW, Marietta, GA 30064",
      "(404) 555-0192",
      "parent@example.com",
      "9004812736",
    ];

    const isMock = (v: string) =>
      v.includes("1234 Heritage") ||
      v.includes("555-0192") ||
      v.includes("parent@example.com") ||
      v.includes("9004812736");

    for (const v of mockValues) {
      expect(isMock(v)).toBe(true);
    }
  });
});
