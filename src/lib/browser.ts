import { chromium, Browser, Page } from 'playwright';

export class BrowserSession {
    private browser?: Browser;
    private page?: Page;

    async getPage(): Promise<Page> {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
        }
        if (!this.page) {
            this.page = await this.browser.newPage();
        }
        return this.page;
    }

    hasPage(): boolean {
        return !!this.page;
    }

    async close(): Promise<void> {
        await this.browser?.close();
    }
}
