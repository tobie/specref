var fs = require('fs');
var json = require('../lib/bibref').all;
var keys = Object.keys(json);

var output = [];
keys.forEach(function(key) {
    output.push(key);
    var value = json[key];
    if (typeof value == "object" && json.versions) {
        Object.keys(json.versions).forEach(function(k) {
            output.push(key + "-" + k);
        });
    }
})

output.sort(function(a, b) { return a.localeCompare(b); });

var FILE = "./test/ref-list.json"
console.log("Writing output to " + FILE + "...");
require('fs').writeFileSync(FILE, JSON.stringify(output, null, 4), 'utf8');