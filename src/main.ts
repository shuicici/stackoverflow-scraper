import { Dataset, Actor, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

interface Input {
    query: string;
    limit?: number;
}

async function main() {
    await Actor.init();
    const input = await Actor.getInput<Input>() as Input;
    if (!input?.query) throw new Error('Query required');
    
    const url = `https://stackoverflow.com/jobs?q=${encodeURIComponent(input.query)}`;
    
    const crawler = new PlaywrightCrawler({
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: 90,
        requestHandler: async ({ page }) => {
            await page.waitForSelector('.job-results', { timeout: 30000 }).catch(() => {});
            
            const jobs = await page.evaluate(() => {
                const items: any[] = [];
                document.querySelectorAll('.job-card').forEach((card: any) => {
                    items.push({
                        title: card.querySelector('.job-title')?.textContent?.trim(),
                        company: card.querySelector('.company-name')?.textContent?.trim(),
                        location: card.querySelector('.location')?.textContent?.trim(),
                        salary: card.querySelector('.salary')?.textContent?.trim(),
                        tags: Array.from(card.querySelectorAll('.post-tag')).map((t: any) => t.textContent?.trim()),
                        link: 'https://stackoverflow.com' + card.querySelector('.job-title')?.getAttribute('href')
                    });
                });
                return items;
            });
            
            await Dataset.pushData({ query: input.query, count: jobs.length, jobs });
            log.info(`Found ${jobs.length} jobs`);
        }
    });
    
    await crawler.run([{ url }]);
    await Actor.exit();
}
main().catch(e => { console.error(e); process.exit(1); });
