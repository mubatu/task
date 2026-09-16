import { describe, expect, it } from "vitest";
import { HttpError } from "../functions/_shared/http";
import {
  normalizeDetails,
  normalizeProfileName,
  normalizeTitle,
  requireDate,
  requireItemStatus,
  validateItemInput,
} from "../functions/_shared/validation";

const userId = "123e4567-e89b-42d3-a456-426614174000";

describe("profile name normalization", () => {
  it("normalizes equivalent names to the same key", () => {
    expect(normalizeProfileName("  Batu   Kaya ")).toEqual({
      displayName: "Batu Kaya",
      nameKey: "batu kaya",
    });
    expect(normalizeProfileName("Jose\u0301").nameKey).toBe(normalizeProfileName("José").nameKey);
  });

  it("rejects blank, oversized, and control-character names", () => {
    expect(() => normalizeProfileName(" ")).toThrow(HttpError);
    expect(() => normalizeProfileName("a".repeat(41))).toThrow(HttpError);
    expect(() => normalizeProfileName("Batu\u0000")).toThrow(HttpError);
  });
});

describe("item validation", () => {
  it("accepts an undated task and strips reminder-only fields", () => {
    expect(validateItemInput({
      userId,
      type: "task",
      title: "  Prepare   the plan ",
      details: "  Keep it concise. ",
      remindAt: 9_999_999_999_999,
    })).toMatchObject({
      type: "task",
      title: "Prepare the plan",
      details: "Keep it concise.",
      taskDate: null,
      remindAt: null,
    });
  });

  it("accepts a future reminder", () => {
    expect(validateItemInput({
      userId,
      type: "reminder",
      title: "Call the team",
      remindAt: 2_000,
      taskDate: "2026-09-16",
    }, 1_000)).toMatchObject({
      type: "reminder",
      taskDate: null,
      remindAt: 2_000,
    });
  });

  it("rejects past reminders and invalid field values", () => {
    expect(() => validateItemInput({ userId, type: "reminder", title: "Late", remindAt: 999 }, 1_000)).toThrow(HttpError);
    expect(() => normalizeTitle(" ")).toThrow(HttpError);
    expect(() => normalizeDetails("a".repeat(1001))).toThrow(HttpError);
    expect(() => requireDate("2026-02-30")).toThrow(HttpError);
    expect(() => requireItemStatus("deleted")).toThrow(HttpError);
  });
});
