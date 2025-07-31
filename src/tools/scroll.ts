import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

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
                default: true,
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
        console.log(`ScrollToPosition tool called with args:`, args);

        try {
            const page = await session.getPage();
            console.log('Page obtained');

            const smooth = args.smooth ?? true;

            await page.evaluate(
                ({ y, smooth }) => {
                    window.scrollTo({
                        top: y,
                        behavior: smooth ? 'smooth' : 'auto',
                    });
                },
                { y: args.y, smooth }
            );

            await page.waitForTimeout(smooth ? 500 : 100);

            const scrollPosition = await page.evaluate(() => {
                return {
                    x: window.scrollX,
                    y: window.scrollY,
                    height: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight,
                };
            });

            console.info('Scroll completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Scrolled to Y position: ${args.y}\nCurrent position: Y=${scrollPosition.y} (${Math.round((scrollPosition.y / (scrollPosition.height - scrollPosition.viewportHeight)) * 100)}% of page)`,
                    },
                ],
            };
        } catch (error) {
            console.error('ScrollToPosition error:', error);
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
                default: 500,
            },
            smooth: {
                type: 'boolean',
                description: 'Use smooth scrolling animation',
                default: true,
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
        console.log(`ScrollDirection tool called with args:`, args);

        try {
            const page = await session.getPage();
            console.log('Page obtained');

            const smooth = args.smooth ?? true;
            const amount = args.amount ?? 500;
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

            await page.waitForTimeout(smooth ? 500 : 100);

            const scrollPosition = await page.evaluate(() => {
                return {
                    x: window.scrollX,
                    y: window.scrollY,
                    height: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight,
                };
            });

            console.info('Scroll completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${resultText}\nCurrent position: Y=${scrollPosition.y} (${Math.round((scrollPosition.y / (scrollPosition.height - scrollPosition.viewportHeight)) * 100)}% of page)`,
                    },
                ],
            };
        } catch (error) {
            console.error('ScrollDirection error:', error);
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
                default: true,
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
        console.log(`ScrollToText tool called with args:`, args);

        try {
            const page = await session.getPage();
            console.log('Page obtained');

            const smooth = args.smooth ?? true;

            const found = await page.evaluate(
                ({ text, smooth }) => {
                    const elements = Array.from(
                        document.querySelectorAll('*')
                    );
                    for (const element of elements) {
                        if (
                            element.textContent &&
                            element.textContent.includes(text as string)
                        ) {
                            element.scrollIntoView({
                                behavior: smooth ? 'smooth' : 'auto',
                                block: 'center',
                            });
                            return true;
                        }
                    }
                    return false;
                },
                { text: args.text, smooth }
            );

            if (!found) {
                throw new Error(
                    `No element found containing text: "${args.text}"`
                );
            }

            await page.waitForTimeout(smooth ? 500 : 100);

            const scrollPosition = await page.evaluate(() => {
                return {
                    x: window.scrollX,
                    y: window.scrollY,
                    height: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight,
                };
            });

            console.info('Scroll completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Scrolled to element containing: "${args.text}"\nCurrent position: Y=${scrollPosition.y} (${Math.round((scrollPosition.y / (scrollPosition.height - scrollPosition.viewportHeight)) * 100)}% of page)`,
                    },
                ],
            };
        } catch (error) {
            console.error('ScrollToText error:', error);
            throw error;
        }
    },
};
