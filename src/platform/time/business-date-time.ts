import { parseInstant } from "./instant";
import type { Instant } from "./instant";
import { BUSINESS_TIME_ZONE } from "./time-zone";

const businessDateTimeInputPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function businessDateTimeInputToInstant(value: string): Instant {
  const match = businessDateTimeInputPattern.exec(value);
  if (match === null) throw new RangeError("Business date-time input must use YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss.");
  const seconds = match[6] ?? "00";
  return parseInstant(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${seconds}+08:00`);
}

export function formatInstantForBusinessDisplay(value: Instant | string | Date): string {
  const instant = value instanceof Date ? value : new Date(parseInstant(value));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")} ${values.get("hour")}:${values.get("minute")}:${values.get("second")}`;
}
