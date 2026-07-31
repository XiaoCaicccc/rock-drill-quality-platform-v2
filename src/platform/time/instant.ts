import { parseBusinessDate } from "./business-date";
import type { BusinessDate } from "./business-date";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { BUSINESS_TIME_ZONE } from "./time-zone";
import type { BusinessTimeZone } from "./time-zone";

declare const instantBrand: unique symbol;
export type Instant = string & { readonly [instantBrand]: "Instant" };
const rfc3339Pattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

function toValidDate(value: Date): Date {
  const date = new Date(value.getTime());
  if (Number.isNaN(date.getTime())) throw new RangeError("Instant must be a valid date or date-time string.");
  return date;
}

function parseRfc3339Instant(value: string): Date {
  const match = rfc3339Pattern.exec(value);
  if (match === null) throw new RangeError("Instant must be a complete RFC3339 date-time with an offset.");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offset] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const monthDays = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const offsetIsValid = offset === "Z" || (Number(offset.slice(1, 3)) <= 23 && Number(offset.slice(4, 6)) <= 59);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthDays[month - 1] || hour > 23 || minute > 59 || second > 59 || !offsetIsValid) {
    throw new RangeError("Instant must contain real RFC3339 calendar and time components.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Instant must be a valid date-time string.");
  return date;
}

export function formatInstant(value: Date): Instant { return toValidDate(value).toISOString() as Instant; }
export function parseInstant(value: Date | string): Instant { return formatInstant(value instanceof Date ? toValidDate(value) : parseRfc3339Instant(value)); }

export function businessDateFromInstant(instant: Instant | Date, timeZone: BusinessTimeZone = BUSINESS_TIME_ZONE): BusinessDate {
  const date = instant instanceof Date ? toValidDate(instant) : parseRfc3339Instant(instant);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  if (year === undefined || month === undefined || day === undefined) throw new Error("Business date formatting did not return calendar parts.");
  return parseBusinessDate(`${year}-${month}-${day}`);
}

export function nowInstant(clock: Clock = systemClock): Instant { return formatInstant(clock.now()); }
