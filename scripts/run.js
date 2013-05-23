var fs = require('fs');
var FILE = './biblio.json';
var moduleName = process.argv[2];
var fn = require(moduleName);

console.log("Loadind and parsing " + FILE + "...");
var input = fs.readFileSync(FILE, 'utf8');
input = JSON.parse(input);
var keys = Object.keys(input);
var output = {};

function next() {
    var k;
    if (keys.length) {
        k = keys.shift();
        fn(k, input[k], input, output, function(err) {
            if (err) throw err;
            next();
        });
    } else {
        output = sortRefs(output);
        writeToFile(output)
    }
}

function sortRefs(input) {
    console.log("Sorting references...");
    var output = {};
    Object.keys(input).sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    }).forEach(function(k) {
        output[k] = input[k];
    });
    return output;
}

function writeToFile(obj) {
    console.log("Writing output to " + FILE + "...");
    fs.writeFileSync(FILE, JSON.stringify(obj, null, 4), 'utf8');
}

console.log("Applying module", moduleName);
next();
