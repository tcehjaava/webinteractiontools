import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const screenshotTool = {
    name: 'screenshot',
    description: 'Take a screenshot of the current page viewport',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
    async handler(session: BrowserSession, _args: {}): Promise<CallToolResult> {
        console.log('Screenshot tool called');

        try {
            const page = await session.getPage();
            if (!session.hasPage()) {
                throw new Error('No page loaded. Use navigate tool first.');
            }

            const url = page.url();
            const title = await page.title();
            const viewport = page.viewportSize() || { width: 0, height: 0 };

            const pageInfo = await page.evaluate(() => {
                const body = document.body;
                const html = document.documentElement;

                const scrollHeight = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                );

                const scrollTop =
                    window.pageYOffset || html.scrollTop || body.scrollTop || 0;
                const viewportHeight = window.innerHeight || html.clientHeight;

                return {
                    totalHeight: scrollHeight,
                    scrollTop: scrollTop,
                    viewportHeight: viewportHeight,
                };
            });

            const screenshotOptions = {
                type: 'png' as const,
            };
            console.log(
                `Screenshot options: ${JSON.stringify(screenshotOptions)}`
            );

            const screenshot = await page.screenshot(screenshotOptions);

            const base64Image = screenshot.toString('base64');
            console.info(
                `Screenshot captured, size: ${base64Image.length} chars`
            );

            const scrollPercentage =
                pageInfo.totalHeight > 0
                    ? Math.round(
                          (pageInfo.scrollTop / pageInfo.totalHeight) * 100
                      )
                    : 0;

            const visibleTop = pageInfo.scrollTop;
            const visibleBottom = pageInfo.scrollTop + pageInfo.viewportHeight;
            const pagePercentageVisible =
                pageInfo.totalHeight > 0
                    ? Math.round(
                          (pageInfo.viewportHeight / pageInfo.totalHeight) * 100
                      )
                    : 100;

            return {
                content: [
                    {
                        type: 'image' as const,
                        data: base64Image,
                        mimeType: 'image/png',
                    },
                    {
                        type: 'text' as const,
                        text: `Viewport metadata:
  URL: ${url}
  Title: ${title}
  Viewport: ${viewport.width}x${viewport.height}px
  Scroll: ${pageInfo.scrollTop}px of ${pageInfo.totalHeight}px (${scrollPercentage}% down)
  Showing: ${visibleTop}-${visibleBottom}px (${pagePercentageVisible}% of total page)`,
                    },
                ],
            };
        } catch (error) {
            console.error('Screenshot error:', error);
            throw error;
        }
    },
};
