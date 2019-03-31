const Apify = require('apify');

exports.REQUEST_LABELS = {
    START_URL: 'START_URL',
    SEARCH: 'SEARCH',
    TITLE: 'TITLE',
};

exports.SEARCH_PURL = new Apify.PseudoUrl('https://www.imdb.com/search/title[.*]');
exports.TITLE_PURL = new Apify.PseudoUrl('https://www.imdb.com/title/[\\w*/?]');
