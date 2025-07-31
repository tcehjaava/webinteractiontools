import type { BrowserSession } from '../lib/browser.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../lib/logger.js';

const NAVIGATION_TIMEOUT = {
    DEFAULT: 30000,
    MIN: 1000,
    MAX: 120000,
} as const;

const DEFAULT_WAIT_UNTIL = 'domcontentloaded' as const;

const logger = new Logger('navigate');

export const navigateTool = {
    name: 'navigate',
    description: 'Navigate to a URL',
    inputSchema: {
        type: 'object' as const,
        properties: {
            url: {
                type: 'string',
                description: 'The URL to navigate to',
            },
            timeout: {
                type: 'number',
                description: `Navigation timeout in milliseconds (default: ${NAVIGATION_TIMEOUT.DEFAULT}ms)`,
                minimum: NAVIGATION_TIMEOUT.MIN,
                maximum: NAVIGATION_TIMEOUT.MAX,
                default: NAVIGATION_TIMEOUT.DEFAULT,
            },
            waitForSelector: {
                type: 'string',
                description:
                    'Optional CSS selector to wait for before considering navigation complete',
            },
            waitUntil: {
                type: 'string',
                description: `When to consider navigation succeeded (default: "${DEFAULT_WAIT_UNTIL}")`,
                enum: ['load', 'domcontentloaded', 'networkidle'],
                default: DEFAULT_WAIT_UNTIL,
            },
            headless: {
                type: 'boolean',
                description:
                    'Use headless browser mode (default: true). Set to false to show browser window',
                default: true,
            },
        },
        required: ['url'],
    },
    async handler(
        session: BrowserSession,
        args: {
            url: string;
            timeout?: number;
            waitForSelector?: string;
            waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
            headless?: boolean;
        }
    ): Promise<CallToolResult> {
        logger.info('Tool called', args);

        try {
            const headless = args.headless ?? true;
            const page = await session.getPage(headless);
            logger.debug('Page obtained');

            const timeout = args.timeout ?? 30000;
            const waitUntil = args.waitUntil ?? 'domcontentloaded';

            logger.info('Starting navigation', { timeout, waitUntil });

            await page.goto(args.url, {
                waitUntil: waitUntil as
                    | 'load'
                    | 'domcontentloaded'
                    | 'networkidle'
                    | 'commit',
                timeout: timeout,
            });
            logger.info('Navigation completed');

            if (args.waitForSelector) {
                logger.debug(`Waiting for selector: ${args.waitForSelector}`);
                try {
                    await page.waitForSelector(args.waitForSelector, {
                        timeout: Math.min(timeout / 2, 10000),
                    });
                    logger.debug('Selector found');
                } catch {
                    logger.warn(
                        `Selector "${args.waitForSelector}" not found, continuing`
                    );
                }
            }

            await page.waitForTimeout(2000);
            logger.debug('Additional stabilization wait completed');

            const title = await page.title();
            const currentUrl = page.url();

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Navigated to ${currentUrl}\nPage title: ${title}`,
                    },
                ],
            };
        } catch (error) {
            logger.error('Navigation failed', error);
            throw error;
        }
    },
};
