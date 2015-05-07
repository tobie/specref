#!/usr/bin/env node
var RDF_FILE = "http://www.w3.org/2002/01/tr-automation/tr.rdf";
var OLD_DATA_FILE = "./data/w3c-specs.txt";
var FILENAME = "w3c.json";

var runner = require('./run');
var biblio = runner.readBiblio();
var w3c = {};

console.log("Moving W3C references...");
Object.keys(biblio).forEach(function(k) {
    var ref = biblio[k];
    if (ref.source == OLD_DATA_FILE || ref.source == RDF_FILE) {
        w3c[k] = ref;
        delete biblio[k];
    }
});
w3c = runner.sortRefs(w3c);
runner.writeBiblio(FILENAME, w3c);
runner.writeBiblio(biblio);
