import type {} from "webmcp-types"

export async function registerTools(
  context: Pick<WebMCP.ModelContext, "registerTool">,
  tools: WebMCP.ModelContextTool[],
) {
  const controller = new AbortController()
  try {
    for (const tool of tools) {
      await context.registerTool(tool, { signal: controller.signal })
    }
    return () => controller.abort()
  } catch (error) {
    controller.abort()
    throw error
  }
}
