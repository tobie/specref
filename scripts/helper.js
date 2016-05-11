var fs = require('fs');
var path = require('path');
var request = require('request');

var DIR_PATH = path.join(__dirname, "..", "refs");
var DEFAULT_FILE = "biblio.json";
var TR_URL = "http://www.w3.org/TR/";

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
    if (url.indexOf(TR_URL) === 0 && url != "http://www.w3.org/TR/1999/WAI-WEBCONTENT-19990505") {
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

exports.readBiblio = readBiblio;
function readBiblio(f) {
    var filepath = path.join(DIR_PATH, f || DEFAULT_FILE);
    console.log("Loadind and parsing " + filepath + "...");
    var input = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(input);
}

exports.sortRefs = sortRefs;
function sortRefs(input) {
    console.log("Sorting references...");
    var output = {};
    Object.keys(input).sort().forEach(function(k) {
        output[k] = input[k];
    });
    return output;
}

exports.writeBiblio = writeBiblio;
function writeBiblio(f, obj) {
    if (!obj) {
        obj = f;
        f = DEFAULT_FILE;
    }
    var filepath = path.join(DIR_PATH, f);
    console.log("Writing output to " + filepath + "...");
    fs.writeFileSync(filepath, JSON.stringify(obj, null, 4) + "\n", 'utf8');
}
