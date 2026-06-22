import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { config } from '../../config.js';

export async function generate(prompt) {
  if (!config.mcpServerUrl) {
    throw new Error('MCP_SERVER_URL is not configured');
  }

  const transport = new SSEClientTransport(new URL(config.mcpServerUrl));
  const client = new Client(
    { name: 'hooksmith-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    const response = await client.callTool({
      name: config.mcpToolName,
      arguments: { prompt }
    });

    const text = response.content
      ?.filter((item) => item.type === 'text')
      ?.map((item) => item.text)
      ?.join('')
      ?.trim();

    if (!text) {
      throw new Error(`MCP tool "${config.mcpToolName}" returned empty content`);
    }

    return {
      content: text,
      model: `mcp:${config.mcpToolName}`
    };
  } finally {
    await client.close();
  }
}
