export function createCoalescedRefresh<T>(load: () => Promise<T>, apply: (value: T) => void) {
  let running: Promise<void> | null = null;
  let queued = false;
  return function refresh(): Promise<void> {
    if (running) {
      queued = true;
      return running;
    }
    running = (async () => {
      do {
        queued = false;
        apply(await load());
      } while (queued);
    })().finally(() => { running = null; });
    return running;
  };
}
