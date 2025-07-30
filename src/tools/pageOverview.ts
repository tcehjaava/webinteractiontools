import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { processScreenshot } from '../utils/image.js';
import { getPageMetadata, extractPageText } from '../utils/page.js';

export const pageOverviewTool = {
    name: 'page_overview',
    description:
        'Get a comprehensive overview of the current page including screenshots, metadata, and content analysis',
    inputSchema: {
        type: 'object' as const,
        properties: {
            includeText: {
                type: 'boolean',
                description: 'Include extracted text content from the page',
                default: true,
            },
            includeMetadata: {
                type: 'boolean',
                description: 'Include page metadata (title, URL, dimensions)',
                default: true,
            },
            maxTextLength: {
                type: 'number',
                description:
                    'Maximum length of extracted text (0 for no limit)',
                default: 10000,
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
        args: {
            includeText?: boolean;
            includeMetadata?: boolean;
            maxTextLength?: number;
            provider?: string;
        }
    ): Promise<CallToolResult> {
        console.log('Page overview tool called');

        try {
            const page = await session.getPage();
            if (!session.hasPage()) {
                throw new Error('No page loaded. Use navigate tool first.');
            }

            const {
                includeText = true,
                includeMetadata = true,
                maxTextLength = 10000,
            } = args;
            const content: any[] = [];

            // Collect page metadata
            let pageData: any = {};
            if (includeMetadata) {
                pageData = await getPageMetadata(page);
            }

            // Take full page screenshot
            console.log('Capturing full page screenshot...');
            const screenshot = await page.screenshot({
                fullPage: true,
                type: 'png' as const,
            });

            // Process screenshot with provider-specific sizing
            const {
                processedImage,
                originalDimensions,
                wasResized,
                providerConfig,
            } = await processScreenshot(screenshot, args.provider);

            const base64Image = processedImage.toString('base64');
            content.push({
                type: 'image' as const,
                data: base64Image,
                mimeType: 'image/png',
            });

            // Build overview text
            let overviewText = '# Page Overview\n\n';

            if (includeMetadata && pageData) {
                overviewText += '## Metadata\n';
                overviewText += `- **Title:** ${pageData.title || 'N/A'}\n`;
                overviewText += `- **URL:** ${pageData.url}\n`;
                overviewText += `- **Page Dimensions:** ${pageData.dimensions.scrollWidth}x${pageData.dimensions.scrollHeight}px\n`;
                overviewText += `- **Viewport:** ${pageData.dimensions.viewportWidth}x${pageData.dimensions.viewportHeight}px\n`;

                if (pageData.meta.description) {
                    overviewText += `- **Description:** ${pageData.meta.description}\n`;
                }
                if (pageData.meta.author) {
                    overviewText += `- **Author:** ${pageData.meta.author}\n`;
                }
                overviewText += '\n';
            }

            // Extract text content if requested
            if (includeText) {
                const extractedText = await extractPageText(
                    page,
                    maxTextLength
                );
                overviewText += '## Page Content (Text)\n\n';
                overviewText += extractedText + '\n\n';
            }

            overviewText += `## Screenshot Information\n`;
            overviewText += `- Full page screenshot captured\n`;
            overviewText += `- Provider: ${providerConfig.name} (max dimension: ${providerConfig.maxImageDimension}px)\n`;
            if (
                wasResized &&
                originalDimensions.width &&
                originalDimensions.height
            ) {
                overviewText += `- Image resized from ${originalDimensions.width}x${originalDimensions.height} to fit API limits\n`;
            }

            content.push({
                type: 'text' as const,
                text: overviewText,
            });

            return { content };
        } catch (error) {
            console.error('Page overview error:', error);
            throw error;
        }
    },
};
