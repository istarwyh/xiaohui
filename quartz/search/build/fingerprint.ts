import { createHash } from "node:crypto"

export function contentFingerprint(title: string, markdown: string, text: string): string {
  return createHash("sha256").update(`${title}\n${markdown}\n${text}`, "utf8").digest("hex")
}
