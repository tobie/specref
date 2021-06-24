#!/usr/bin/env node
var request = require('request'),
    userAgent =require("./user-agent"),
    helper = require('./helper'),
    xml2js = require('xml2js');

var RFC_URL = "https://www.rfc-editor.org/in-notes/rfc-index.xml";
var FILE = "ietf.json";

var current = helper.readBiblio(FILE);

var parser = new xml2js.Parser();
console.log("Updating IETF references...");
console.log("Fetching", RFC_URL + "...");
request({
    url: RFC_URL,
    headers: {
        'User-Agent': userAgent()
    }
}, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", RFC_URL + ".");
        return;
    }
    
    console.log("Parsing", RFC_URL + "...");
    parser.parseString(body, function (err, result) {
        result["rfc-index"]["rfc-entry"].map(formatData).forEach(function(obj) {
            var id = obj.rfcNumber.toLowerCase();
            var unpadded = unpad(id);
            current[id] = obj;
            if (unpadded !== id) {
                current[unpadded] = { aliasOf: id };
            }
        });
    });
    current = helper.sortRefs(current);
    console.log("updating existing refs.")
    helper.writeBiblio(FILE, current);
    helper.tryOverwrite(FILE);
});


function href(index) {
    return "https://datatracker.ietf.org/doc/html/" + unpad(index);
}

function unpad(index) {
    return index.replace(/(rfc)0*(\d+)/i, "$1$2");
}

var MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

function formatData(obj) {
    // could also store abstract.
    var output = {};
    output.rfcNumber = obj["doc-id"][0];
    output.href = href(output.rfcNumber);
    output.title = obj["title"][0];
    output.authors = obj["author"].map(function(a) {
        var str = a.name[0], title = a.title && a.title[0];
        if (title) {
            if (title == "Editor" || title == "Editors") {
                str += ", Ed.";
            } else if (title == "WG Chair" || title == "Chair") {
                str += ", Chair";
            } else {
                throw new Error("Unexpected author title: " + title);
            }
        } 
        return str;
    });
    var date = [obj["date"][0].year[0], pad(MONTHS.indexOf(obj["date"][0].month[0]) + 1)];
    if (obj["date"][0].day) date.push(pad(obj["date"][0].day[0]));
    output.rawDate = date.join("-");
    output.status = obj["current-status"][0].split(" ").map(function(w) { return w[0] + w.substr(1).toLowerCase(); }).join(" ");
    if (obj["updated-by"]) output.updatedBy = unique(obj["updated-by"][0]["doc-id"]);
    if (obj["obsoleted-by"]) output.obsoletedBy = obj["obsoleted-by"][0]["doc-id"];
    if (obj["updates"]) output.updates = obj["updates"][0]["doc-id"];
    if (obj["obsoletes"]) output.obsoletes = obj["obsoletes"][0]["doc-id"];
    if (obj["see-also"]) output.seeAlso = obj["see-also"][0]["doc-id"];
    if (obj["errata-url"]) output.hasErrata = obj["errata-url"][0];
    output.publisher = "IETF";
    output.source = RFC_URL;
    return output;
}

function pad(s) {
    s = s+"";
    return s.length === 2 ? s : "0" + s;
}

function unique(arr) {
    var output = [];
    arr.forEach(function(item) {
        if (output.indexOf(item) < 0) output.push(item);
    })
    return output;
}
