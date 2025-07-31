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
                    const elements = Array.from(document.querySelectorAll('*'));

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

            const result = await page.evaluate(
                ({ x, y, textTruncateLength }) => {
                    const element = document.elementFromPoint(x, y);
                    if (!element) {
                        return {
                            clicked: false,
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

                    (element as HTMLElement).click();

                    return {
                        clicked: true,
                        ...elementInfo,
                    };
                },
                {
                    x: args.x,
                    y: args.y,
                    textTruncateLength: TEXT_TRUNCATE_LENGTH,
                }
            );

            if (!result.clicked) {
                throw new Error(
                    `${result.reason} at coordinates (${args.x}, ${args.y})`
                );
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Click completed');

            let resultText = `Clicked at coordinates (${args.x}, ${args.y})`;
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

            const result = await page.evaluate(
                async ({ selector, textTruncateLength }) => {
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        let element = document.querySelector(selector) as HTMLElement;
                        
                        if (!element) {
                            await new Promise(resolve => window.setTimeout(resolve, 1000));
                            element = document.querySelector(selector) as HTMLElement;
                        }
                        
                        if (element) {
                            const rect = element.getBoundingClientRect();
                            const style = window.getComputedStyle(element);
                            const isClickable = rect.width > 0 && rect.height > 0 && 
                                               style.visibility !== 'hidden' && 
                                               style.display !== 'none' &&
                                               !element.hasAttribute('disabled');
                            
                            if (isClickable) {
                                const elementInfo = {
                                    tagName: element.tagName,
                                    className: element.className,
                                    id: element.id,
                                    text: element.textContent?.substring(
                                        0,
                                        textTruncateLength
                                    ),
                                };
                                
                                element.click();
                                
                                return {
                                    found: true,
                                    attempt,
                                    strategy: 'querySelector',
                                    ...elementInfo,
                                };
                            } else {
                                return {
                                    found: false,
                                    reason: 'Element found but not clickable (hidden/disabled)',
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

            await page.waitForTimeout(waitAfter);
            logger.info('Click completed');

            let resultText = `Clicked element matching selector: "${args.selector}"`;
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
            logger.error('ClickSelector failed', error);
            throw error;
        }
    },
};
