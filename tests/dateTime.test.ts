import { describe, expect, it } from "vitest";
import {
  addRelativeDays,
  buildCalendarDays,
  dateKeyFromTimestamp,
  parseIstanbulDateTime,
  shiftMonth,
  toIstanbulDateTimeInput,
} from "../src/lib/dateTime";

describe("Istanbul date handling", () => {
  it("converts an Istanbul local value into a UTC timestamp", () => {
    expect(parseIstanbulDateTime("2026-09-16T15:30")).toBe(Date.parse("2026-09-16T12:30:00Z"));
  });

  it("uses Istanbul boundaries for date keys", () => {
    expect(dateKeyFromTimestamp(Date.parse("2026-09-15T22:30:00Z"))).toBe("2026-09-16");
  });

  it("prefills reminder inputs in Istanbul time across midnight", () => {
    expect(toIstanbulDateTimeInput(Date.parse("2026-09-30T21:45:12.345Z"))).toBe("2026-10-01T00:45");
  });

  it("adds exact 24-hour relative days", () => {
    expect(addRelativeDays(3, 1_000)).toBe(259_201_000);
  });
});

describe("calendar helpers", () => {
  it("builds a six-week Monday-first grid", () => {
    const days = buildCalendarDays("2026-09");
    expect(days).toHaveLength(42);
    expect(days[0].dateKey).toBe("2026-08-31");
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
