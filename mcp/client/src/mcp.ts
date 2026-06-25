// Thin wrapper over the official MCP TypeScript SDK (Streamable HTTP transport).
// Connects to the QGIS-MCP container (:8100/mcp), lists tools, and drives recipes.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export interface ToolResult {
  raw: unknown
  text: string
  /** parsed JSON from the tool's text/structured content, when available */
  data: Record<string, unknown> | null
}

function parseToolResult(res: any): ToolResult {
  // Newer SDKs surface structuredContent; otherwise the result is a content[] array.
  if (res?.structuredContent && typeof res.structuredContent === 'object') {
    return { raw: res, text: JSON.stringify(res.structuredContent), data: res.structuredContent }
  }
  const blocks = Array.isArray(res?.content) ? res.content : []
  const text = blocks
    .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
    .map((b: any) => b.text)
    .join('\n')
  let data: Record<string, unknown> | null = null
  try {
    const t = text.trim()
    if (t.startsWith('{') || t.startsWith('[')) data = JSON.parse(t)
  } catch {
    /* leave data null — caller falls back to text */
  }
  return { raw: res, text, data }
}

export class TtcMcpClient {
  private client: Client
  private transport?: StreamableHTTPClientTransport

  constructor(private url: string = process.env.MCP_URL ?? 'http://localhost:8100/mcp') {
    this.client = new Client(
      { name: 'ttc-mcp-client', version: '0.1.0' },
      { capabilities: {} },
    )
  }

  async connect(): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(new URL(this.url))
    await this.client.connect(this.transport)
  }

  async listTools(): Promise<string[]> {
    const res = await this.client.listTools()
    return res.tools.map((t) => t.name)
  }

  /** Call run_recipe(id, ...args) — executes every recipe step in one shot. */
  async runRecipe(id: string, args: Record<string, unknown>): Promise<ToolResult> {
    const res = await this.client.callTool({
      name: 'run_recipe',
      arguments: { id, ...args },
    })
    return parseToolResult(res)
  }

  /** Generic escape hatch for any of the 40 QGIS-MCP tools. */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const res = await this.client.callTool({ name, arguments: args })
    return parseToolResult(res)
  }

  async close(): Promise<void> {
    await this.client.close()
  }
}
