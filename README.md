# WebSight - MCP Web Browsing Tool

WebSight is a Model Context Protocol (MCP) server that provides web browsing capabilities to AI agents using Playwright.

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd websight

# Install dependencies
npm install

# Build the project
npm run build
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start the production server
npm start
```

## Using WebSight with Claude Desktop

To use this MCP server with Claude Desktop, add it to your Claude Desktop configuration:

1. Open Claude Desktop settings
2. Go to Developer > Edit Config
3. Add the following to your `mcpServers` configuration:

```json
{
  "mcpServers": {
    "websight": {
      "command": "node",
      "args": ["/path/to/websight/dist/index.js"]
    }
  }
}
```

Replace `/path/to/websight` with the actual path to your websight project directory.

## Using WebSight with Other MCP Clients

WebSight can be used with any MCP-compatible client. The server communicates via stdio transport.

```bash
# Start the server directly
node dist/index.js
```

## Available Tools

### navigate
Navigate to a URL and retrieve page information.

**Parameters:**
- `url` (string, required): The URL to navigate to

**Example:**
```json
{
  "tool": "navigate",
  "arguments": {
    "url": "https://example.com"
  }
}
```

## Testing the Server

You can test the server using the MCP inspector or by creating a simple test script:

```javascript
// test-websight.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testWebSight() {
  const serverProcess = spawn('node', ['dist/index.js']);
  const transport = new StdioClientTransport({
    child: serverProcess,
  });
  
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });
  
  await client.connect(transport);
  
  // List available tools
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  
  // Use the navigate tool
  const result = await client.callTool('navigate', {
    url: 'https://example.com'
  });
  console.log('Navigation result:', result);
  
  await client.close();
}

testWebSight().catch(console.error);
```

## Architecture

- **MCP Server**: Handles communication with MCP clients
- **Browser Session**: Manages Playwright browser instances
- **Tools**: Implements specific web automation capabilities

## Requirements

- Node.js 18 or higher
- npm or yarn

## License

MIT