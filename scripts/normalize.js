var fs = require('fs');
var FILE = './biblio.json';

console.log("Loadind and parsing " + FILE + "...");
var json = fs.readFileSync(FILE, 'utf8');
json = JSON.parse(json);

console.log("Sorting references...");

var output = Object.keys(json).sort(function(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase())
}).reduce(function(output, k) {
    output[k] = json[k];
    return output;
}, {});

console.log("Writing output to " + FILE + "...");
fs.writeFileSync(FILE, JSON.stringify(output, null, 4), 'utf8');