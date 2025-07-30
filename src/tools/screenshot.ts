import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { processScreenshot } from '../utils/image.js';
import { getPageDimensions } from '../utils/page.js';

export const screenshotTool = {
    name: 'screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
        type: 'object' as const,
        properties: {
            fullPage: {
                type: 'boolean',
                description:
                    'Capture the full scrollable page (true) or just the viewport (false)',
                default: false,
            },
            provider: {
                type: 'string',
                description:
                    'AI provider to optimize image sizing for (claude, gemini, openai, etc.). Defaults to 2000x2000px if not specified.',
            },
        },
        required: [],
    },
    async handler(
        session: BrowserSession,
        args: { fullPage?: boolean; provider?: string }
    ): Promise<CallToolResult> {
        console.log(`Screenshot tool called, fullPage: ${args.fullPage}`);

        try {
            const page = await session.getPage();
            if (!session.hasPage()) {
                throw new Error('No page loaded. Use navigate tool first.');
            }

            // Get page dimensions for debugging
            await getPageDimensions(page);

            const screenshotOptions = {
                fullPage: args.fullPage === true,
                type: 'png' as const,
            };
            console.log(
                `Screenshot options: ${JSON.stringify(screenshotOptions)}`
            );

            const screenshot = await page.screenshot(screenshotOptions);

            // Process screenshot with provider-specific sizing
            const { processedImage, wasResized, providerConfig } =
                await processScreenshot(screenshot, args.provider);

            const base64Image = processedImage.toString('base64');
            console.info(
                `Screenshot captured, size: ${base64Image.length} chars`
            );

            return {
                content: [
                    {
                        type: 'image' as const,
                        data: base64Image,
                        mimeType: 'image/png',
                    },
                    {
                        type: 'text' as const,
                        text: `Screenshot captured (${args.fullPage ? 'full page' : 'viewport'})${wasResized ? ` - Resized to fit ${providerConfig.name} API limits (${providerConfig.maxImageDimension}x${providerConfig.maxImageDimension}px)` : ''}`,
                    },
                ],
            };
        } catch (error) {
            console.error('Screenshot error:', error);
            throw error;
        }
    },
};
