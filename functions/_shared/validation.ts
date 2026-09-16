import type { ItemStatus, ItemType } from "../../shared/contracts";
import { HttpError } from "./http";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISALLOWED_TEXT_CHARACTERS = /[\p{Cc}\p{Cf}]/u;
const DISALLOWED_MULTILINE_CHARACTERS =
  /[\p{Cf}\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;

export interface NormalizedName {
  displayName: string;
  nameKey: string;
}

export interface ValidatedItemInput {
  userId: string;
  type: ItemType;
  title: string;
  details: string;
  taskDate: string | null;
  remindAt: number | null;
}

export function normalizeProfileName(input: unknown): NormalizedName {
  if (typeof input !== "string") throw new HttpError(400, "Name must be text.");

  const displayName = input.normalize("NFC").trim().replace(/\s+/gu, " ");
  const length = Array.from(displayName).length;
  if (length < 1 || length > 40 || DISALLOWED_TEXT_CHARACTERS.test(displayName)) {
    throw new HttpError(400, "Name must contain between 1 and 40 visible characters.");
  }

  return {
    displayName,
    nameKey: displayName.normalize("NFKC").toLowerCase(),
  };
}

export function requireUserId(input: unknown): string {
  if (typeof input !== "string" || !UUID_PATTERN.test(input)) {
    throw new HttpError(400, "A valid user ID is required.");
  }
  return input;
}

export function requireItemId(input: unknown): string {
  if (typeof input !== "string" || !UUID_PATTERN.test(input)) {
    throw new HttpError(400, "A valid item ID is required.");
  }
  return input;
}

export function requireItemStatus(input: unknown): ItemStatus {
  if (input !== "active" && input !== "completed") {
    throw new HttpError(400, "Status must be active or completed.");
  }
  return input;
}

export function normalizeTitle(input: unknown): string {
  if (typeof input !== "string") throw new HttpError(400, "Title must be text.");
  const title = input.normalize("NFC").trim().replace(/\s+/gu, " ");
  const length = Array.from(title).length;
  if (length < 1 || length > 120 || DISALLOWED_TEXT_CHARACTERS.test(title)) {
    throw new HttpError(400, "Title must contain between 1 and 120 visible characters.");
  }
  return title;
}

export function normalizeDetails(input: unknown): string {
  if (input === undefined || input === null) return "";
  if (typeof input !== "string") throw new HttpError(400, "Details must be text.");
  const details = input.normalize("NFC").replace(/\r\n?/g, "\n").trim();
  if (Array.from(details).length > 1000 || DISALLOWED_MULTILINE_CHARACTERS.test(details)) {
    throw new HttpError(400, "Details must contain at most 1000 visible characters.");
  }
  return details;
}

export function requireDate(input: unknown): string {
  if (typeof input !== "string") throw new HttpError(400, "Date must use YYYY-MM-DD format.");
  const match = DATE_PATTERN.exec(input);
  if (!match) throw new HttpError(400, "Date must use YYYY-MM-DD format.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1000 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError(400, "Date must be a valid calendar date.");
  }
  return input;
}

export function validateItemInput(input: Record<string, unknown>, nowMs = Date.now()): ValidatedItemInput {
  const userId = requireUserId(input.userId);
  const title = normalizeTitle(input.title);
  const details = normalizeDetails(input.details);
  const type = input.type;
  if (type !== "task" && type !== "reminder") {
    throw new HttpError(400, "Type must be task or reminder.");
  }

  if (type === "task") {
    return {
      userId,
      type,
      title,
      details,
      taskDate: input.taskDate ? requireDate(input.taskDate) : null,
      remindAt: null,
    };
  }

  if (typeof input.remindAt !== "number" || !Number.isSafeInteger(input.remindAt)) {
    throw new HttpError(400, "Reminder time must be a valid timestamp.");
  }
  if (input.remindAt <= nowMs) {
    throw new HttpError(400, "Reminder time must be in the future.");
  }

  return {
    userId,
    type,
    title,
    details,
    taskDate: null,
    remindAt: input.remindAt,
  };
}
