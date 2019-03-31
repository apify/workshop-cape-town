const Apify = require('apify');

const REQUEST_LABELS = {
    START_URL: 'START_URL',
    SEARCH: 'SEARCH',
    TITLE: 'TITLE',
};

const SEARCH_PURLS = ['https://www.imdb.com/search/title[.*]'];
const TITLE_PURLS = ['https://www.imdb.com/title/[.*]'];

Apify.main(async () => {
    // Apify.openRequestQueue() is a factory to get a preconfigured RequestQueue instance.
    const requestQueue = await Apify.openRequestQueue();

    // Enqueue the first URL.
    await requestQueue.addRequest({
        url: 'https://www.imdb.com/feature/genre/',
        userData: { label: REQUEST_LABELS.START_URL },
    });

    // Create an instance of the PuppeteerCrawler class - a crawler
    // that automatically loads the URLs in headless Chrome / Puppeteer.
    const crawler = new Apify.PuppeteerCrawler({
        // The crawler will be recursively calling handlePageFunction for each of the requests
        // as long as there is a unhandled request.
        requestQueue,

        // Here you can set options that are passed to the Apify.launchPuppeteer() function.
        // For example, you can set "slowMo" to slow down Puppeteer operations to simplify debugging
        launchPuppeteerOptions: { slowMo: 500, headless: true },

        // Stop crawling after several pages
        maxRequestsPerCrawl: 1000,

        // Limit the concurrency
        maxConcurrency: 1,

        // This function will be called for each URL to crawl.
        // Here you can write the Puppeteer scripts you are familiar with,
        // with the exception that browsers and pages are automatically managed by the Apify SDK.
        // The function accepts a single parameter, which is an object with the following fields:
        // - request: an instance of the Request class with information such as URL and HTTP method
        // - page: Puppeteer's Page object (see https://pptr.dev/#show=api-class-page)
        handlePageFunction: async ({ request, page }) => {
            console.log(`Processing ${request.url} (label: ${request.userData.label})`);

            // Enqueue the titles.
            await Apify.utils.enqueueLinks({
                page,
                requestQueue,
                pseudoUrls: TITLE_PURLS,
                selector: 'a',
                userData: {
                    label: REQUEST_LABELS.TITLE,
                },
            });

            // Enqueue searches.
            await Apify.utils.enqueueLinks({
                page,
                requestQueue,
                pseudoUrls: SEARCH_PURLS,
                selector: 'a',
                userData: {
                    label: REQUEST_LABELS.SEARCH,
                },
            });

            let data;

            if (request.userData.label === REQUEST_LABELS.TITLE) {
                await Apify.utils.puppeteer.injectJQuery(page);

                data = await page.evaluate(() => {
                    // Extract an array of movie actors.
                    const starsWrapperEl = $('h4:contains("Stars:")').parent();
                    const starsElements = starsWrapperEl.find('a').toArray();
                    const stars = starsElements.map((el) => $(el).text());

                    // Extract additional data and return them as an object.
                    return {
                        title: $('h1').text(),
                        director: $('h4:contains("Director:"),h4:contains("Directors:")').next().text(),
                        writers: $('h4:contains("Writer:"),h4:contains("Writers:")').next().text(),
                        stars,
                        rating: $('span[itemprop="ratingValue"]').text()
                    };
                });
                data.url = request.url;
                data.reviews = [];

                const reviewsButtonHandle = await page.$('.titleReviewBar .titleReviewbarItemBorder a:first-child');
                if (reviewsButtonHandle) {
                    request.userData.hasReviewsButton = true;
                    await reviewsButtonHandle.click();
                    await page.waitForNavigation({
                        waitUntil: 'domcontentloaded',
                    });
                    const reviews = await page.$$eval('.imdb-user-review', (elements) => {
                        return elements.map((el) => {
                            const ratingEl = el.querySelector('.rating-other-user-rating');
                            const commentEl = el.querySelector('.content .text');
                            if (!ratingEl || !commentEl) return;

                            return {
                                rating: ratingEl.innerText,
                                comment: commentEl.innerText,
                            };
                        });
                    });

                    data.reviews = reviews.filter(review => !!review);
                }
            }

            await Apify.pushData({
                '#request': request,
                data,
            });
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed too many times`);

            await Apify.pushData({
                '#request': request,
                '#error': error,
            });
        },
    });

    // Run the crawler and wait for it to finish.
    await crawler.run();

    console.log('Crawler finished.');
});
