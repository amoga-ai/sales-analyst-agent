// lib/api/timeout.ts: Rejects a promise that takes longer than `ms`. If it finishes after the timeout, `onLate` gets the value so it can be cleaned up.
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

// Fetch with a time limit on getting the response headers only. Once the headers arrive the timer stops, so a long streamed body is not cut off.
export async function fetchWithConnectTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeoutError(`Request to ${new URL(url).host}`, ms)), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string, onLate?: (value: T) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new TimeoutError(label, ms));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        if (timedOut) onLate?.(value);
        else resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        if (!timedOut) reject(error);
      },
    );
  });
}
