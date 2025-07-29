import { chromium } from 'playwright';

async function simpleTest() {
    console.log('Testing Playwright directly...');

    try {
        const browser = await chromium.launch({ headless: true });
        console.log('Browser launched');

        const page = await browser.newPage();
        console.log('Page created');

        await page.goto('https://example.com', {
            waitUntil: 'domcontentloaded',
        });
        console.log('Navigated to example.com');

        const title = await page.title();
        console.log('Page title:', title);

        await browser.close();
        console.log('Browser closed');
    } catch (error) {
        console.error('Error:', error);
    }
}

simpleTest();
