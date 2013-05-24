var fs = require('fs');
var FILE = './biblio.json';

var json = fs.readFileSync(FILE, 'utf8');
json = JSON.parse(json);
var keys = Object.keys(json);

var output = [];
keys.forEach(function(key) {
    output.push(key);
    var value = json[key];
    if (typeof value == "object" && json.previousVersions) {
        Object.keys(json.previousVersions).forEach(function(k) {
            output.push(key + "-" + k);
        });
    }
})

output.sort(function(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
});

console.log(JSON.stringify(output, null, 4));
