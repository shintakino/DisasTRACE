export class RequestTimeoutError extends Error {
  constructor(readonly operation: string, readonly timeoutMs: number) {
    const label = operation.charAt(0).toUpperCase() + operation.slice(1);
    super(`${label} timed out. Your draft was kept. Please check your connection and try again.`);
    this.name = 'RequestTimeoutError';
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new RequestTimeoutError(operation, timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  operation: string,
  fetchImpl: typeof fetch = fetch,
) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new RequestTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      fetchImpl(url, { ...init, signal: controller.signal }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof RequestTimeoutError) throw error;
    if (controller.signal.aborted) throw new RequestTimeoutError(operation, timeoutMs);
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
