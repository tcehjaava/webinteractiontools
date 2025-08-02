import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const logger = new Logger('executeJavaScript');

export const executeJavaScriptTool = {
    name: 'executeJavaScript',
    description: `Execute JavaScript code on the current page. Returns the result of the expression.
    
Usage notes:
- For object literals, wrap in parentheses: ({ key: 'value' })
- For multi-line code, use IIFE: (() => { /* code */ return result; })()
- Variable declarations return undefined - explicitly return values
- Async/Promise operations will return undefined - use synchronous alternatives
- Results are automatically JSON stringified when possible`,
    inputSchema: {
        type: 'object' as const,
        properties: {
            code: {
                type: 'string',
                description: 'JavaScript code to execute. Can be an expression or statement(s).',
            },
        },
        required: ['code'],
    },
    async handler(
        session: BrowserSession,
        args: { code: string }
    ): Promise<CallToolResult> {
        logger.info('ExecuteJavaScript called', args);

        try {
            const page = await session.getPage();
            logger.debug('Page obtained');

            const result = await page.evaluate((code) => {
                try {
                    const fn = new Function('return ' + code);
                    const result = fn();
                    return {
                        success: true,
                        result: result,
                        type: typeof result,
                    };
                } catch {
                    try {
                        const fn = new Function(code);
                        const result = fn();
                        return {
                            success: true,
                            result: result,
                            type: typeof result,
                        };
                    } catch (innerError) {
                        return {
                            success: false,
                            error: innerError instanceof Error ? innerError.message : String(innerError),
                        };
                    }
                }
            }, args.code);

            logger.debug('JavaScript execution result', result);

            if (!result.success) {
                throw new Error(`JavaScript execution failed: ${result.error}`);
            }

            let resultText = 'Execution completed';

            if (result.result !== undefined && result.result !== null) {
                if (typeof result.result === 'object') {
                    try {
                        resultText = `Result (${result.type}):\n${JSON.stringify(result.result, null, 2)}`;
                    } catch {
                        resultText = `Result (${result.type}): [object - cannot stringify]`;
                    }
                } else {
                    resultText = `Result (${result.type}): ${String(result.result)}`;
                }
            } else {
                resultText = `Result: ${result.result}`;
            }

            logger.info('ExecuteJavaScript completed');

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText,
                    },
                ],
            };
        } catch (error) {
            logger.error('ExecuteJavaScript failed', error);
            throw error;
        }
    },
};
