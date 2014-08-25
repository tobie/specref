var fs = require('fs');
var FILE = './biblio.json';
var moduleName = process.argv[2];
var fn = moduleName ? require(moduleName) : noop;

function noop(k, v, input, output, cb) {
    output[k] = v;
    cb(null);
}

exports.readBiblio = readBiblio;
function readBiblio() {
    console.log("Loadind and parsing " + FILE + "...");
    var input = fs.readFileSync(FILE, 'utf8');
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
function writeBiblio(obj) {
    console.log("Writing output to " + FILE + "...");
    fs.writeFileSync(FILE, JSON.stringify(obj, null, 4) + "\n", 'utf8');
}

function next(keys, input, output) {
    var k;
    if (keys.length) {
        k = keys.shift();
        fn(k, input[k], input, output, function(err) {
            if (err) throw err;
            setImmediate(function() {
                next(keys, input, output);
            });
        });
    } else {
        output = sortRefs(output);
        writeBiblio(output)
    }
}
if (require.main === module) {
    var input = readBiblio();
    if (moduleName) console.log("Applying module", moduleName);
    next(Object.keys(input), input, {});
}

