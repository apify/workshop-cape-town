const Apify = require('apify');
const tools = require('./tools');
const { REQUEST_LABELS } = require('./consts');


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
        launchPuppeteerOptions: { slowMo: 0, headless: true },

        // Stop crawling after several pages
        maxRequestsPerCrawl: 1000,

        // Limit the concurrency
        maxConcurrency: 100,

        // This function will be called for each URL to crawl.
        // Here you can write the Puppeteer scripts you are familiar with,
        // with the exception that browsers and pages are automatically managed by the Apify SDK.
        // The function accepts a single parameter, which is an object with the following fields:
        // - request: an instance of the Request class with information such as URL and HTTP method
        // - page: Puppeteer's Page object (see https://pptr.dev/#show=api-class-page)
        handlePageFunction: async ({ request, page }) => {
            console.log(`Processing ${request.url} (label: ${request.userData.label})`);

            await tools.enqueueTitles(page, requestQueue);
            await tools.enqueueSearches(page, requestQueue);

            if (request.userData.label === REQUEST_LABELS.TITLE) {
                await Apify.utils.puppeteer.injectJQuery(page);

                const data = await page.evaluate(tools.extractActorData);
                data.url = request.url;
                data.reviews = await tools.handleReviews(page, request);
                await Apify.pushData({ data });
            }
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
