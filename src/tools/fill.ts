import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const DEFAULT_WAIT_AFTER_FILL = 500;
const logger = new Logger('fill');

export const fillTextTool = {
    name: 'fillText',
    description: 'Fill form inputs by finding them via label text',
    inputSchema: {
        type: 'object' as const,
        properties: {
            labelText: {
                type: 'string',
                description: 'Label text to find the associated input',
            },
            value: {
                type: 'string',
                description: 'Value to fill in the input',
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after filling',
                default: DEFAULT_WAIT_AFTER_FILL,
            },
        },
        required: ['labelText', 'value'],
    },
    async handler(
        session: BrowserSession,
        args: {
            labelText: string;
            value: string;
            waitAfter?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('FillText called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_FILL;

            const result = await page.evaluate(
                ({ labelText, value }) => {
                    const findInputByLabel = (
                        text: string
                    ):
                        | HTMLInputElement
                        | HTMLTextAreaElement
                        | HTMLSelectElement
                        | null => {
                        const labels = Array.from(
                            document.querySelectorAll('label')
                        );

                        for (const label of labels) {
                            if (
                                label.textContent
                                    ?.trim()
                                    .toLowerCase()
                                    .includes(text.toLowerCase())
                            ) {
                                const forId = label.getAttribute('for');
                                if (forId) {
                                    const input = document.getElementById(
                                        forId
                                    ) as
                                        | HTMLInputElement
                                        | HTMLTextAreaElement
                                        | HTMLSelectElement;
                                    if (input) return input;
                                }

                                const input = label.querySelector(
                                    'input, textarea, select'
                                ) as
                                    | HTMLInputElement
                                    | HTMLTextAreaElement
                                    | HTMLSelectElement;
                                if (input) return input;
                            }
                        }

                        const inputs = Array.from(
                            document.querySelectorAll('input, textarea, select')
                        ) as (
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | HTMLSelectElement
                        )[];
                        for (const input of inputs) {
                            const placeholder =
                                input.getAttribute('placeholder');
                            const ariaLabel = input.getAttribute('aria-label');
                            const name = input.getAttribute('name');

                            if (
                                (placeholder &&
                                    placeholder
                                        .toLowerCase()
                                        .includes(text.toLowerCase())) ||
                                (ariaLabel &&
                                    ariaLabel
                                        .toLowerCase()
                                        .includes(text.toLowerCase())) ||
                                (name &&
                                    name
                                        .toLowerCase()
                                        .includes(text.toLowerCase()))
                            ) {
                                return input;
                            }
                        }

                        return null;
                    };

                    const input = findInputByLabel(labelText);

                    if (!input) {
                        return {
                            filled: false,
                            reason: `No input found for label: "${labelText}"`,
                        };
                    }

                    const tagName = input.tagName.toLowerCase();
                    const type = input.getAttribute('type') || 'text';

                    if (tagName === 'select') {
                        const selectElement = input as HTMLSelectElement;
                        const option = Array.from(selectElement.options).find(
                            opt => opt.value === value || opt.text === value
                        );

                        if (option) {
                            selectElement.value = option.value;
                            selectElement.dispatchEvent(
                                new Event('change', { bubbles: true })
                            );
                        } else {
                            return {
                                filled: false,
                                reason: `Option "${value}" not found in select`,
                            };
                        }
                    } else if (type === 'checkbox' || type === 'radio') {
                        const checkable = input as HTMLInputElement;
                        if (value.toLowerCase() === 'true' || value === '1') {
                            checkable.checked = true;
                        } else if (
                            value.toLowerCase() === 'false' ||
                            value === '0'
                        ) {
                            checkable.checked = false;
                        }
                        checkable.dispatchEvent(
                            new Event('change', { bubbles: true })
                        );
                    } else {
                        input.focus();
                        input.value = value;
                        input.dispatchEvent(
                            new Event('input', { bubbles: true })
                        );
                        input.dispatchEvent(
                            new Event('change', { bubbles: true })
                        );
                        input.blur();
                    }

                    return {
                        filled: true,
                        tagName: input.tagName,
                        type: type,
                        id: input.id || '',
                        name: input.getAttribute('name') || '',
                    };
                },
                { labelText: args.labelText, value: args.value }
            );

            if (!result.filled) {
                throw new Error(result.reason);
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Fill completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Filled input for label "${args.labelText}" with value: "${args.value}"\nElement: <${result.tagName} type="${result.type}"${result.id ? ` id="${result.id}"` : ''}${result.name ? ` name="${result.name}"` : ''}>`,
                    },
                ],
            };
        } catch (error) {
            logger.error('FillText failed', error);
            throw error;
        }
    },
};

export const fillSelectorTool = {
    name: 'fillSelector',
    description: 'Fill form inputs using CSS selector',
    inputSchema: {
        type: 'object' as const,
        properties: {
            selector: {
                type: 'string',
                description: 'CSS selector of the input to fill',
            },
            value: {
                type: 'string',
                description: 'Value to fill in the input',
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after filling',
                default: DEFAULT_WAIT_AFTER_FILL,
            },
        },
        required: ['selector', 'value'],
    },
    async handler(
        session: BrowserSession,
        args: {
            selector: string;
            value: string;
            waitAfter?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('FillSelector called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_FILL;

            const result = await page.evaluate(
                ({ selector, value }) => {
                    const input = document.querySelector(selector) as
                        | HTMLInputElement
                        | HTMLTextAreaElement
                        | HTMLSelectElement;

                    if (!input) {
                        return {
                            filled: false,
                            reason: `No element found matching selector: "${selector}"`,
                        };
                    }

                    const tagName = input.tagName.toLowerCase();
                    const type = input.getAttribute('type') || 'text';

                    if (tagName === 'select') {
                        const selectElement = input as HTMLSelectElement;
                        const option = Array.from(selectElement.options).find(
                            opt => opt.value === value || opt.text === value
                        );

                        if (option) {
                            selectElement.value = option.value;
                            selectElement.dispatchEvent(
                                new Event('change', { bubbles: true })
                            );
                        } else {
                            return {
                                filled: false,
                                reason: `Option "${value}" not found in select`,
                            };
                        }
                    } else if (type === 'checkbox' || type === 'radio') {
                        const checkable = input as HTMLInputElement;
                        if (value.toLowerCase() === 'true' || value === '1') {
                            checkable.checked = true;
                        } else if (
                            value.toLowerCase() === 'false' ||
                            value === '0'
                        ) {
                            checkable.checked = false;
                        }
                        checkable.dispatchEvent(
                            new Event('change', { bubbles: true })
                        );
                    } else {
                        input.focus();
                        input.value = value;
                        input.dispatchEvent(
                            new Event('input', { bubbles: true })
                        );
                        input.dispatchEvent(
                            new Event('change', { bubbles: true })
                        );
                        input.blur();
                    }

                    return {
                        filled: true,
                        tagName: input.tagName,
                        type: type,
                        id: input.id || '',
                        name: input.getAttribute('name') || '',
                    };
                },
                { selector: args.selector, value: args.value }
            );

            if (!result.filled) {
                throw new Error(result.reason);
            }

            await page.waitForTimeout(waitAfter);
            logger.info('Fill completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Filled input matching selector "${args.selector}" with value: "${args.value}"\nElement: <${result.tagName} type="${result.type}"${result.id ? ` id="${result.id}"` : ''}${result.name ? ` name="${result.name}"` : ''}>`,
                    },
                ],
            };
        } catch (error) {
            logger.error('FillSelector failed', error);
            throw error;
        }
    },
};

export const fillFormTool = {
    name: 'fillForm',
    description: 'Fill multiple form fields at once',
    inputSchema: {
        type: 'object' as const,
        properties: {
            fields: {
                type: 'array',
                description: 'Array of fields to fill',
                items: {
                    type: 'object',
                    properties: {
                        selector: {
                            type: 'string',
                            description:
                                'CSS selector or label text for the field',
                        },
                        value: {
                            type: 'string',
                            description: 'Value to fill',
                        },
                        useLabel: {
                            type: 'boolean',
                            description:
                                'Whether to use selector as label text',
                            default: false,
                        },
                    },
                    required: ['selector', 'value'],
                },
            },
            waitAfter: {
                type: 'number',
                description: 'Milliseconds to wait after filling all fields',
                default: DEFAULT_WAIT_AFTER_FILL,
            },
        },
        required: ['fields'],
    },
    async handler(
        session: BrowserSession,
        args: {
            fields: Array<{
                selector: string;
                value: string;
                useLabel?: boolean;
            }>;
            waitAfter?: number;
        }
    ): Promise<CallToolResult> {
        logger.info('FillForm called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const waitAfter = args.waitAfter ?? DEFAULT_WAIT_AFTER_FILL;

            const results = await page.evaluate(
                ({ fields }) => {
                    const filledFields: Array<{
                        selector: string;
                        filled: boolean;
                        reason?: string;
                        element?: string;
                    }> = [];

                    const findInputByLabel = (
                        text: string
                    ):
                        | HTMLInputElement
                        | HTMLTextAreaElement
                        | HTMLSelectElement
                        | null => {
                        const labels = Array.from(
                            document.querySelectorAll('label')
                        );

                        for (const label of labels) {
                            if (
                                label.textContent
                                    ?.trim()
                                    .toLowerCase()
                                    .includes(text.toLowerCase())
                            ) {
                                const forId = label.getAttribute('for');
                                if (forId) {
                                    const input = document.getElementById(
                                        forId
                                    ) as
                                        | HTMLInputElement
                                        | HTMLTextAreaElement
                                        | HTMLSelectElement;
                                    if (input) return input;
                                }

                                const input = label.querySelector(
                                    'input, textarea, select'
                                ) as
                                    | HTMLInputElement
                                    | HTMLTextAreaElement
                                    | HTMLSelectElement;
                                if (input) return input;
                            }
                        }

                        const inputs = Array.from(
                            document.querySelectorAll('input, textarea, select')
                        ) as (
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | HTMLSelectElement
                        )[];
                        for (const input of inputs) {
                            const placeholder =
                                input.getAttribute('placeholder');
                            const ariaLabel = input.getAttribute('aria-label');
                            const name = input.getAttribute('name');

                            if (
                                (placeholder &&
                                    placeholder
                                        .toLowerCase()
                                        .includes(text.toLowerCase())) ||
                                (ariaLabel &&
                                    ariaLabel
                                        .toLowerCase()
                                        .includes(text.toLowerCase())) ||
                                (name &&
                                    name
                                        .toLowerCase()
                                        .includes(text.toLowerCase()))
                            ) {
                                return input;
                            }
                        }

                        return null;
                    };

                    for (const field of fields) {
                        const input = field.useLabel
                            ? findInputByLabel(field.selector)
                            : (document.querySelector(field.selector) as
                                  | HTMLInputElement
                                  | HTMLTextAreaElement
                                  | HTMLSelectElement);

                        if (!input) {
                            filledFields.push({
                                selector: field.selector,
                                filled: false,
                                reason: `No input found for: "${field.selector}"`,
                            });
                            continue;
                        }

                        const tagName = input.tagName.toLowerCase();
                        const type = input.getAttribute('type') || 'text';

                        try {
                            if (tagName === 'select') {
                                const selectElement =
                                    input as HTMLSelectElement;
                                const option = Array.from(
                                    selectElement.options
                                ).find(
                                    opt =>
                                        opt.value === field.value ||
                                        opt.text === field.value
                                );

                                if (option) {
                                    selectElement.value = option.value;
                                    selectElement.dispatchEvent(
                                        new Event('change', { bubbles: true })
                                    );
                                } else {
                                    filledFields.push({
                                        selector: field.selector,
                                        filled: false,
                                        reason: `Option "${field.value}" not found in select`,
                                    });
                                    continue;
                                }
                            } else if (
                                type === 'checkbox' ||
                                type === 'radio'
                            ) {
                                const checkable = input as HTMLInputElement;
                                if (
                                    field.value.toLowerCase() === 'true' ||
                                    field.value === '1'
                                ) {
                                    checkable.checked = true;
                                } else if (
                                    field.value.toLowerCase() === 'false' ||
                                    field.value === '0'
                                ) {
                                    checkable.checked = false;
                                }
                                checkable.dispatchEvent(
                                    new Event('change', { bubbles: true })
                                );
                            } else {
                                input.focus();
                                input.value = field.value;
                                input.dispatchEvent(
                                    new Event('input', { bubbles: true })
                                );
                                input.dispatchEvent(
                                    new Event('change', { bubbles: true })
                                );
                                input.blur();
                            }

                            filledFields.push({
                                selector: field.selector,
                                filled: true,
                                element: `<${tagName} type="${type}"${input.id ? ` id="${input.id}"` : ''}>`,
                            });
                        } catch (error) {
                            filledFields.push({
                                selector: field.selector,
                                filled: false,
                                reason: `Error filling field: ${error}`,
                            });
                        }
                    }

                    return filledFields;
                },
                { fields: args.fields }
            );

            await page.waitForTimeout(waitAfter);
            logger.info('Form fill completed');

            const successCount = results.filter(r => r.filled).length;
            const failureCount = results.filter(r => !r.filled).length;

            let resultText = `Filled ${successCount} out of ${results.length} fields`;

            if (successCount > 0) {
                resultText += '\n\nSuccess:';
                results
                    .filter(r => r.filled)
                    .forEach(r => {
                        resultText += `\n- ${r.selector}: ${r.element}`;
                    });
            }

            if (failureCount > 0) {
                resultText += '\n\nFailed:';
                results
                    .filter(r => !r.filled)
                    .forEach(r => {
                        resultText += `\n- ${r.selector}: ${r.reason}`;
                    });
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
            logger.error('FillForm failed', error);
            throw error;
        }
    },
};
