var fs = require('fs');
var FILE = './biblio.json';
var moduleNames = process.argv.slice(2);
var functions = moduleNames.map(require);

console.log("Loadind and parsing " + FILE + "...");
var input = fs.readFileSync(FILE, 'utf8');
input = JSON.parse(input);

var fn, output = {};
while(functions.length) {
    fn = functions.shift();
    console.log("Applying module", moduleNames.shift());
    Object.keys(input).forEach(function(k) {
        fn(k, input[k], input, output);
    });
    input = output;
    output = {};
}

console.log("Sorting references...");

Object.keys(input).sort(function(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}).forEach(function(k) {
    output[k] = input[k];
});

console.log("Writing output to " + FILE + "...");
fs.writeFileSync(FILE, JSON.stringify(output, null, 4), 'utf8');