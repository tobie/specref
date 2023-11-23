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

// From https://github.com/httpwg/httpwg.github.io/tree/main/specs
// JSON.stringify([...new Set(
//   [...document.querySelectorAll('div[title^=rfc]')]
//     .map(el => el.getAttribute('title').replace(/\..*$/, '')).sort()
// )], null, 4);
var HTTP_SPECS = [
    "rfc2818",
    "rfc5789",
    "rfc5861",
    "rfc6265",
    "rfc6266",
    "rfc6585",
    "rfc7230",
    "rfc7231",
    "rfc7232",
    "rfc7233",
    "rfc7234",
    "rfc7235",
    "rfc7538",
    "rfc7540",
    "rfc7541",
    "rfc7615",
    "rfc7616",
    "rfc7617",
    "rfc7639",
    "rfc7694",
    "rfc7725",
    "rfc7838",
    "rfc8144",
    "rfc8164",
    "rfc8188",
    "rfc8246",
    "rfc8288",
    "rfc8297",
    "rfc8336",
    "rfc8441",
    "rfc8470",
    "rfc8941",
    "rfc9110",
    "rfc9111",
    "rfc9112",
    "rfc9113",
    "rfc9114",
    "rfc9204",
    "rfc9205",
    "rfc9209",
    "rfc9211",
    "rfc9213",
    "rfc9218",
    "rfc9220",
    "rfc9412",
    "rfc9440"
];

function href(index) {
    index = index.toLowerCase();
    if (HTTP_SPECS.indexOf(index) > -1) {
        return "https://httpwg.org/specs/" + index + ".html";
    }
    if (index.indexOf("bcp") == 0) {
        return "https://www.rfc-editor.org/info/" + unpad(index);
    }
    return "https://www.rfc-editor.org/rfc/" + unpad(index);
}

function unpad(index) {
    return index.replace(/(rfc|bcp)0*(\d+)/i, "$1$2");
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
