import { checkAbort } from "../../contracts/result"

/** Cancel the waiter, not a shared download another caller is still using. */
export function waitFor<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  checkAbort(signal)
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener("abort", abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort))
  })
}

export class SharedCache<T> {
  private pending?: Promise<T>

  get(load: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    checkAbort(signal)
    if (!this.pending) {
      const pending = load().catch((error) => {
        if (this.pending === pending) this.pending = undefined
        throw error
      })
      this.pending = pending
    }
    return waitFor(this.pending, signal)
  }

  clear() {
    this.pending = undefined
  }
}
