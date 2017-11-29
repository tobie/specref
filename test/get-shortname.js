var assert = require('assert'),
    getShortname = require('../scripts/get-shortname');

suite('Test getShortname', function() {
    test("https://www.w3.org/TR/css-2015/" , function() {
        assert.equal(getShortname("https://www.w3.org/TR/css-2015/"), "css-2015");
    });
});
