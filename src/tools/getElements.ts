import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const ELEMENT_TYPES = [
    'all',
    'buttons',
    'links',
    'inputs',
    'clickable',
] as const;

type ElementType = (typeof ELEMENT_TYPES)[number];

const DEFAULT_ELEMENT_TYPE: ElementType = 'clickable';
const DEFAULT_SCOPE = 'viewport' as const;
const DEFAULT_PAGE = 1;
const ELEMENTS_PER_PAGE = 20;

const logger = new Logger('getElements');

export const getElementsTool = {
    name: 'getElements',
    description: 'Get clickable elements currently visible in the viewport',
    inputSchema: {
        type: 'object' as const,
        properties: {
            type: {
                type: 'string',
                enum: ELEMENT_TYPES,
                default: DEFAULT_ELEMENT_TYPE,
                description: 'Type of elements to find',
            },
            scope: {
                type: 'string',
                enum: ['viewport', 'all'],
                default: DEFAULT_SCOPE,
                description: 'Search in viewport only or entire page',
            },
            page: {
                type: 'number',
                default: DEFAULT_PAGE,
                description: `Page number for pagination (${ELEMENTS_PER_PAGE} elements per page)`,
            },
        },
    },
    async handler(
        session: BrowserSession,
        args: {
            type?: ElementType;
            scope?: 'viewport' | 'all';
            page?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('Tool called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const elementType: ElementType = args.type ?? DEFAULT_ELEMENT_TYPE;
            const searchScope = args.scope ?? 'viewport';
            const pageNumber = args.page ?? 1;
            const elementsPerPage = ELEMENTS_PER_PAGE;

            const elements = await page.evaluate(
                ({
                    type,
                    scope,
                    validTypes,
                }: {
                    type: string;
                    scope: string;
                    validTypes: readonly string[];
                }) => {
                    const getSelector = (type: string): string => {
                        if (!validTypes.includes(type)) {
                            throw new Error(
                                `Invalid element type: "${type}". Valid types are: ${validTypes.join(', ')}`
                            );
                        }

                        switch (type) {
                            case 'buttons':
                                return 'button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]';
                            case 'links':
                                return 'a[href], [role="link"]';
                            case 'inputs':
                                return 'input, textarea, select, [contenteditable="true"]';
                            case 'clickable':
                                return 'button, a[href], input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="link"], [onclick], [tabindex]:not([tabindex="-1"])';
                            case 'all':
                                return '*';
                            default:
                                // This should never be reached due to validation above
                                throw new Error(
                                    `Unhandled element type: ${type}`
                                );
                        }
                    };

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isInViewport = (element: any): boolean => {
                        const rect = element.getBoundingClientRect();
                        return (
                            rect.top >= 0 &&
                            rect.left >= 0 &&
                            rect.bottom <=
                                (window.innerHeight ||
                                    document.documentElement.clientHeight) &&
                            rect.right <=
                                (window.innerWidth ||
                                    document.documentElement.clientWidth) &&
                            rect.width > 0 &&
                            rect.height > 0
                        );
                    };

                    const selector = getSelector(type);
                    const allElements = Array.from(
                        document.querySelectorAll(selector)
                    );

                    const filteredElements =
                        scope === 'viewport'
                            ? allElements.filter(isInViewport)
                            : allElements;

                    return filteredElements.map(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (element: any, index: number) => {
                            const rect = element.getBoundingClientRect();
                            return {
                                index,
                                tagName: element.tagName.toLowerCase(),
                                type: element.type || null,
                                text:
                                    element.textContent
                                        ?.trim()
                                        .substring(0, 50) || '',
                                href: element.href || null,
                                value: element.value || null,
                                placeholder: element.placeholder || null,
                                ariaLabel:
                                    element.getAttribute('aria-label') || null,
                                className: element.className || null,
                                id: element.id || null,
                                position: {
                                    x: Math.round(rect.left + rect.width / 2),
                                    y: Math.round(rect.top + rect.height / 2),
                                },
                                bounds: {
                                    left: Math.round(rect.left),
                                    top: Math.round(rect.top),
                                    width: Math.round(rect.width),
                                    height: Math.round(rect.height),
                                },
                            };
                        }
                    );
                },
                {
                    type: elementType,
                    scope: searchScope,
                    validTypes: [...ELEMENT_TYPES],
                }
            );

            const formatElement = (el: {
                index: number;
                tagName: string;
                text: string;
                ariaLabel: string | null;
                value: string | null;
                placeholder: string | null;
                id: string | null;
                className: string | null;
                type: string | null;
                position: { x: number; y: number };
            }): string => {
                let str = `[${el.index}] <${el.tagName}>`;

                // Determine the main identifier/label for the element
                let label = '';
                if (el.text && el.text.trim()) {
                    label = `"${el.text}${el.text.length >= 50 ? '...' : ''}"`;
                } else if (el.ariaLabel) {
                    label = `"${el.ariaLabel}"`;
                } else if (el.value) {
                    label = `"${el.value}"`;
                } else if (el.placeholder) {
                    label = `"${el.placeholder}"`;
                } else if (el.id) {
                    label = `#${el.id}`;
                } else if (el.className) {
                    const classNameStr =
                        typeof el.className === 'string'
                            ? el.className
                            : String(el.className || '');
                    if (classNameStr.trim()) {
                        label = `.${classNameStr.split(' ')[0]}`;
                    }
                }

                // Add type info for inputs
                if (el.tagName === 'input' && el.type) {
                    label += ` [${el.type}]`;
                }

                str += ` ${label} (${el.position.x},${el.position.y})`;
                return str;
            };

            // Apply pagination
            const startIndex = (pageNumber - 1) * elementsPerPage;
            const endIndex = startIndex + elementsPerPage;
            const paginatedElements = elements.slice(startIndex, endIndex);
            const totalPages = Math.ceil(elements.length / elementsPerPage);

            let resultText = `Found ${elements.length} ${elementType} elements`;
            if (searchScope === 'viewport') {
                resultText += ' in viewport';
            }

            if (elements.length > elementsPerPage) {
                resultText += ` (showing page ${pageNumber}/${totalPages})`;
            }
            resultText += ':\n\n';

            if (paginatedElements.length === 0) {
                if (elements.length === 0) {
                    resultText += 'No elements found.';
                } else {
                    resultText += `No elements on page ${pageNumber}. Total pages: ${totalPages}`;
                }
            } else {
                resultText += paginatedElements
                    .map((el, idx) => {
                        // Update index to reflect actual position in full list
                        el.index = startIndex + idx;
                        return formatElement(el);
                    })
                    .join('\n');
            }

            if (pageNumber < totalPages) {
                resultText += `\n\nUse page: ${pageNumber + 1} to see more elements.`;
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
            logger.error('GetElements failed', error);
            throw error;
        }
    },
};
