var assert = require('assert');
var bibref = require('../lib/bibref');
var json = bibref.expandRefs(bibref.raw);
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


function testAliasOfPointsToRealObj(obj, key) {
    if ('aliasOf' in obj) {
        var alias = obj.aliasOf;
        test('alias ' + wrap(alias) + ' of ' + wrap(key) + ' exists', function() {
            assert.ok(bibref.get(alias)[alias]);
        });
    }
}

function testObsoletedByPointsToUpToDateReferences(obj, key) {
    if ('obsoletedBy' in obj) {
        var current = obj.obsoletedBy;
        current.forEach(function(id) {
            test('new version ' + wrap(id) + ' of ' + wrap(key) + ' exists', function() {
                var ref = bibref.get(id)[id];
                assert.ok(typeof ref == "object");
            });
        });
    }
}

function testForDuplicates(obj, key, dups) {
    test(wrap(key) + ' has no duplicate', function() {
        var id = key.toUpperCase(),
            exists = id in dups;

        if (exists) {
            dups[id].push(key);
        } else {
            dups[id] = [ key ];
        }

        assert.ok(!exists, dups[id].join(', '));
    });
}

suite('Validate References', function() {
    test("Validate References with JSON schema.", function() {
        var validator = tv4.freshApi();
        validator.addFormat(formats);
        var result = validator.validateResult(json, require("../schemas/raw-reference.json"));
        assert(result.valid, schemaMsg(result.error, json));
    });
});

suite('Verify aliases and obsoletedBy resolve', function() {
    var dups = {};
    Object.keys(json).forEach(function(key) {
        var obj = json[key];
        testForDuplicates(obj, key, dups);
        if (typeof obj == 'object') {
            testAliasOfPointsToRealObj(obj, key);
            testObsoletedByPointsToUpToDateReferences(obj, key);
            if ('versions' in obj) {
                var versions = obj.versions;
                Object.keys(versions).forEach(function(k) {
                    testAliasOfPointsToRealObj(versions[k], k);
                    testObsoletedByPointsToUpToDateReferences(versions[k], k);
                });
            }
        } else {
            test('is a string', function() {
                assert.ok(typeof obj == "string");
            });
        }
    });
});

