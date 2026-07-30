import { parseBusinessDate } from "./business-date";
import type { BusinessDate } from "./business-date";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { BUSINESS_TIME_ZONE } from "./time-zone";
import type { BusinessTimeZone } from "./time-zone";

declare const instantBrand: unique symbol;
export type Instant = string & { readonly [instantBrand]: "Instant" };

function toValidDate(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Instant must be a valid date or date-time string.");
  return date;
}

export function formatInstant(value: Date): Instant { return toValidDate(value).toISOString() as Instant; }
export function parseInstant(value: Date | string): Instant { return formatInstant(toValidDate(value)); }

export function businessDateFromInstant(instant: Instant | Date | string, timeZone: BusinessTimeZone = BUSINESS_TIME_ZONE): BusinessDate {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(toValidDate(instant));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  if (year === undefined || month === undefined || day === undefined) throw new Error("Business date formatting did not return calendar parts.");
  return parseBusinessDate(`${year}-${month}-${day}`);
}

export function nowInstant(clock: Clock = systemClock): Instant { return formatInstant(clock.now()); }
