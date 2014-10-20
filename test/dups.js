var assert = require('assert');
var bibref = require('../lib/bibref');
var json = bibref.expandRefs(bibref.raw);

suite('Duplicate URLs', function() {
    var refs = {};
    Object.keys(json).forEach(function(k) {
        var href = json[k].href;
        if (href && !(/^(DAHUT|(DAHUT-.+))$/).test(k)) {
            test(k + "'s URL isn't referenced elsewhere", function() {
                assert(!(href in refs), k + " has the same URL as " + refs[href] + " (" + href + ").");
                refs[href] = k;
            });
        }
    });
});

