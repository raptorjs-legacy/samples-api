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

server.use(restify.queryParser());
server.use(restify.jsonp());

function findItemsAdvanced(req, resp) {
    var keywords = req.params.keywords,
        categoryId = req.params.category,
        callback = req.params.callback;

    var url = 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=' + ebayAppId + '&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD';
    if (keywords) {
        url += '&keywords=' + encodeURIComponent(keywords);
    }
    if (categoryId) {
        url += '&categoryId=' + encodeURIComponent(categoryId);
    }

    request.get(url, function (error, findingResponse, findingBody) {
        var fail = function() {
            findingResponse.send(500, 'eBay finding API call failed');
        }

        if (!error && findingResponse.statusCode == 200) {
            var outputItems = [],
                items = JSON.parse(findingBody).findItemsAdvancedResponse[0].searchResult[0].item,
                item,
                i=0,
                len=items.length;

            for (; i<len; i++) {
                item = items[i];

                outputItems.push({
                    title: item.title[0],
                    viewItemURL: item.viewItemURL[0],
                    galleryURL: item.galleryURL[0]
                });
            }

            output = {
                items: outputItems
            }

            resp.send(output);
            
        }
        else {
            fail();
        }
    });
}

 server.get('/ebay/finding/keywords/:keywords/category/:category', function create(req, resp, next) {
    findItemsAdvanced(req, resp);
    return next();
 });

server.get('/ebay/finding/keywords/:keywords', function create(req, resp, next) {
    findItemsAdvanced(req, resp);
    return next();
});

server.get('/ebay/finding/category/:category', function create(req, resp, next) {
    findItemsAdvanced(req, resp);
    return next();
});

server.listen(port);

console.log("Server listening on port " + port);
console.log("Try: http://localhost:" + port + "/ebay/finding/keywords/nike");