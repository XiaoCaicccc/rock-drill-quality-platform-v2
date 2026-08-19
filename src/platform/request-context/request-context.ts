import { BUSINESS_TIME_ZONE, nowInstant } from "../time";
import type { BusinessTimeZone, Clock, Instant } from "../time";
import { anonymousActor, normalizeActor } from "./actor";
import type { Actor, AuthenticatedActor } from "./actor";
import { randomRequestId } from "./request-id";
import type { RequestId, RequestIdFactory } from "./request-id";

export interface RequestContext { readonly requestId: RequestId; readonly receivedAt: Instant; readonly businessTimeZone: BusinessTimeZone; readonly actor: Actor; }
export interface CreateRequestContextOptions { readonly actor?: Actor; readonly clock?: Clock; readonly requestIdFactory?: RequestIdFactory; }

export function createRequestContext(options: CreateRequestContextOptions = {}): RequestContext {
  const requestIdFactory = options.requestIdFactory ?? randomRequestId;
  const actor = normalizeActor(options.actor ?? anonymousActor);
  return Object.freeze({ requestId: requestIdFactory(), receivedAt: nowInstant(options.clock), businessTimeZone: BUSINESS_TIME_ZONE, actor });
}

export function withAuthenticatedActor(context: RequestContext, actor: AuthenticatedActor): RequestContext {
  return Object.freeze({ ...context, actor: normalizeActor(actor) });
}
