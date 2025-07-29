import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const screenshotTool = {
    name: 'screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
        type: 'object' as const,
        properties: {
            fullPage: {
                type: 'boolean',
                description: 'Capture the full scrollable page (true) or just the viewport (false)',
                default: false,
            },
        },
        required: [],
    },
    async handler(
        session: BrowserSession,
        args: { fullPage?: boolean }
    ): Promise<CallToolResult> {
        console.log(`Screenshot tool called, fullPage: ${args.fullPage}`);

        try {
            const page = await session.getPage();
            if (!session.hasPage()) {
                throw new Error('No page loaded. Use navigate tool first.');
            }
            
            // Get page dimensions for debugging
            const dimensions = await page.evaluate(() => {
                const doc = (globalThis as any).document;
                const win = (globalThis as any).window;
                return {
                    width: doc.documentElement.scrollWidth,
                    height: doc.documentElement.scrollHeight,
                    viewportWidth: win.innerWidth,
                    viewportHeight: win.innerHeight
                };
            });
            console.log(`Page dimensions: ${JSON.stringify(dimensions)}`);
            
            const screenshotOptions = {
                fullPage: args.fullPage === true,
                type: 'png' as const,
            };
            console.log(`Screenshot options: ${JSON.stringify(screenshotOptions)}`);
            
            const screenshot = await page.screenshot(screenshotOptions);

            const base64Image = screenshot.toString('base64');
            console.info(`Screenshot captured, size: ${base64Image.length} chars`);

            return {
                content: [
                    {
                        type: 'image' as const,
                        data: base64Image,
                        mimeType: 'image/png',
                    },
                    {
                        type: 'text' as const,
                        text: `Screenshot captured (${args.fullPage ? 'full page' : 'viewport'})`,
                    },
                ],
            };
        } catch (error) {
            console.error('Screenshot error:', error);
            throw error;
        }
    },
};
