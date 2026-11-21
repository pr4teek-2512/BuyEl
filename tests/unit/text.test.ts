import { describe, expect, it } from "vitest";
import {
  deriveAbbreviation,
  toLooseE164,
  initials,
  maskPhone,
  normalizeName,
  normalizePhone,
  phoneWithoutCountryCode,
} from "@/lib/text";

describe("normalizeName", () => {
  it("ignores case, padding and repeated spaces", () => {
    expect(normalizeName("  Delhi   Technological  University ")).toBe(
      "delhi technological university",
    );
    expect(normalizeName("DELHI TECHNOLOGICAL UNIVERSITY")).toBe(
      normalizeName("delhi technological university"),
    );
  });

  it("treats a typed entry that matches the master list as the same entry", () => {
    const master = normalizeName("Civil Engineering");
    expect(normalizeName("civil engineering")).toBe(master);
    expect(normalizeName("Civil  Engineering ")).toBe(master);
    expect(normalizeName("Civil Engg")).not.toBe(master);
  });
});

describe("initials", () => {
  it("uses the first letter of the first and last name", () => {
    expect(initials("abhishek", "singh")).toBe("AS");
    expect(initials("Abhishek Singh")).toBe("AS");
  });

  it("falls back to the first two letters of a single name", () => {
    expect(initials("abhishek")).toBe("AB");
    expect(initials("A")).toBe("A");
  });

  it("never throws on empty input", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ", null)).toBe("?");
  });
});

describe("deriveAbbreviation", () => {
  it("builds the short form students actually type", () => {
    expect(deriveAbbreviation("Delhi Technological University")).toBe("DTU");
    expect(deriveAbbreviation("Indian Institute of Technology Delhi")).toBe("IITD");
    expect(deriveAbbreviation("Vivekananda Institute of Professional Studies")).toBe("VIPS");
  });

  it("handles a single word name", () => {
    expect(deriveAbbreviation("Amity")).toBe("AMI");
  });
});

describe("normalizePhone", () => {
  it("accepts the formats students type", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("919876543210")).toBe("+919876543210");
  });

  it("rejects anything that is not an Indian mobile number", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("1234567890")).toBeNull();
    expect(normalizePhone("abcdefghij")).toBeNull();
  });
});

describe("toLooseE164", () => {
  it("accepts a test account number that is not a real mobile", () => {
    expect(toLooseE164("0000000001")).toBe("+910000000001");
    expect(toLooseE164("+91 0000000001")).toBe("+910000000001");
  });

  it("still rejects something that cannot be a number at all", () => {
    expect(toLooseE164("123")).toBeNull();
    expect(toLooseE164("")).toBeNull();
  });
});

describe("phone display helpers", () => {
  it("strips the country code and masks the middle", () => {
    expect(phoneWithoutCountryCode("+919876543210")).toBe("9876543210");
    expect(maskPhone("+919876543210")).toBe("98******10");
  });
});
