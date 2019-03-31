const Apify = require('apify');
const { REQUEST_LABELS, SEARCH_PURL, TITLE_PURL } = require('./consts');

exports.extractActorData = () => {
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
};

exports.handleReviews = async (page, request) => {
    const reviewsButtonHandle = await page.$('.titleReviewBar .titleReviewbarItemBorder a:first-child');
    if (!reviewsButtonHandle) return;

    request.userData.hasReviewsButton = true;
    await reviewsButtonHandle.click();
    await page.waitForNavigation({
        waitUntil: 'domcontentloaded',
    });
    const reviews = await page.$$eval('.imdb-user-review', extractReviews);

    return reviews.filter(review => !!review);
};

function extractReviews(elements) {
    return elements.map((el) => {
        const ratingEl = el.querySelector('.rating-other-user-rating');
        const commentEl = el.querySelector('.content .text');
        if (!ratingEl || !commentEl) return;

        return {
            rating: ratingEl.innerText,
            comment: commentEl.innerText,
        };
    });
}

exports.enqueueTitles = async (page, requestQueue) => {
    const urls = await page.$$eval('a', (links) => {
        return links
            .map(link => link.href)
            .filter(href => !!href)
            .map(url => url.split('?')[0]);
    });

    const titleUrls = urls.filter(url => TITLE_PURL.matches(url));

    for (let url of titleUrls) {
        const request = new Apify.Request({
            url,
            userData: {
                label: REQUEST_LABELS.TITLE,
            },
        });

        await requestQueue.addRequest(request, { forefront: true });
    }
};

exports.enqueueSearches = async (page, requestQueue) => {
    return Apify.utils.enqueueLinks({
        page,
        requestQueue,
        pseudoUrls: [SEARCH_PURL],
        selector: 'a',
        userData: {
            label: REQUEST_LABELS.SEARCH,
        },
    });
};
