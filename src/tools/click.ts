import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const DEFAULT_WAIT_AFTER_CLICK = 1000;
const DEFAULT_OCCURRENCE = 1;
const TEXT_TRUNCATE_LENGTH = 50;

const logger = new Logger('click');

export const clickTextTool = {
    name: 'clickText',
    description: 'Click on an element containing specific text',
    inputSchema: {
        type: 'object' as const,
        properties: {
            text: {
                type: 'string',
                description: 'Text to find and click',
            },
            occurrence: {
                type: 'number',
                description:
                    'Which occurrence to click if multiple matches (1-based)',
                default: DEFAULT_OCCURRENCE,
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after click',
                default: DEFAULT_WAIT_AFTER_CLICK,
            },
        },
        required: ['text'],
    },
    async handler(
        session: BrowserSession,
        args: {
            text: string;
            occurrence?: number;
            waitAfter?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('ClickText called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const occurrence = args.occurrence ?? 1;
            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_CLICK;

            const clicked = await page.evaluate(
                ({ text, occurrence }) => {
                    let matchCount = 0;
                    const elements = Array.from(
                        document.querySelectorAll('*')
                    );

                    for (const element of elements) {
                        if (
                            element.textContent &&
                            element.textContent.includes(text as string)
                        ) {
                            matchCount++;
                            if (matchCount === occurrence) {
                                (element as HTMLElement).click();
                                return {
                                    clicked: true,
                                    totalMatches: matchCount,
                                    tagName: element.tagName,
                                    className: element.className,
                                };
                            }
                        }
                    }

                    // Count remaining matches
                    for (
                        let i = elements.indexOf(elements[matchCount]);
                        i < elements.length;
                        i++
                    ) {
                        const el = elements[i];
                        if (
                            el?.textContent &&
                            el.textContent.includes(text as string)
                        ) {
                            matchCount++;
                        }
                    }

                    return {
                        clicked: false,
                        totalMatches: matchCount,
                        tagName: null,
                        className: null,
                    };
                },
                { text: args.text, occurrence }
            );

            if (!clicked.clicked) {
                if (clicked.totalMatches === 0) {
                    throw new Error(
                        `No element found containing text: "${args.text}"`
                    );
                } else {
                    throw new Error(
                        `Element occurrence ${occurrence} not found. Only ${clicked.totalMatches} matches found for text: "${args.text}"`
                    );
                }
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Click completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Clicked element containing: "${args.text}" (occurrence ${occurrence} of ${clicked.totalMatches})\nElement: <${clicked.tagName}${clicked.className ? ` class="${clicked.className}"` : ''}>`,
                    },
                ],
            };
        } catch (error) {
            logger.error('ClickText failed', error);
            throw error;
        }
    },
};

export const clickPositionTool = {
    name: 'clickPosition',
    description: 'Click at specific coordinates on the page',
    inputSchema: {
        type: 'object' as const,
        properties: {
            x: {
                type: 'number',
                description: 'X coordinate to click',
            },
            y: {
                type: 'number',
                description: 'Y coordinate to click',
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after click',
                default: DEFAULT_WAIT_AFTER_CLICK,
            },
        },
        required: ['x', 'y'],
    },
    async handler(
        session: BrowserSession,
        args: {
            x: number;
            y: number;
            waitAfter?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('ClickPosition called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_CLICK;

            // Click at the specified coordinates
            await page.mouse.click(args.x, args.y);

            // Get element information at click position
            const elementInfo = await page.evaluate(
                ({ x, y }) => {
                    const element = document.elementFromPoint(x, y);
                    if (element) {
                        return {
                            tagName: element.tagName,
                            className: element.className,
                            id: element.id,
                            text: element.textContent?.substring(0, TEXT_TRUNCATE_LENGTH),
                        };
                    }
                    return null;
                },
                { x: args.x, y: args.y }
            );

            await page.waitForTimeout(waitAfter);
            logger.info('Click completed');

            let resultText = `Clicked at coordinates (${args.x}, ${args.y})`;
            if (elementInfo) {
                resultText += `\nElement: <${elementInfo.tagName}`;
                if (elementInfo.id) resultText += ` id="${elementInfo.id}"`;
                if (elementInfo.className)
                    resultText += ` class="${elementInfo.className}"`;
                resultText += '>';
                if (elementInfo.text) {
                    resultText += `\nText: "${elementInfo.text}${elementInfo.text.length >= 50 ? '...' : ''}"`;
                }
            }

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText,
                    },
                ],
            };
        } catch (error) {
            logger.error('ClickPosition failed', error);
            throw error;
        }
    },
};

export const clickSelectorTool = {
    name: 'clickSelector',
    description: 'Click element matching CSS selector',
    inputSchema: {
        type: 'object' as const,
        properties: {
            selector: {
                type: 'string',
                description: 'CSS selector of element to click',
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after click',
                default: DEFAULT_WAIT_AFTER_CLICK,
            },
        },
        required: ['selector'],
    },
    async handler(
        session: BrowserSession,
        args: {
            selector: string;
            waitAfter?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('ClickSelector called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_CLICK;

            const elementInfo = await page.evaluate(
                ({ selector }) => {
                    const element = document.querySelector(selector) as HTMLElement;
                    if (element) {
                        element.click();
                        return {
                            found: true,
                            tagName: element.tagName,
                            className: element.className,
                            id: element.id,
                            text: element.textContent?.substring(0, TEXT_TRUNCATE_LENGTH),
                        };
                    }
                    return { found: false };
                },
                { selector: args.selector }
            );

            if (!elementInfo.found) {
                throw new Error(
                    `No element found matching selector: "${args.selector}"`
                );
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Click completed');

            let resultText = `Clicked element matching selector: "${args.selector}"`;
            resultText += `\nElement: <${elementInfo.tagName}`;
            if (elementInfo.id) resultText += ` id="${elementInfo.id}"`;
            if (elementInfo.className)
                resultText += ` class="${elementInfo.className}"`;
            resultText += '>';
            if (elementInfo.text) {
                resultText += `\nText: "${elementInfo.text}${elementInfo.text.length >= 50 ? '...' : ''}"`;
            }

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText,
                    },
                ],
            };
        } catch (error) {
            logger.error('ClickSelector failed', error);
            throw error;
        }
    },
};
