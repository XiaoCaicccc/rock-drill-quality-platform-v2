declare const businessDateBrand: unique symbol;
export type BusinessDate = string & { readonly [businessDateBrand]: "BusinessDate" };
const businessDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function hasValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isBusinessDate(value: string): value is BusinessDate {
  const match = businessDatePattern.exec(value);
  if (match === null) return false;
  const [, yearText, monthText, dayText] = match;
  return hasValidCalendarDate(Number(yearText), Number(monthText), Number(dayText));
}

export function parseBusinessDate(value: string): BusinessDate {
  if (!isBusinessDate(value)) throw new RangeError("BusinessDate must be a real calendar date in YYYY-MM-DD format.");
  return value;
}
