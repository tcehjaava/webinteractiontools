import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const navigateTool = {
    name: 'navigate',
    description: 'Navigate to a URL',
    inputSchema: {
        type: 'object' as const,
        properties: {
            url: {
                type: 'string',
                description: 'The URL to navigate to',
            },
        },
        required: ['url'],
    },
    async handler(
        session: BrowserSession,
        args: { url: string }
    ): Promise<CallToolResult> {
        console.error(`Navigate tool called with URL: ${args.url}`);

        try {
            const page = await session.getPage();
            console.error('Page obtained');

            await page.goto(args.url, {
                waitUntil: 'domcontentloaded',
                timeout: 10000, // 10 second timeout
            });
            console.error('Navigation completed');

            const title = await page.title();
            const currentUrl = page.url();

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Navigated to ${currentUrl}\nPage title: ${title}`,
                    },
                ],
            };
        } catch (error) {
            console.error('Navigation error:', error);
            throw error;
        }
    },
};
