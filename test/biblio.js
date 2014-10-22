var assert = require('assert');
var bibref = require('../lib/bibref');
var json = bibref.expandRefs(bibref.raw);

function wrap(id) {
    return '[[' + id + ']]';
}

var PROPS = ["authors", "etAl", "href", "title", "date", "deliveredBy", "rawDate", "status", "publisher", "isRetired", "hasErrata", "isSuperseded", "source", "unorderedAuthors", "updates", "obsoletes", "issn", "updatedBy", "obsoletedBy", "rfcNumber", "seeAlso", "id", "versionOf"];

function testPropIsAString(obj, key, propName) {
    test(wrap(key) + ' has a ' + propName + ' which isn\'t an empty string', function() {
        assert.ok(typeof obj[propName] == "string")
        assert.ok(obj[propName].length > 0, "is not the empty string")
    });
}

function testObjOnlyContainsProps(obj, key, props) {
    test(wrap(key) + ' has no other properties', function() {
        Object.keys(obj).forEach(function(k) {
            assert.ok(props.indexOf(k) > -1, k + ' is a prop');
        })
    });
}

function testEtAlIsTrueWhenPresent(obj, key) {
    if ('etAl' in obj) {
        test(wrap(key) + ' has an etAl property equal to true', function() {
            assert.strictEqual(obj.etAl, true);
        });
    }
}

function testAuthorsArray(obj, key) {
    if ('authors' in obj) {
        test(wrap(key) + ' has an authors array', function() {
            assert.ok(obj.authors instanceof Array);
            assert.ok(obj.authors.length > 0);
            obj.authors.forEach(function(author) {
                assert.ok(typeof author == "string");
            })
        });
    }
}

function testDeliveredByArray(obj, key) {
    if ('deliveredBy' in obj) {
        test(wrap(key) + ' has a deliveredBy array', function() {
            assert.ok(obj.deliveredBy instanceof Array);
            assert.ok(obj.deliveredBy.length > 0);
            obj.deliveredBy.forEach(function(url) {
                assert.ok(typeof url == "string");
            })
        });
    }
}

function testAliasOfPointsToRealObj(obj, key) {
    if ('aliasOf' in obj) {
        var alias = obj.aliasOf;
        test('alias ' + wrap(alias) + ' of ' + wrap(key) + ' exists', function() {
            assert.ok(bibref.get(alias)[alias]);
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

suite('Reference', function() {
    var dups = {};

    Object.keys(json).forEach(function(key) {
        var obj = json[key];

        testForDuplicates(obj, key, dups);

        if (typeof obj == 'object') {
            if (obj.aliasOf) {
                testAliasOfPointsToRealObj(obj, key);
                testObjOnlyContainsProps(obj, key, ['aliasOf']);
            } else {
                testAuthorsArray(obj, key);
                testDeliveredByArray(obj, key);
                testEtAlIsTrueWhenPresent(obj, key);

                ['href', 'edDraft', 'date', 'status', 'publisher', 'title', 'versionOf', 'id'].forEach(function(prop) {
                    if (prop in obj) {
                        testPropIsAString(obj, key, prop);
                    }
                });

                testObjOnlyContainsProps(obj, key, PROPS.concat('versions', 'aliases', 'edDraft'));

                if ('versions' in obj) {
                    suite("versions obj of " + wrap(key), function() {
                        var versions = obj.versions;

                        test(wrap(key) + ' has a versions object', function() {
                            assert.ok(typeof versions == "object");
                        });

                        Object.keys(versions).forEach(function(k) {
                            var ver = versions[k];
                            if ('aliasOf' in ver) {
                                testAliasOfPointsToRealObj(ver, k);
                                testObjOnlyContainsProps(ver, k, ['aliasOf']);
                            } else {
                                ['href', 'title', 'date', 'status', 'publisher', 'versionOf', 'id'].forEach(function(prop) {
                                    if (prop in ver) {
                                        testPropIsAString(ver, k, prop);
                                    }
                                });
                                testAuthorsArray(ver, k);
                                testDeliveredByArray(ver, k);
                                testEtAlIsTrueWhenPresent(ver, k);
                                testObjOnlyContainsProps(ver, k, PROPS);
                            }
                        });
                    });
                }
            }
        } else {
            test('is a string', function() {
                assert.ok(typeof obj == "string");
            });
        }
    });
});

