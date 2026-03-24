"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apify_1 = require("apify");
const crawlee_1 = require("crawlee");
async function main() {
    await apify_1.Actor.init();
    const input = await apify_1.Actor.getInput();
    if (!input?.query)
        throw new Error('Query required');
    const url = `https://stackoverflow.com/jobs?q=${encodeURIComponent(input.query)}`;
    const crawler = new crawlee_1.PlaywrightCrawler({
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: 90,
        requestHandler: async ({ page }) => {
            await page.waitForSelector('.job-results', { timeout: 30000 }).catch(() => { });
            const jobs = await page.evaluate(() => {
                const items = [];
                document.querySelectorAll('.job-card').forEach((card) => {
                    items.push({
                        title: card.querySelector('.job-title')?.textContent?.trim(),
                        company: card.querySelector('.company-name')?.textContent?.trim(),
                        location: card.querySelector('.location')?.textContent?.trim(),
                        salary: card.querySelector('.salary')?.textContent?.trim(),
                        tags: Array.from(card.querySelectorAll('.post-tag')).map((t) => t.textContent?.trim()),
                        link: 'https://stackoverflow.com' + card.querySelector('.job-title')?.getAttribute('href')
                    });
                });
                return items;
            });
            await apify_1.Dataset.pushData({ query: input.query, count: jobs.length, jobs });
            apify_1.log.info(`Found ${jobs.length} jobs`);
        }
    });
    await crawler.run([{ url }]);
    await apify_1.Actor.exit();
}
main().catch(e => { console.error(e); process.exit(1); });
