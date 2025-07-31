import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const DEFAULT_SELECTOR = 'body';
const DEFAULT_CLEAN = true;
const DEFAULT_VIEWPORT = false;

export const extractHTMLTool = {
    name: 'extractHTML',
    description: 'Extract HTML content from the page or specific elements',
    inputSchema: {
        type: 'object' as const,
        properties: {
            selector: {
                type: 'string',
                description: `CSS selector (default: ${DEFAULT_SELECTOR})`,
                default: DEFAULT_SELECTOR,
            },
            clean: {
                type: 'boolean',
                description: 'Remove scripts, styles, and hidden elements',
                default: DEFAULT_CLEAN,
            },
            viewport: {
                type: 'boolean',
                description: 'Only extract visible viewport content',
                default: DEFAULT_VIEWPORT,
            },
        },
    },
    async handler(
        session: BrowserSession,
        args: {
            selector?: string;
            clean?: boolean;
            viewport?: boolean;
        }
    ): Promise<CallToolResult> {
        console.log(`ExtractHTML tool called with args:`, args);

        try {
            const page = await session.getPage();
            console.log('Page obtained');

            const selector = args.selector ?? DEFAULT_SELECTOR;
            const clean = args.clean ?? true;
            const viewport = args.viewport ?? false;

            let html: string;

            if (viewport) {
                html = await page.evaluate(
                    ({ selector, clean }) => {
                        const viewportHeight = window.innerHeight;
                        const elements = Array.from(
                            document.querySelectorAll(selector)
                        );

                        const visibleElements = elements.filter((element) => {
                            const rect = element.getBoundingClientRect();
                            return (
                                rect.bottom > 0 &&
                                rect.top < viewportHeight &&
                                rect.height > 0
                            );
                        });

                        if (visibleElements.length === 0) {
                            return '';
                        }

                        const container = document.createElement('div');
                        visibleElements.forEach((el) => {
                            const clone = el.cloneNode(true) as HTMLElement;
                            if (clean) {
                                clone
                                    .querySelectorAll('script, style, noscript')
                                    .forEach((el) => el.remove());
                                clone
                                    .querySelectorAll('[style*="display: none"]')
                                    .forEach((el) => el.remove());
                                clone
                                    .querySelectorAll('[hidden]')
                                    .forEach((el) => el.remove());
                            }
                            container.appendChild(clone);
                        });

                        return container.innerHTML;
                    },
                    { selector, clean }
                );
            } else {
                html = await page.evaluate(
                    ({ selector, clean }) => {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length === 0) {
                            return '';
                        }

                        if (elements.length === 1) {
                            const element = elements[0] as HTMLElement;
                            if (clean) {
                                const clone = element.cloneNode(
                                    true
                                ) as HTMLElement;
                                clone
                                    .querySelectorAll('script, style, noscript')
                                    .forEach((el) => el.remove());
                                clone
                                    .querySelectorAll('[style*="display: none"]')
                                    .forEach((el) => el.remove());
                                clone
                                    .querySelectorAll('[hidden]')
                                    .forEach((el) => el.remove());
                                return clone.outerHTML;
                            }
                            return element.outerHTML;
                        } else {
                            const container = document.createElement('div');
                            elements.forEach((el) => {
                                const clone = el.cloneNode(true) as HTMLElement;
                                if (clean) {
                                    clone
                                        .querySelectorAll(
                                            'script, style, noscript'
                                        )
                                        .forEach((el) => el.remove());
                                    clone
                                        .querySelectorAll(
                                            '[style*="display: none"]'
                                        )
                                        .forEach((el) => el.remove());
                                    clone
                                        .querySelectorAll('[hidden]')
                                        .forEach((el) => el.remove());
                                }
                                container.appendChild(clone);
                            });
                            return container.innerHTML;
                        }
                    },
                    { selector, clean }
                );
            }

            const elementCount = await page.evaluate(
                (selector) =>
                    document.querySelectorAll(selector).length,
                selector
            );

            const info = [
                `Selector: ${selector}`,
                `Elements found: ${elementCount}`,
                `Clean mode: ${clean}`,
                `Viewport only: ${viewport}`,
                `HTML length: ${html.length} characters`,
            ].join('\n');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${info}\n\n${html}`,
                    },
                ],
            };
        } catch (error) {
            console.error('ExtractHTML error:', error);
            throw error;
        }
    },
};