var assert = require('assert');
var bibref = require('../lib/bibref');
var json = bibref.expandRefs(bibref.raw);

function wrap(id) {
    return '[[' + id + ']]';
}

var PROPS = ["authors", "etAl", "href", "title", "date", "deliveredBy", "rawDate", "status", "publisher", "isRetired", "hasErrata", "isSuperseded", "source", "unorderedAuthors"];

function testPropIsAString(obj, key, propName) {
    test(wrap(key) + ' has a ' + propName + ' which isn\'t an empty string.', function() {
        assert.ok(typeof obj[propName] == "string")
        assert.ok(obj[propName].length > 0, "is not the empty string")
    });
}

function testObjOnlyContainsProps(obj, key, props) {
    test(wrap(key) + ' has no other properties.', function() {
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

function testAliasOfPointsToRealObj(obj, key) {
    if ('aliasOf' in obj) {
        test('alias ' + wrap(obj.aliasOf) + ' of ' + wrap(key) + ' exists.', function() {
            assert.ok(obj.aliasOf in json);
        });
    }
}

suite('Reference', function() {
    Object.keys(json).forEach(function(key) {
        var obj = json[key];
        if (typeof obj == 'object') {
            if (obj.aliasOf) {
                testAliasOfPointsToRealObj(obj, key);
                testObjOnlyContainsProps(obj, key, ['aliasOf']);
            } else {
                ['href', 'title'].forEach(function(prop) {
                    testPropIsAString(obj, key, prop);
                });
                
                testAuthorsArray(obj, key);
                testEtAlIsTrueWhenPresent(obj, key);
                
                ['date', 'status', 'publisher'].forEach(function(prop) {
                    if (prop in obj) {
                        testPropIsAString(obj, key, prop);
                    }
                });
                
                testObjOnlyContainsProps(obj, key, PROPS.concat('previousVersions'));

                if ('previousVersions' in obj) {
                    suite("previousVersions obj of " + wrap(key), function() {
                        var previousVersions = obj.previousVersions;
                        
                        test(wrap(key) + ' has a previousVersions object', function() {
                            assert.ok(typeof previousVersions == "object");
                        });
                        
                        Object.keys(previousVersions).forEach(function(k) {
                            var previousVersion = previousVersions[k];
                            if ('aliasOf' in previousVersion) {
                                testAliasOfPointsToRealObj(previousVersion, k);
                                testObjOnlyContainsProps(previousVersion, k, ['aliasOf']);
                            } else {
                                ['href', 'title', 'date', 'status', 'publisher'].forEach(function(prop) {
                                    if (prop in previousVersion) {
                                        testPropIsAString(previousVersion, k, prop);
                                    }
                                });
                                testAuthorsArray(previousVersion, k);
                                testEtAlIsTrueWhenPresent(previousVersion, k);
                                testObjOnlyContainsProps(previousVersion, k, PROPS);
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

