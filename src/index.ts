#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListToolsResult,
    CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { BrowserSession } from './lib/browser.js';
import { navigateTool, goBackTool } from './tools/navigate.js';
import { screenshotTool } from './tools/screenshot.js';
import {
    scrollToPositionTool,
    scrollDirectionTool,
    scrollToTextTool,
} from './tools/scroll.js';
import {
    clickTextTool,
    clickPositionTool,
    clickSelectorTool,
} from './tools/click.js';
import {
    hoverTextTool,
    hoverPositionTool,
    hoverSelectorTool,
} from './tools/hover.js';
import { getElementsTool } from './tools/getElements.js';
import { extractHTMLTool } from './tools/extractHTML.js';
import { fillTextTool, fillSelectorTool, fillFormTool } from './tools/fill.js';

interface Tool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
    handler: (
        session: BrowserSession,
        args: Record<string, unknown>
    ) => Promise<CallToolResult>;
}

const browserSession = new BrowserSession();

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

const tools = [
    navigateTool,
    goBackTool,
    screenshotTool,
    scrollToPositionTool,
    scrollDirectionTool,
    scrollToTextTool,
    clickTextTool,
    clickPositionTool,
    clickSelectorTool,
    hoverTextTool,
    hoverPositionTool,
    hoverSelectorTool,
    getElementsTool,
    extractHTMLTool,
    fillTextTool,
    fillSelectorTool,
    fillFormTool,
] as const;

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
            const result = await (tool as Tool).handler(
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

process.on('SIGINT', async () => {
    await browserSession.close();
    process.exit(0);
});

const transport = new StdioServerTransport();
server.connect(transport);
