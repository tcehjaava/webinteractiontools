import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListToolsResult,
    CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { BrowserSession } from './lib/browser.js';
import { navigateTool } from './tools/navigate.js';

// Create browser session
const browserSession = new BrowserSession();

// Initialize server
const server = new Server(
    {
        name: 'websight',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Register tools
server.setRequestHandler(
    ListToolsRequestSchema,
    async (): Promise<ListToolsResult> => ({
        tools: [
            {
                name: navigateTool.name,
                description: navigateTool.description,
                inputSchema: navigateTool.inputSchema,
            },
        ],
    })
);

server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
        console.error(`Received tool call: ${request.params.name}`);
        if (request.params.name === 'navigate') {
            try {
                const result = await navigateTool.handler(
                    browserSession,
                    request.params.arguments as { url: string }
                );
                console.error(`Tool call completed successfully`);
                return result;
            } catch (error) {
                console.error(`Tool call failed:`, error);
                throw error;
            }
        }
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
);

// Handle cleanup
process.on('SIGINT', async () => {
    await browserSession.close();
    process.exit(0);
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
