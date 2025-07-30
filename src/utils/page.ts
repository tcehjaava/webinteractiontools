import type { Page } from 'playwright';

export interface PageDimensions {
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
}

export interface PageMetadata {
    title: string;
    url: string;
    dimensions: {
        scrollWidth: number;
        scrollHeight: number;
        viewportWidth: number;
        viewportHeight: number;
    };
    meta: {
        description?: string;
        keywords?: string;
        author?: string;
        viewport?: string;
    };
}

export async function getPageDimensions(page: Page): Promise<PageDimensions> {
    const dimensions = await page.evaluate(() => {
        const doc = (globalThis as any).document;
        const win = (globalThis as any).window;
        return {
            width: doc.documentElement.scrollWidth,
            height: doc.documentElement.scrollHeight,
            viewportWidth: win.innerWidth,
            viewportHeight: win.innerHeight,
        };
    });

    console.log(`Page dimensions: ${JSON.stringify(dimensions)}`);
    return dimensions;
}

export async function getPageMetadata(page: Page): Promise<PageMetadata> {
    return await page.evaluate(() => {
        const doc = (globalThis as any).document;
        const win = (globalThis as any).window;
        return {
            title: doc.title,
            url: win.location.href,
            dimensions: {
                scrollWidth: doc.documentElement.scrollWidth,
                scrollHeight: doc.documentElement.scrollHeight,
                viewportWidth: win.innerWidth,
                viewportHeight: win.innerHeight,
            },
            meta: {
                description:
                    doc
                        .querySelector('meta[name="description"]')
                        ?.getAttribute('content') || undefined,
                keywords:
                    doc
                        .querySelector('meta[name="keywords"]')
                        ?.getAttribute('content') || undefined,
                author:
                    doc
                        .querySelector('meta[name="author"]')
                        ?.getAttribute('content') || undefined,
                viewport:
                    doc
                        .querySelector('meta[name="viewport"]')
                        ?.getAttribute('content') || undefined,
            },
        };
    });
}

export async function extractPageText(
    page: Page,
    maxLength: number = 0
): Promise<string> {
    const textContent = await page.evaluate(() => {
        const doc = (globalThis as any).document;
        const walker = doc.createTreeWalker(
            doc.body,
            (globalThis as any).NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node: any) => {
                    const parent = node.parentElement;
                    if (!parent)
                        return (globalThis as any).NodeFilter.FILTER_REJECT;

                    const tagName = parent.tagName.toLowerCase();
                    if (['script', 'style', 'noscript'].includes(tagName)) {
                        return (globalThis as any).NodeFilter.FILTER_REJECT;
                    }

                    const text = node.textContent?.trim();
                    if (!text)
                        return (globalThis as any).NodeFilter.FILTER_REJECT;

                    return (globalThis as any).NodeFilter.FILTER_ACCEPT;
                },
            }
        );

        const texts: string[] = [];
        let node;
        while ((node = walker.nextNode())) {
            const text = node.textContent?.trim();
            if (text) {
                texts.push(text);
            }
        }

        return texts.join(' ').replace(/\s+/g, ' ');
    });

    if (maxLength > 0 && textContent.length > maxLength) {
        return textContent.substring(0, maxLength) + '...';
    }

    return textContent;
}
