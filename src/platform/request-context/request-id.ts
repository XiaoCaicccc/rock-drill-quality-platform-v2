declare const requestIdBrand: unique symbol;
export type RequestId = string & { readonly [requestIdBrand]: "RequestId" };
export type RequestIdFactory = () => RequestId;

export function createRequestId(value: string = crypto.randomUUID()): RequestId {
  if (value.trim().length === 0) throw new RangeError("RequestId must not be empty.");
  return value as RequestId;
}

export const randomRequestId: RequestIdFactory = (): RequestId => createRequestId();
