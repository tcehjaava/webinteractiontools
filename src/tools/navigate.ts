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
            timeout: {
                type: 'number',
                description:
                    'Navigation timeout in milliseconds (default: 30000ms)',
                minimum: 1000,
                maximum: 120000,
                default: 30000,
            },
            waitForSelector: {
                type: 'string',
                description:
                    'Optional CSS selector to wait for before considering navigation complete',
            },
            waitUntil: {
                type: 'string',
                description:
                    'When to consider navigation succeeded (default: "domcontentloaded")',
                enum: ['load', 'domcontentloaded', 'networkidle'],
                default: 'domcontentloaded',
            },
        },
        required: ['url'],
    },
    async handler(
        session: BrowserSession,
        args: {
            url: string;
            timeout?: number;
            waitForSelector?: string;
            waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
        }
    ): Promise<CallToolResult> {
        console.log(`Navigate tool called with URL: ${args.url}`);

        try {
            const page = await session.getPage();
            console.log('Page obtained');

            const timeout = args.timeout ?? 30000;
            const waitUntil = args.waitUntil ?? 'domcontentloaded';

            console.log(
                `Navigating with timeout: ${timeout}ms, waitUntil: ${waitUntil}`
            );

            await page.goto(args.url, {
                waitUntil: waitUntil as
                    | 'load'
                    | 'domcontentloaded'
                    | 'networkidle'
                    | 'commit',
                timeout: timeout,
            });
            console.info('Navigation completed');

            // Wait for specific selector if provided
            if (args.waitForSelector) {
                console.log(`Waiting for selector: ${args.waitForSelector}`);
                try {
                    await page.waitForSelector(args.waitForSelector, {
                        timeout: Math.min(timeout / 2, 10000), // Use half the timeout or 10s max
                    });
                    console.log('Selector found');
                } catch {
                    console.warn(
                        `Warning: Selector "${args.waitForSelector}" not found, continuing...`
                    );
                }
            }

            // Always wait a bit for dynamic content to stabilize
            await page.waitForTimeout(2000);
            console.log('Additional stabilization wait completed');

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
