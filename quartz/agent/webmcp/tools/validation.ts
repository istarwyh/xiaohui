import { AgentError } from "../../contracts/result"

export function parameters(input: unknown, allowed: string[]): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.includes(key))
  ) {
    throw new AgentError("INVALID_INPUT", "参数必须是只包含已声明字段的对象。")
  }
  return input as Record<string, unknown>
}

export function text(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || Array.from(value.trim()).length > max) {
    throw new AgentError("INVALID_INPUT", `${name} 必须是 1–${max} 字符的字符串。`)
  }
  return value.trim()
}

export function integer(value: unknown, name: string, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new AgentError("INVALID_INPUT", `${name} 必须是 ${min}–${max} 的整数。`)
  }
  return value
}
