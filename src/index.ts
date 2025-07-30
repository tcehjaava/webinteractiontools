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
import { screenshotTool } from './tools/screenshot.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Tool<T = unknown> {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties?: Record<string, unknown>;
        required?: string[];
    };
    handler: (session: BrowserSession, args: T) => Promise<CallToolResult>;
}

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

// Define tools array
const tools = [navigateTool, screenshotTool] as const;

// Register tools
server.setRequestHandler(
    ListToolsRequestSchema,
    async (): Promise<ListToolsResult> => ({
        tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema as {
                type: 'object';
                properties?: Record<string, unknown>;
                required?: string[];
            },
        })),
    })
);

server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
        console.log(`Received tool call: ${request.params.name}`);

        const tool = tools.find(t => t.name === request.params.name);
        if (!tool) {
            throw new Error(`Unknown tool: ${request.params.name}`);
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (tool as any).handler(
                browserSession,
                request.params.arguments || {}
            );
            console.info(`Tool call completed successfully`);
            return result;
        } catch (error) {
            console.error(`Tool call failed:`, error);
            throw error;
        }
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
