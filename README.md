# Cape Town workshop - Building IMDB.com crawler

## Prerequisites

* Install [Node.js](https://nodejs.org/en/) - https://nodejs.org/en/download/
* Check that Node.js versino is above 8.x `node --version`
* Ensure that [NPM](https://www.npmjs.com) is working `npm --version`
* Install [Apify CLI](https://apify.com/docs/cli) `npm install -g apify-cli`

## Create project

* Call `apify create my-project` and select *Puppeteer crawler template
* Go to project directory `cd my-project`

## Run project

* Call `apify run -p` to start, you can stop using `CMD+c`. (Parameter `-p` purges existing request queue and dataset so that the scripts starts from the begining)

## Utilities

* Code that injects [jQuery](http://jquery.com/) into a page 

```javascript
(function() {
    function l(u, i) {
        var d = document;
        if (!d.getElementById(i)) {
            var s = d.createElement('script');
            s.src = u;
            s.id = i;
            d.body.appendChild(s);
        }
    }
    l('//code.jquery.com/jquery-3.2.1.min.js', 'jquery')
})()
```

## Resources

* [Apify SDK](http://sdk.apify.com)
* [Puppeteer](https://pptr.dev/)
* [jQuery](http://jquery.com/)
* [Apify CLI](https://apify.com/docs/cli)
