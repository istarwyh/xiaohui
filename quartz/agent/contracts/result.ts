export class AgentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
  ) {
    super(message)
    this.name = "AgentError"
  }
}

export function checkAbort(signal?: AbortSignal) {
  signal?.throwIfAborted()
}

export async function result<T>(
  run: () => Promise<{ data: T; revision: string }>,
  signal?: AbortSignal,
) {
  try {
    checkAbort(signal)
    const value = await run()
    checkAbort(signal)
    return { ok: true as const, ...value }
  } catch (error) {
    checkAbort(signal)
    if (error instanceof Error && error.name === "AbortError") throw error
    const failure =
      error instanceof AgentError
        ? error
        : new AgentError("FETCH_FAILED", "内容暂时不可用，请稍后重试。", true)
    return {
      ok: false as const,
      error: { code: failure.code, message: failure.message, retryable: failure.retryable },
    }
  }
}
