#!/usr/bin/env node
var FILENAME = "whatwg.json";

var runner = require('./run');
var biblio = runner.readBiblio();
var whatwg = {};

console.log("Moving W3C references...");
Object.keys(biblio).forEach(function(k) {
    var ref = biblio[k];
    if (ref.publisher && ref.publisher.toLowerCase() == "whatwg") {
        whatwg[k] = ref;
        delete biblio[k];
    }
});
whatwg = runner.sortRefs(whatwg);
runner.writeBiblio(FILENAME, whatwg);
runner.writeBiblio(biblio);
