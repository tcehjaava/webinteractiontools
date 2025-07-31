import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const SCROLL_WAIT_TIME = {
    SMOOTH: 500,
    INSTANT: 100,
} as const;

const DEFAULT_SMOOTH = true;
const DEFAULT_SCROLL_AMOUNT = 500;

const logger = new Logger('scroll');

function formatScrollPercentage(scrollY: number, totalHeight: number, viewportHeight: number): string {
    const scrollableHeight = totalHeight - viewportHeight;
    if (scrollableHeight <= 0) return 'Y=0 (0% of page)';
    const percentage = Math.round((scrollY / scrollableHeight) * 100);
    return `Y=${scrollY} (${percentage}% of page)`;
}

export const scrollToPositionTool = {
    name: 'scrollToPosition',
    description: 'Scroll to a specific Y coordinate on the page',
    inputSchema: {
        type: 'object' as const,
        properties: {
            y: {
                type: 'number',
                description: 'Y coordinate to scroll to',
            },
            smooth: {
                type: 'boolean',
                description: 'Use smooth scrolling animation',
                default: DEFAULT_SMOOTH,
            },
        },
        required: ['y'],
    },
    async handler(
        session: BrowserSession,
        args: {
            y: number;
            smooth?: boolean;
        }
    ): Promise<CallToolResult> {
        logger.info('ScrollToPosition called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const smooth = args.smooth ?? DEFAULT_SMOOTH;

            await page.evaluate(
                ({ y, smooth }) => {
                    window.scrollTo({
                        top: y,
                        behavior: smooth ? 'smooth' : 'auto',
                    });
                },
                { y: args.y, smooth }
            );

            await page.waitForTimeout(smooth ? SCROLL_WAIT_TIME.SMOOTH : SCROLL_WAIT_TIME.INSTANT);

            const scrollPosition = await page.evaluate(() => {
                return {
                    x: window.scrollX,
                    y: window.scrollY,
                    height: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight,
                };
            });

            logger.info('Scroll completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Scrolled to Y position: ${args.y}\nCurrent position: ${formatScrollPercentage(scrollPosition.y, scrollPosition.height, scrollPosition.viewportHeight)}`,
                    },
                ],
            };
        } catch (error) {
            logger.error('ScrollToPosition failed', error);
            throw error;
        }
    },
};

export const scrollDirectionTool = {
    name: 'scrollDirection',
    description: 'Scroll the page in a specific direction',
    inputSchema: {
        type: 'object' as const,
        properties: {
            direction: {
                type: 'string',
                description: 'Direction to scroll',
                enum: ['up', 'down', 'top', 'bottom'],
            },
            amount: {
                type: 'number',
                description: 'Pixels to scroll (only applies to up/down)',
                default: DEFAULT_SCROLL_AMOUNT,
            },
            smooth: {
                type: 'boolean',
                description: 'Use smooth scrolling animation',
                default: DEFAULT_SMOOTH,
            },
        },
        required: ['direction'],
    },
    async handler(
        session: BrowserSession,
        args: {
            direction: 'up' | 'down' | 'top' | 'bottom';
            amount?: number;
            smooth?: boolean;
        }
    ): Promise<CallToolResult> {
        logger.info('ScrollDirection called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const smooth = args.smooth ?? DEFAULT_SMOOTH;
            const amount = args.amount ?? DEFAULT_SCROLL_AMOUNT;
            let resultText = '';

            switch (args.direction) {
                case 'up':
                    await page.evaluate(
                        ({ amount, smooth }) => {
                            window.scrollBy({
                                top: -amount,
                                behavior: smooth ? 'smooth' : 'auto',
                            });
                        },
                        { amount, smooth }
                    );
                    resultText = `Scrolled up ${amount}px`;
                    break;
                case 'down':
                    await page.evaluate(
                        ({ amount, smooth }) => {
                            window.scrollBy({
                                top: amount,
                                behavior: smooth ? 'smooth' : 'auto',
                            });
                        },
                        { amount, smooth }
                    );
                    resultText = `Scrolled down ${amount}px`;
                    break;
                case 'top':
                    await page.evaluate(
                        ({ smooth }) => {
                            window.scrollTo({
                                top: 0,
                                behavior: smooth ? 'smooth' : 'auto',
                            });
                        },
                        { smooth }
                    );
                    resultText = 'Scrolled to top of page';
                    break;
                case 'bottom':
                    await page.evaluate(
                        ({ smooth }) => {
                            window.scrollTo({
                                top: document.body.scrollHeight,
                                behavior: smooth ? 'smooth' : 'auto',
                            });
                        },
                        { smooth }
                    );
                    resultText = 'Scrolled to bottom of page';
                    break;
            }

            await page.waitForTimeout(smooth ? SCROLL_WAIT_TIME.SMOOTH : SCROLL_WAIT_TIME.INSTANT);

            const scrollPosition = await page.evaluate(() => {
                return {
                    x: window.scrollX,
                    y: window.scrollY,
                    height: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight,
                };
            });

            logger.info('Scroll completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${resultText}\nCurrent position: ${formatScrollPercentage(scrollPosition.y, scrollPosition.height, scrollPosition.viewportHeight)}`,
                    },
                ],
            };
        } catch (error) {
            logger.error('ScrollDirection failed', error);
            throw error;
        }
    },
};

export const scrollToTextTool = {
    name: 'scrollToText',
    description: 'Scroll to an element containing specific text',
    inputSchema: {
        type: 'object' as const,
        properties: {
            text: {
                type: 'string',
                description: 'Text to find and scroll to',
            },
            smooth: {
                type: 'boolean',
                description: 'Use smooth scrolling animation',
                default: DEFAULT_SMOOTH,
            },
        },
        required: ['text'],
    },
    async handler(
        session: BrowserSession,
        args: {
            text: string;
            smooth?: boolean;
        }
    ): Promise<CallToolResult> {
        logger.info('ScrollToText called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const smooth = args.smooth ?? DEFAULT_SMOOTH;

            const result = await page.evaluate(
                ({ text, smooth }) => {
                    const elements = Array.from(
                        document.querySelectorAll('*')
                    );
                    let matchCount = 0;
                    let scrolledElement = null;
                    
                    for (const element of elements) {
                        if (
                            element.textContent &&
                            element.textContent.includes(text)
                        ) {
                            matchCount++;
                            if (!scrolledElement) {
                                element.scrollIntoView({
                                    behavior: smooth ? 'smooth' : 'auto',
                                    block: 'center',
                                });
                                scrolledElement = {
                                    tagName: element.tagName,
                                    className: (element as HTMLElement).className,
                                };
                            }
                        }
                    }
                    return { found: matchCount > 0, matchCount, scrolledElement };
                },
                { text: args.text, smooth }
            );

            if (!result.found) {
                throw new Error(
                    `No element found containing text: "${args.text}". Searched through all page elements.`
                );
            }

            await page.waitForTimeout(smooth ? SCROLL_WAIT_TIME.SMOOTH : SCROLL_WAIT_TIME.INSTANT);

            const scrollPosition = await page.evaluate(() => {
                return {
                    x: window.scrollX,
                    y: window.scrollY,
                    height: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight,
                };
            });

            logger.info('Scroll completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Scrolled to element containing: "${args.text}" (found ${result.matchCount} matches)\nElement: <${result.scrolledElement?.tagName}${result.scrolledElement?.className ? ` class="${result.scrolledElement.className}"` : ''}>\nCurrent position: ${formatScrollPercentage(scrollPosition.y, scrollPosition.height, scrollPosition.viewportHeight)}`,
                    },
                ],
            };
        } catch (error) {
            logger.error('ScrollToText failed', error);
            throw error;
        }
    },
};
