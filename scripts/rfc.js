var request = require('request'),
    runner = require('./run');
    
var current = runner.readBiblio();

var RFC_URL = "http://www.ietf.org/download/rfc-index.txt";

console.log("Fetching", RFC_URL + "...")
request(RFC_URL, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", RFC_URL + "...");
        return;
    }
    
    console.log("Parsing", RFC_URL + "...");
    getIndex(body).split(/\n\n/).map(toObj).filter(function(x) { return x; }).forEach(function(obj) {
        current["RFC" + obj.rfcNumber] = obj;
        current["rfc" + obj.rfcNumber] = { aliasOf: "RFC" + obj.rfcNumber };
    });

    current = runner.sortRefs(current);
    console.log("updating existing refs.")
    runner.writeBiblio(current);
});

function href(index) {
    return "http://www.ietf.org/rfc/rfc" + index + ".txt"
}

var LINE_BREAKS = /\s*\n\s*/g;
var RFC_NUMBER = /(\d{4,})\s+/;
var TITLE = /(.*?)\.\s+/;
var DATE = /(\.\s+)(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d\d?))?\s+(\d{4,})/
var STATUS = /\(Status:\s+([^\)]+)\)/;
var OTHER = /\((Obsoletes|Obsoleted by|Updates|Updated by)\s+((?:RFC\d{4,})(?:,\s*RFC\d{4,}))\)/;
function toObj(str) {
    str = str.trim().replace(LINE_BREAKS, " ");
    var output = {};
    
    var match = RFC_NUMBER.exec(str);
    if (!match) throw new Error("Missing RFC number.");
    output.rfcNumber = match[1];
    str = str.substr(match.index + match[0].length);
    
    output.href = href(output.rfcNumber);
    
    if (str == "Not Issued.") return null;
    
    match = TITLE.exec(str);
    if (!match) throw new Error("Missing title.");
    output.title = match[1];
    str = str.substr(match.index + match[0].length);
    
    match = DATE.exec(str);
    if (!match) throw new Error("Missing date.");
    output.authors = splitAuthorString(str.substr(0, match.index));
    output.rawDate = rawDate(match);
    str = str.substr(match.index + match[0].length);
    
    match = STATUS.exec(str);
    if (!match) throw new Error("Missing status." + str);
    output.status = match[1].split(" ").map(function(w) { return w[0] + w.substr(1).toLowerCase(); }).join(" ");
    
    while (match = OTHER.exec(str)) {
        str = str.substr(match[0].length + match.index);
        output[match[1].toLowerCase().replace(" by", "By")] = match[2].split(", ");
    }
    output.publisher = "IETF";
    output.source = RFC_URL;
    return output;
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

function rawDate(match) {
    var m = MONTHS.indexOf(match[2]) + 1;
    if (m < 1) throw new Error("Weird date.");
    var a = [match[4], pad(m)];
    if (match[3]) a.push(pad(match[3]));
    return a.join("-");
}

function pad(s) {
    s = s+"";
    return s.length === 2 ? s : "0" + s;
}

function splitAuthorString(str) {
    var output = [];
    var buffer = "";
    var ED = ", Ed.";
    var c;
    while (c = str[0]) {
        if (c != ",") {
            buffer += c;
            str = str.substr(1);
        } else {
            if (str.indexOf(ED) === 0) {
                buffer += ED;
                str = str.substr(ED.length + 2);
            } else {
                str = str.substr(2); // whitespace
            }
            output.push(buffer);
            buffer = "";
        }
    }
    if (buffer.length) output.push(buffer);
    return output;
}

function getIndex(body) {
    var body = body.split(/\n\n0001/);
    return "0001" + body[body.length - 1];
}