import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const DEFAULT_OCCURRENCE = 1;

const logger = new Logger('extractHTML');

const ELEMENTS_TO_REMOVE =
    'script, style, noscript, .sr-only, .visually-hidden, [hidden], [style*="display: none"], [style*="display:none"], [aria-hidden="true"]';

export const extractHTMLTool = {
    name: 'extractHTML',
    description:
        'Extract cleaned HTML content from elements containing specific text',
    inputSchema: {
        type: 'object' as const,
        properties: {
            text: {
                type: 'string',
                description: 'Text to find and extract HTML from',
            },
            occurrence: {
                type: 'number',
                description:
                    'Which occurrence to extract if multiple matches (1-based)',
                default: DEFAULT_OCCURRENCE,
            },
        },
        required: ['text'],
    },
    async handler(
        session: BrowserSession,
        args: {
            text: string;
            occurrence?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('Tool called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const occurrence = args.occurrence ?? DEFAULT_OCCURRENCE;

            const result = await page.evaluate(
                ({ text, occurrence, elementsToRemove }) => {
                    const IGNORED_TAGS = ['SCRIPT', 'STYLE'];

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

                    const getDepth = (el: Element): number => {
                        let depth = 0;
                        let current = el.parentElement;
                        while (current) {
                            depth++;
                            current = current.parentElement;
                        }
                        return depth;
                    };

                    const cleanElement = (
                        element: HTMLElement
                    ): HTMLElement => {
                        const clone = element.cloneNode(true) as HTMLElement;
                        clone
                            .querySelectorAll(elementsToRemove)
                            .forEach(el => el.remove());

                        const walker = document.createTreeWalker(
                            clone,
                            NodeFilter.SHOW_TEXT,
                            {
                                acceptNode: node => {
                                    return node.textContent?.trim()
                                        ? NodeFilter.FILTER_SKIP
                                        : NodeFilter.FILTER_ACCEPT;
                                },
                            }
                        );

                        const nodesToRemove: Node[] = [];
                        let currentNode;
                        while ((currentNode = walker.nextNode())) {
                            nodesToRemove.push(currentNode);
                        }
                        nodesToRemove.forEach(node =>
                            node.parentNode?.removeChild(node)
                        );

                        return clone;
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
                            html: '',
                            count: 0,
                            found: false,
                            tagName: null,
                            id: null,
                            className: null,
                        };
                    }

                    matchingElements.sort((a, b) => b.depth - a.depth);

                    if (occurrence > matchingElements.length) {
                        return {
                            html: '',
                            count: matchingElements.length,
                            found: false,
                            tagName: null,
                            id: null,
                            className: null,
                        };
                    }

                    const match = matchingElements[occurrence - 1];
                    const targetElement = match.element as HTMLElement;
                    const cleanedElement = cleanElement(targetElement);

                    return {
                        html: cleanedElement.outerHTML,
                        count: matchingElements.length,
                        found: true,
                        tagName: targetElement.tagName,
                        id: targetElement.id || '',
                        className: targetElement.className || '',
                    };
                },
                {
                    text: args.text,
                    occurrence,
                    elementsToRemove: ELEMENTS_TO_REMOVE,
                }
            );

            if (!result.found) {
                if (result.count === 0) {
                    throw new Error(
                        `No element found containing text: "${args.text}"`
                    );
                } else {
                    throw new Error(
                        `Element occurrence ${occurrence} not found. Only ${result.count} matches found for text: "${args.text}"`
                    );
                }
            }

            const info = [
                `Found text: "${args.text}" (occurrence ${occurrence} of ${result.count})`,
                `Element: <${result.tagName}${result.id ? ` id="${result.id}"` : ''}${result.className ? ` class="${result.className}"` : ''}>`,
                `HTML length: ${result.html.length} characters`,
            ].join('\n');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${info}\n\n${result.html}`,
                    },
                ],
            };
        } catch (error) {
            logger.error('ExtractHTML failed', error);
            throw error;
        }
    },
};
