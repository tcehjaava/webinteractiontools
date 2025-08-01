import {
    CallToolResult,
    McpError,
    ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { BrowserSession } from '../lib/browser.js';
import { Logger } from '../lib/logger.js';

const logger = new Logger('getComputedStyles');

interface StyleProperty {
    name: string;
    value: string;
}

interface ElementWithStyles {
    selector: string;
    tagName: string;
    className?: string;
    id?: string;
    text?: string;
    styles: StyleProperty[];
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export const getComputedStylesTool = {
    name: 'getComputedStyles',
    description:
        'Extract computed CSS styles from elements to help agents understand visual appearance, debug styling issues, and replicate designs',
    inputSchema: {
        type: 'object' as const,
        properties: {
            selector: {
                type: 'string',
                description:
                    'CSS selector to find element(s). Use "body" to get all visible elements',
            },
            includeAll: {
                type: 'boolean',
                description:
                    'Include all CSS properties (default: false, only includes commonly used properties)',
                default: false,
            },
            categories: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: [
                        'layout',
                        'typography',
                        'colors',
                        'spacing',
                        'borders',
                        'effects',
                        'positioning',
                    ],
                },
                description:
                    'Specific style categories to include. If not specified, includes all categories',
            },
            includeInherited: {
                type: 'boolean',
                description:
                    'Include inherited CSS properties (default: false)',
                default: false,
            },
            maxElements: {
                type: 'number',
                description:
                    'Maximum number of elements to process (default: 10)',
                default: 10,
            },
        },
        required: ['selector'],
    },
    async handler(
        session: BrowserSession,
        args: {
            selector: string;
            includeAll?: boolean;
            categories?: string[];
            includeInherited?: boolean;
            maxElements?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('Extracting computed styles', args);

        try {
            const page = await session.getPage();

            const result = await page.evaluate(
                ({
                    selector,
                    includeAll = false,
                    categories = [],
                    includeInherited = false,
                    maxElements = 10,
                }) => {
                    const styleCategories = {
                        layout: [
                            'display',
                            'position',
                            'float',
                            'clear',
                            'overflow',
                            'overflow-x',
                            'overflow-y',
                            'width',
                            'height',
                            'min-width',
                            'min-height',
                            'max-width',
                            'max-height',
                            'flex',
                            'flex-direction',
                            'flex-wrap',
                            'justify-content',
                            'align-items',
                            'align-content',
                            'grid-template-columns',
                            'grid-template-rows',
                            'gap',
                            'grid-gap',
                        ],
                        typography: [
                            'font-family',
                            'font-size',
                            'font-weight',
                            'font-style',
                            'line-height',
                            'text-align',
                            'text-decoration',
                            'text-transform',
                            'letter-spacing',
                            'word-spacing',
                            'white-space',
                            'text-overflow',
                            'word-break',
                            'text-shadow',
                        ],
                        colors: [
                            'color',
                            'background-color',
                            'background-image',
                            'background',
                            'border-color',
                            'outline-color',
                            'text-decoration-color',
                        ],
                        spacing: [
                            'margin',
                            'margin-top',
                            'margin-right',
                            'margin-bottom',
                            'margin-left',
                            'padding',
                            'padding-top',
                            'padding-right',
                            'padding-bottom',
                            'padding-left',
                        ],
                        borders: [
                            'border',
                            'border-width',
                            'border-style',
                            'border-color',
                            'border-top',
                            'border-right',
                            'border-bottom',
                            'border-left',
                            'border-radius',
                            'outline',
                            'outline-width',
                            'outline-style',
                        ],
                        effects: [
                            'opacity',
                            'visibility',
                            'box-shadow',
                            'transform',
                            'transition',
                            'animation',
                            'filter',
                            'backdrop-filter',
                            'z-index',
                        ],
                        positioning: [
                            'top',
                            'right',
                            'bottom',
                            'left',
                            'z-index',
                        ],
                    };

                    const getRelevantProperties = (): string[] => {
                        if (includeAll) {
                            return [];
                        }

                        if (categories.length === 0) {
                            return Object.values(styleCategories).flat();
                        }

                        return categories
                            .filter(cat => cat in styleCategories)
                            .map(
                                cat =>
                                    styleCategories[
                                        cat as keyof typeof styleCategories
                                    ]
                            )
                            .flat();
                    };

                    const elements = document.querySelectorAll(selector);
                    if (elements.length === 0) {
                        throw new Error(
                            `No elements found matching selector: ${selector}`
                        );
                    }

                    const relevantProps = getRelevantProperties();
                    const results: ElementWithStyles[] = [];

                    const elementsToProcess = Math.min(
                        elements.length,
                        maxElements
                    );

                    for (let i = 0; i < elementsToProcess; i++) {
                        const element = elements[i] as HTMLElement;
                        const computedStyles = window.getComputedStyle(element);
                        const rect = element.getBoundingClientRect();

                        const styles: StyleProperty[] = [];

                        if (includeAll) {
                            for (let j = 0; j < computedStyles.length; j++) {
                                const propName = computedStyles[j];
                                const value =
                                    computedStyles.getPropertyValue(propName);

                                if (!includeInherited) {
                                    const parentElement = element.parentElement;
                                    if (parentElement) {
                                        const parentValue = window
                                            .getComputedStyle(parentElement)
                                            .getPropertyValue(propName);
                                        if (value === parentValue) continue;
                                    }
                                }

                                if (
                                    value &&
                                    value !== 'initial' &&
                                    value !== 'normal' &&
                                    value !== 'none' &&
                                    value !== 'auto'
                                ) {
                                    styles.push({ name: propName, value });
                                }
                            }
                        } else {
                            for (const propName of relevantProps) {
                                const value =
                                    computedStyles.getPropertyValue(propName);

                                if (!includeInherited) {
                                    const parentElement = element.parentElement;
                                    if (parentElement) {
                                        const parentValue = window
                                            .getComputedStyle(parentElement)
                                            .getPropertyValue(propName);
                                        if (value === parentValue) continue;
                                    }
                                }

                                if (
                                    value &&
                                    value !== 'initial' &&
                                    value !== 'normal' &&
                                    value !== 'none' &&
                                    value !== 'auto'
                                ) {
                                    styles.push({ name: propName, value });
                                }
                            }
                        }

                        const elementInfo: ElementWithStyles = {
                            selector: `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ').join('.') : ''}`,
                            tagName: element.tagName.toLowerCase(),
                            styles,
                            boundingBox: {
                                x: Math.round(rect.x),
                                y: Math.round(rect.y),
                                width: Math.round(rect.width),
                                height: Math.round(rect.height),
                            },
                        };

                        if (element.id) elementInfo.id = element.id;
                        if (element.className)
                            elementInfo.className = element.className;

                        const text = element.textContent?.trim();
                        if (text && text.length > 0 && text.length < 100) {
                            elementInfo.text = text;
                        }

                        results.push(elementInfo);
                    }

                    return {
                        elementsFound: elements.length,
                        elementsProcessed: elementsToProcess,
                        elements: results,
                    };
                },
                {
                    selector: args.selector,
                    includeAll: args.includeAll,
                    categories: args.categories,
                    includeInherited: args.includeInherited,
                    maxElements: args.maxElements,
                }
            );

            logger.info('Extracted styles successfully', {
                elementsFound: result.elementsFound,
                elementsProcessed: result.elementsProcessed,
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error) {
            logger.error('Failed to extract computed styles', error);

            if (
                error instanceof Error &&
                error.message.includes('No elements found')
            ) {
                throw new McpError(
                    ErrorCode.InvalidRequest,
                    `No elements found matching selector: ${args.selector}`
                );
            }

            throw new McpError(
                ErrorCode.InternalError,
                `Failed to extract computed styles: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    },
};
