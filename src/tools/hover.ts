import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const DEFAULT_WAIT_AFTER_HOVER = 1000;
const DEFAULT_OCCURRENCE = 1;
const TEXT_TRUNCATE_LENGTH = 50;

const logger = new Logger('hover');

export const hoverTextTool = {
    name: 'hoverText',
    description: 'Hover over an element containing specific text',
    inputSchema: {
        type: 'object' as const,
        properties: {
            text: {
                type: 'string',
                description: 'Text to find and hover over',
            },
            occurrence: {
                type: 'number',
                description:
                    'Which occurrence to hover if multiple matches (1-based)',
                default: DEFAULT_OCCURRENCE,
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after hover',
                default: DEFAULT_WAIT_AFTER_HOVER,
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
        logger.info('HoverText called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const occurrence = args.occurrence ?? 1;
            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_HOVER;

            const hovered = await page.evaluate(
                ({ text, occurrence }) => {
                    let matchCount = 0;
                    const elements = Array.from(document.querySelectorAll('*'));

                    for (const element of elements) {
                        if (
                            element.textContent &&
                            element.textContent.includes(text as string)
                        ) {
                            matchCount++;
                            if (matchCount === occurrence) {
                                // Get element's bounding box for cursor position
                                const rect = element.getBoundingClientRect();
                                const x = rect.left + rect.width / 2;
                                const y = rect.top + rect.height / 2;

                                // Dispatch mousemove first to simulate cursor movement
                                const mousemoveEvent = new MouseEvent(
                                    'mousemove',
                                    {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y,
                                    }
                                );
                                const mouseoverEvent = new MouseEvent(
                                    'mouseover',
                                    {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y,
                                    }
                                );
                                const mouseenterEvent = new MouseEvent(
                                    'mouseenter',
                                    {
                                        view: window,
                                        bubbles: false,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y,
                                    }
                                );
                                element.dispatchEvent(mousemoveEvent);
                                element.dispatchEvent(mouseoverEvent);
                                element.dispatchEvent(mouseenterEvent);
                                return {
                                    hovered: true,
                                    totalMatches: matchCount,
                                    tagName: element.tagName,
                                    className: element.className,
                                };
                            }
                        }
                    }

                    // Count total matches in the document
                    const totalMatches = elements.filter(
                        el =>
                            el.textContent &&
                            el.textContent.includes(text as string)
                    ).length;

                    return {
                        hovered: false,
                        totalMatches: totalMatches,
                        tagName: null,
                        className: null,
                    };
                },
                { text: args.text, occurrence }
            );

            if (!hovered.hovered) {
                if (hovered.totalMatches === 0) {
                    throw new Error(
                        `No element found containing text: "${args.text}"`
                    );
                } else {
                    throw new Error(
                        `Element occurrence ${occurrence} not found. Only ${hovered.totalMatches} matches found for text: "${args.text}"`
                    );
                }
            }

            // Try using Playwright's native hover method as well for better compatibility
            try {
                // Find the element again and use Playwright's hover
                const elements = await page.$$('*');
                let count = 0;
                for (const element of elements) {
                    const text = await element.textContent();
                    if (text && text.includes(args.text)) {
                        count++;
                        if (count === occurrence) {
                            await element.hover();
                            break;
                        }
                    }
                }
            } catch (e) {
                // If native hover fails, continue with synthetic events approach
                logger.debug(
                    'Native hover failed, continuing with synthetic events',
                    e
                );
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Hover completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Hovered over element containing: "${args.text}" (occurrence ${occurrence} of ${hovered.totalMatches})\nElement: <${hovered.tagName}${hovered.className ? ` class="${hovered.className}"` : ''}>`,
                    },
                ],
            };
        } catch (error) {
            logger.error('HoverText failed', error);
            throw error;
        }
    },
};

export const hoverPositionTool = {
    name: 'hoverPosition',
    description: 'Hover at specific coordinates on the page',
    inputSchema: {
        type: 'object' as const,
        properties: {
            x: {
                type: 'number',
                description: 'X coordinate to hover',
            },
            y: {
                type: 'number',
                description: 'Y coordinate to hover',
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after hover',
                default: DEFAULT_WAIT_AFTER_HOVER,
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
        logger.info('HoverPosition called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_HOVER;

            const result = await page.evaluate(
                ({ x, y, textTruncateLength }) => {
                    const element = document.elementFromPoint(x, y);
                    if (!element) {
                        return {
                            hovered: false,
                            reason: 'No element found at coordinates',
                        };
                    }

                    const elementInfo = {
                        tagName: element.tagName,
                        className: element.className,
                        id: element.id,
                        text: element.textContent?.substring(
                            0,
                            textTruncateLength
                        ),
                    };

                    // Dispatch mousemove first to simulate cursor movement
                    const mousemoveEvent = new MouseEvent('mousemove', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: x,
                        clientY: y,
                    });
                    const mouseoverEvent = new MouseEvent('mouseover', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: x,
                        clientY: y,
                    });
                    const mouseenterEvent = new MouseEvent('mouseenter', {
                        view: window,
                        bubbles: false,
                        cancelable: true,
                        clientX: x,
                        clientY: y,
                    });
                    element.dispatchEvent(mousemoveEvent);
                    element.dispatchEvent(mouseoverEvent);
                    element.dispatchEvent(mouseenterEvent);

                    return {
                        hovered: true,
                        ...elementInfo,
                    };
                },
                {
                    x: args.x,
                    y: args.y,
                    textTruncateLength: TEXT_TRUNCATE_LENGTH,
                }
            );

            if (!result.hovered) {
                throw new Error(
                    `${result.reason} at coordinates (${args.x}, ${args.y})`
                );
            }

            // Also use Playwright's native hover for better compatibility
            try {
                await page.mouse.move(args.x, args.y);
            } catch (e) {
                logger.debug(
                    'Native mouse move failed, continuing with synthetic events',
                    e
                );
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Hover completed');

            let resultText = `Hovered at coordinates (${args.x}, ${args.y})`;
            if ('tagName' in result) {
                resultText += `\nElement: <${result.tagName}`;
                if (result.id) resultText += ` id="${result.id}"`;
                if (result.className)
                    resultText += ` class="${result.className}"`;
                resultText += '>';
                if (result.text) {
                    resultText += `\nText: "${result.text}${result.text.length >= TEXT_TRUNCATE_LENGTH ? '...' : ''}"`;
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
            logger.error('HoverPosition failed', error);
            throw error;
        }
    },
};

export const hoverSelectorTool = {
    name: 'hoverSelector',
    description: 'Hover over element matching CSS selector',
    inputSchema: {
        type: 'object' as const,
        properties: {
            selector: {
                type: 'string',
                description: 'CSS selector of element to hover over',
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after hover',
                default: DEFAULT_WAIT_AFTER_HOVER,
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
        logger.info('HoverSelector called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_HOVER;

            const result = await page.evaluate(
                async ({ selector, textTruncateLength }) => {
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        let element = document.querySelector(
                            selector
                        ) as HTMLElement;

                        if (!element) {
                            await new Promise(resolve =>
                                window.setTimeout(resolve, 1000)
                            );
                            element = document.querySelector(
                                selector
                            ) as HTMLElement;
                        }

                        if (element) {
                            const rect = element.getBoundingClientRect();
                            const style = window.getComputedStyle(element);
                            const isVisible =
                                rect.width > 0 &&
                                rect.height > 0 &&
                                style.visibility !== 'hidden' &&
                                style.display !== 'none';

                            if (isVisible) {
                                const elementInfo = {
                                    tagName: element.tagName,
                                    className: element.className,
                                    id: element.id,
                                    text: element.textContent?.substring(
                                        0,
                                        textTruncateLength
                                    ),
                                };

                                // Get element's bounding box for cursor position
                                const rect = element.getBoundingClientRect();
                                const x = rect.left + rect.width / 2;
                                const y = rect.top + rect.height / 2;

                                // Dispatch mousemove first to simulate cursor movement
                                const mousemoveEvent = new MouseEvent(
                                    'mousemove',
                                    {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y,
                                    }
                                );
                                const mouseoverEvent = new MouseEvent(
                                    'mouseover',
                                    {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y,
                                    }
                                );
                                const mouseenterEvent = new MouseEvent(
                                    'mouseenter',
                                    {
                                        view: window,
                                        bubbles: false,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y,
                                    }
                                );
                                element.dispatchEvent(mousemoveEvent);
                                element.dispatchEvent(mouseoverEvent);
                                element.dispatchEvent(mouseenterEvent);

                                return {
                                    found: true,
                                    attempt,
                                    strategy: 'querySelector',
                                    ...elementInfo,
                                };
                            } else {
                                return {
                                    found: false,
                                    reason: 'Element found but not visible (hidden)',
                                };
                            }
                        }
                    }

                    return {
                        found: false,
                        reason: `No element found after 3 attempts: "${selector}"`,
                    };
                },
                {
                    selector: args.selector,
                    textTruncateLength: TEXT_TRUNCATE_LENGTH,
                }
            );

            if (!result.found) {
                throw new Error(result.reason);
            }

            // Try using Playwright's native hover method as well
            try {
                const element = await page.$(args.selector);
                if (element) {
                    await element.hover();
                }
            } catch (e) {
                logger.debug(
                    'Native hover failed, continuing with synthetic events',
                    e
                );
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Hover completed');

            let resultText = `Hovered over element matching selector: "${args.selector}"`;
            if ('tagName' in result) {
                resultText += `\nElement: <${result.tagName}`;
                if (result.id) resultText += ` id="${result.id}"`;
                if (result.className)
                    resultText += ` class="${result.className}"`;
                resultText += '>';
                if (result.text) {
                    resultText += `\nText: "${result.text}${result.text.length >= TEXT_TRUNCATE_LENGTH ? '...' : ''}"`;
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
            logger.error('HoverSelector failed', error);
            throw error;
        }
    },
};
