var request = require('request');
var TR_URL = "https://www.w3.org/TR/";
var TR_URL_HTTP = "http://www.w3.org/TR/";

exports.getURL = getURL;
function getURL(shortName, options, cb) {
    request(TR_URL + shortName, function (error, response, body) {
        if (error) {
            cb(error);
        } else if (response.statusCode == 200) {
            cb(null, response.request.uri.href);
        } else if (options.isNote) {
            request(TR_URL + "NOTE-" + shortName, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    cb(null, response.request.uri.href);
                } else {
                    cb(error || new Error("Can't find '" + shortName + "' NOTE on TR."));
                }
            });
        } else {
            cb(new Error("Can't find shortname '" + shortName + "' spec on TR."));
        }
    });
}

exports.parseURL = parseURL;
function parseURL(url) {
    var output = null;
    url = url || '';
    if (((url.indexOf(TR_URL) === 0) || (url.indexOf(TR_URL_HTTP) === 0)) && url != "http://www.w3.org/TR/1999/WAI-WEBCONTENT-19990505") {
        var items = url.replace(TR_URL, "").split("/");
        if (/^\d{4}$/.test(items[0])) {
            output = {};
            items = items[1].split('-');
            output.status = items.shift();
            output.date = items.pop();
            output.shortName = items.join('-');
        }
    }
    return output;
}
