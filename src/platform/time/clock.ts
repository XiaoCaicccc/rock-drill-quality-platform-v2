export interface Clock { now(): Date; }

export const systemClock: Clock = Object.freeze({ now(): Date { return new Date(); } });
