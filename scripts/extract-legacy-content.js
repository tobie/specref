#!/usr/bin/env node
var FILENAME = "legacy.json";

var runner = require('./run');
var biblio = runner.readBiblio();
var legacy = {};

console.log("Moving W3C references...");
Object.keys(biblio).forEach(function(k) {
    var ref = biblio[k];
    if (typeof ref == "string") {
        legacy[k] = ref;
        delete biblio[k];
    }
});
legacy = runner.sortRefs(legacy);
runner.writeBiblio(FILENAME, legacy);
runner.writeBiblio(biblio);
