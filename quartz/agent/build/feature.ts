/** Public read-only tools are enabled by default; explicit opt-out remains available. */
export function webMCPEnabled(value: string | undefined): boolean {
  return value === undefined || value === "1"
}
