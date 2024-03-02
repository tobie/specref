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
    console.log("Loading and parsing " + filepath + "...");
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
    
    var actions = JSON.parse(input);
    var references = readBiblio(f);
    actions.forEach(function(action) {
        var k = action.id
        var ref = references[k];
        var type = action.action;

        if (type == "createAlias") { // Do this one first as there might not be any reference for it.
            console.log("Aliasing", k, "to", action.aliasOf);
            references[k] = { aliasOf: action.aliasOf };
        } else if (!ref) {           // Check reference exists before any of the others changes
            console.log("Can't find", k, "in", filepath, "when attempting action:", JSON.stringify(type));
        } else if (type == "delete") {
            console.log("Deleting", k);
            delete references[k];
        } else if (type == "renameTo") {
            console.log("Renaming", k, "to", action.newId);
            var oldRef = references[action.newId];
            references[action.newId] = ref;
            delete references[k];
            if (ref.versions) {
                Object.keys(ref.versions).forEach(function (version) {
                    references[k + "-" + version] = { aliasOf: action.newId + "-" + version };
                });
            }
            if (oldRef && oldRef.versions) {
                ref.versions = ref.versions || {};
                Object.keys(oldRef.versions).forEach(function (version) {
                    if (!(version in ref.versions)) {
                        ref.versions[version] = oldRef.versions[version];
                    }
                });
            }
        } else if (type == "replaceProp") {
            console.log("Replacing property in", k, "...");
            console.log("   ", action.prop + ":", JSON.stringify(ref[action.prop]), "->", JSON.stringify(action.value));
            ref[action.prop] = action.value;
        } else if (type == "deleteProp") {
            console.log("Deleting property in", k, "...");
            console.log("   ", action.prop + ": deleted");
            delete ref[action.prop];
        }
    });
    writeBiblio(f, references);
}
