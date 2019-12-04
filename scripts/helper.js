var fs = require('fs');
var path = require('path');
var request = require('request');

var DIR_PATH = path.join(__dirname, "..", "refs");
var OW_PATH = path.join(__dirname, "..", "overwrites");
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
    f = f || DEFAULT_FILE;
    var filepath = path.join(DIR_PATH, f);
    console.log("Writing output to " + filepath + "...");
    fs.writeFileSync(filepath, JSON.stringify(obj, null, 4) + "\n", 'utf8');
}

exports.tryOverwrite = tryOverwrite;
function tryOverwrite(f) {
    f = f || DEFAULT_FILE;
    var filepath = path.join(DIR_PATH, f);
    var filepath_ow = path.join(OW_PATH, f);
    try {
        var input = fs.readFileSync(filepath_ow, 'utf8');
        console.log("Found overwrite file for", f, "at", filepath_ow);
        console.log("Loading " + filepath_ow + "...");
    } catch(e) {
        console.log("No overwrite file for", f, "at", filepath_ow);
        return;
    }
    console.log("Parsing " + filepath_ow + "...");
    var json = JSON.parse(input);
    var references = readBiblio(f);
    Object.keys(json).forEach(function (k) {
        var ref = references[k];
        var ow = json[k];
        if (ref) {
            var ow = json[k];
            if (ow.delete) {
                delete references[k];
                console.log("Deleted", k);
            } else if (ow.renameTo) {
                references[ow.renameTo] = ref;
                delete references[k];
                console.log("Renamed", k, "to", ow.renameTo);

                if (ow.aliasOf && ow.aliasOf.replaceWith) {
                    console.log("Overwriting", k, "...");
                    console.log("   ", "aliasOf:", undefined, "->", JSON.stringify(ow.aliasOf.replaceWith));
                    references[k] = { aliasOf: ow.aliasOf.replaceWith };
                }
            } else {
                console.log("Overwriting", k, "...");
                Object.keys(ow).forEach(function(prop) {
                    if (ow[prop].replaceWith) {
                        console.log("   ", prop + ":", JSON.stringify(ref[prop]), "->", JSON.stringify(ow[prop].replaceWith));
                        ref[prop] = ow[prop].replaceWith;
                    } else if (ow[prop].delete) {
                        console.log("   ", prop + ": deleted");
                        delete ref[prop];
                    }
                });
            }
        } else {
            console.log("Can't find", k, "in", filepath );
        }
    });
    writeBiblio(f, references);
}
