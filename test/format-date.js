
var assert = require('assert'),
    format = require('../lib/format-date');

suite('Test format-date api', function() {

    test('short dates', function() {
        assert.equal("January 2013", format("2013-01"));
        assert.equal("December 2013", format("2013-12"));
    });
    
    test('long dates', function() {
        assert.equal("1 January 1999", format("1999-01-01"));
        assert.equal("13 December 2013", format("2013-12-13"));
    });

});