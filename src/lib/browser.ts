import { chromium, Browser, Page } from 'playwright';

export class BrowserSession {
    private browser?: Browser;
    private page?: Page;
    private currentHeadlessMode: boolean = true;

    async getPage(headless?: boolean): Promise<Page> {
        // If headless is not specified, use the current mode
        const useHeadless = headless !== undefined ? headless : this.currentHeadlessMode;
        
        if (!this.browser || this.currentHeadlessMode !== useHeadless) {
            if (this.browser) {
                await this.browser.close();
                this.page = undefined; // Clear page reference to prevent memory leak
            }
            this.browser = await chromium.launch({ headless: useHeadless });
            this.currentHeadlessMode = useHeadless;
            this.page = undefined;
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
        this.page = undefined;
        await this.browser?.close();
        this.browser = undefined;
    }
}
