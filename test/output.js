var assert = require('assert');
var bibref = require('../lib/bibref');
var json = bibref.all;
var tv4 = require("tv4");
var pointer = require("json-pointer");
var formats = require('tv4-formats');

function wrap(id) {
    return '[[' + id + ']]';
}

function displayErr(err, obj, output) {
    output.push("* " + err.message.trim());
    JSON.stringify(pointer.get(obj, err.dataPath), null, 4).split("\n").forEach(function(line) {
        output.push("    " + line);
    });
}

function schemaMsg(err, obj) {
    if (!err) return "";
    var output = [""];
    displayErr(err, obj, output);
    if (err.subErrors) {
        err.subErrors.forEach(function(s) {
            displayErr(s, obj, output);
        });
    }
    return output.join("\n");
}

suite('Validate References', function() {
    test("Validate References with JSON schema.", function() {
        var validator = tv4.freshApi();
        validator.addFormat(formats);
        var result = validator.validateResult(json, require("../schemas/reference.json"));
        assert(result.valid, schemaMsg(result.error, json));
    });
});
