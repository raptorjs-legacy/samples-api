var restify = require('restify');
var request = require('request');
var fs = require('fs');
var port = process.env.PORT || 5000;


var ebayAppId = process.env.eBay_AppID;
if (!ebayAppId) {
    if (!fs.existsSync('local.json')) {
        console.error('local.json not found in current working directory. See local-sample.json for example of what this file should contain.');
        return;
    }

    var localProps = JSON.parse(fs.readFileSync('local.json'));
    ebayAppId = localProps.ebay.AppID;

    if (!ebayAppId) {
        console.error('ebay.AppID not defined in local.json');
        return;
    }
}

var server = restify.createServer({
    name: 'raptorjs-samples-api',
});

server.use(restify.queryParser()); // Required to make query string parameters available in the req.params object
server.use(restify.jsonp()); // Enable JSONP detection (?callback=?)

function findItemsAdvanced(req, resp, next) {
    var keywords = req.params.keywords,
        categoryId = req.params.category;

    var url = 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=' + ebayAppId + '&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD';
    if (keywords) {
        url += '&keywords=' + encodeURIComponent(keywords);
    }
    if (categoryId) {
        url += '&categoryId=' + encodeURIComponent(categoryId);
    }

    var startTime = new Date().getTime();
    request.get(url, function (error, findingResponse, findingBody) {
        var fail = function(message) {
            resp.send(500, message || 'eBay finding API call failed');
            return next();
        }

        if (!error && findingResponse.statusCode == 200) {
            console.log('Request to "' + url + '" completed in ' + (new Date().getTime() - startTime) + 'ms');
            console.log('Response body:\n', findingBody + '\n\n');

            try {
                // Massage the data that comes from the origin eBay service
                var outputItems = [],
                    items = JSON.parse(findingBody).findItemsAdvancedResponse[0].searchResult[0].item,
                    item,
                    i=0,
                    len=items.length;

                for (; i<len; i++) {
                    item = items[i];

                    if (item.galleryURL && item.title && item.viewItemURL) {
                        outputItems.push({
                            title: item.title[0],
                            viewItemURL: item.viewItemURL[0],
                            galleryURL: item.galleryURL[0]
                        });
                    }
                }

                output = {
                    items: outputItems
                }
            }
            catch(e) {
                console.error(e + ". Stack trace:\n", e.stack);
                fail(e.toString());
            }


            resp.send(output);
            return next();
        }
        else {
            fail();
        }

    });
}

server.get('/ebay/finding/keywords/:keywords/category/:category', findItemsAdvanced);
server.get('/ebay/finding/keywords/:keywords', findItemsAdvanced);
server.get('/ebay/finding/category/:category', findItemsAdvanced);

server.listen(port);

console.log("Server listening on port " + port);
console.log("Try: http://localhost:" + port + "/ebay/finding/keywords/nike");

