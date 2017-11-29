#!/usr/bin/env node
var helper = require('./helper');
var moduleName = process.argv[2];
var fn = moduleName ? require(moduleName) : noop;
var FILE = process.argv[3];

function noop(k, v, input, output, cb) {
    output[k] = v;
    cb(null);
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
        output = helper.sortRefs(output);
        helper.writeBiblio(FILE, output)
    }
}
if (require.main === module) {
    var input = helper.readBiblio(FILE);
    if (moduleName) console.log("Applying module", moduleName);
    next(Object.keys(input), input, {});
}

