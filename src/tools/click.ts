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
                    const CLICKABLE_TAGS = [
                        'a',
                        'button',
                        'input',
                        'select',
                        'textarea',
                        'label',
                    ];
                    const CLICKABLE_ROLES = [
                        'button',
                        'link',
                        'tab',
                        'menuitem',
                    ];
                    const IGNORED_TAGS = ['SCRIPT', 'STYLE'];

                    const isClickable = (el: Element): boolean => {
                        const tagName = el.tagName.toLowerCase();

                        if (CLICKABLE_TAGS.includes(tagName)) return true;

                        if (el instanceof HTMLElement) {
                            if (el.onclick !== null) return true;

                            const role = el.getAttribute('role');
                            if (role && CLICKABLE_ROLES.includes(role))
                                return true;

                            if (el.hasAttribute('tabindex')) return true;

                            const computedStyle = window.getComputedStyle(el);
                            if (computedStyle.cursor === 'pointer') return true;
                        }

                        return false;
                    };

                    const getDepth = (el: Element): number => {
                        let depth = 0;
                        let current = el.parentElement;
                        while (current) {
                            depth++;
                            current = current.parentElement;
                        }
                        return depth;
                    };

                    const hasDirectTextContent = (
                        element: Element,
                        searchText: string
                    ): boolean => {
                        return Array.from(element.childNodes).some(
                            node =>
                                node.nodeType === Node.TEXT_NODE &&
                                node.textContent &&
                                node.textContent.includes(searchText)
                        );
                    };

                    const findClickableElement = (
                        textElement: Element
                    ): Element => {
                        if (isClickable(textElement)) {
                            return textElement;
                        }

                        const clickableChild = Array.from(
                            textElement.querySelectorAll('*')
                        ).find(
                            child =>
                                child.textContent &&
                                child.textContent.includes(text as string) &&
                                isClickable(child)
                        );

                        if (clickableChild) {
                            return clickableChild;
                        }

                        let parent = textElement.parentElement;
                        while (parent && parent !== document.body) {
                            if (isClickable(parent)) {
                                return parent;
                            }
                            parent = parent.parentElement;
                        }

                        return textElement;
                    };

                    const performClick = (element: HTMLElement): void => {
                        if (element.tagName === 'A' || element.closest('a')) {
                            const linkElement =
                                element.tagName === 'A'
                                    ? element
                                    : element.closest('a');
                            if (linkElement) {
                                linkElement.removeAttribute('target');
                                window.open = function (
                                    url?: string | URL,
                                    _target?: string,
                                    _features?: string
                                ): Window | null {
                                    if (url) {
                                        window.location.href =
                                            typeof url === 'string'
                                                ? url
                                                : url.toString();
                                    }
                                    return null;
                                };
                            }
                        }

                        if (typeof element.click === 'function') {
                            element.click();
                            return;
                        }

                        const rect = element.getBoundingClientRect();
                        const clickEvent = new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true,
                            clientX: rect.left + rect.width / 2,
                            clientY: rect.top + rect.height / 2,
                        });
                        element.dispatchEvent(clickEvent);
                    };

                    const matchingElements: Array<{
                        element: Element;
                        depth: number;
                    }> = [];
                    const allElements = document.querySelectorAll('*');

                    for (const element of Array.from(allElements)) {
                        if (IGNORED_TAGS.includes(element.tagName)) {
                            continue;
                        }

                        const elementText = element.textContent?.trim();
                        if (
                            hasDirectTextContent(element, text as string) ||
                            elementText === text
                        ) {
                            matchingElements.push({
                                element,
                                depth: getDepth(element),
                            });
                        }
                    }

                    if (matchingElements.length === 0) {
                        return {
                            clicked: false,
                            totalMatches: 0,
                            tagName: null,
                            className: null,
                            id: null,
                        };
                    }

                    matchingElements.sort((a, b) => b.depth - a.depth);

                    if (occurrence > matchingElements.length) {
                        return {
                            clicked: false,
                            totalMatches: matchingElements.length,
                            tagName: null,
                            className: null,
                            id: null,
                        };
                    }

                    const match = matchingElements[occurrence - 1];
                    const targetElement = findClickableElement(match.element);

                    if (targetElement instanceof HTMLElement) {
                        try {
                            performClick(targetElement);

                            return {
                                clicked: true,
                                totalMatches: matchingElements.length,
                                tagName: targetElement.tagName,
                                className: targetElement.className || '',
                                id: targetElement.id || '',
                            };
                        } catch {
                            targetElement.dispatchEvent(
                                new Event('click', { bubbles: true })
                            );

                            return {
                                clicked: true,
                                totalMatches: matchingElements.length,
                                tagName: targetElement.tagName,
                                className: targetElement.className || '',
                                id: targetElement.id || '',
                            };
                        }
                    }

                    return {
                        clicked: false,
                        totalMatches: matchingElements.length,
                        tagName: null,
                        className: null,
                        id: null,
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
                        text: `Clicked element containing: "${args.text}" (occurrence ${occurrence} of ${clicked.totalMatches})\nElement: <${clicked.tagName}${clicked.id ? ` id="${clicked.id}"` : ''}${clicked.className ? ` class="${clicked.className}"` : ''}>`,
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

                    if (element.tagName === 'A' || element.closest('a')) {
                        const linkElement =
                            element.tagName === 'A'
                                ? element
                                : element.closest('a');
                        if (linkElement) {
                            linkElement.removeAttribute('target');
                            window.open = function (
                                url?: string | URL,
                                _target?: string,
                                _features?: string
                            ): Window | null {
                                if (url) {
                                    window.location.href =
                                        typeof url === 'string'
                                            ? url
                                            : url.toString();
                                }
                                return null;
                            };
                        }
                    }

                    try {
                        if (
                            element instanceof HTMLElement &&
                            typeof element.click === 'function'
                        ) {
                            element.click();
                        } else {
                            const clickEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true,
                                clientX: x,
                                clientY: y,
                            });
                            element.dispatchEvent(clickEvent);
                        }
                    } catch {
                        const basicClickEvent = new Event('click', {
                            bubbles: true,
                        });
                        element.dispatchEvent(basicClickEvent);
                    }

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
                            const isClickable =
                                rect.width > 0 &&
                                rect.height > 0 &&
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

                                if (
                                    element.tagName === 'A' ||
                                    element.closest('a')
                                ) {
                                    const linkElement =
                                        element.tagName === 'A'
                                            ? element
                                            : element.closest('a');
                                    if (linkElement) {
                                        linkElement.removeAttribute('target');
                                        window.open = function (
                                            url?: string | URL,
                                            _target?: string,
                                            _features?: string
                                        ): Window | null {
                                            if (url) {
                                                window.location.href =
                                                    typeof url === 'string'
                                                        ? url
                                                        : url.toString();
                                            }
                                            return null;
                                        };
                                    }
                                }

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
