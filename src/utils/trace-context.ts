import { AsyncLocalStorage } from 'async_hooks';

export const traceStorage = new AsyncLocalStorage<{ traceId: string }>();

export function getTraceId(): string | undefined {
  return traceStorage.getStore()?.traceId;
}
