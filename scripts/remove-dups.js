#!/usr/bin/env node
var runner = require('./run');
    
var current = runner.readBiblio();

console.log("Removing dups...");
var refs = {};
Object.keys(current).forEach(function(k) {
    var href = current[k].href
    if (href) {
        refs[href] = k;
    }
});

Object.keys(current).forEach(function(k) {
    var html = current[k];
    if (typeof html == "string") {        
        for (var href in refs) {
            if (html.indexOf(href) >= 0) {
                current[k] = { aliasOf: refs[href] };
                console.log(k, "is a duplicate of", refs[href]);
            }
        }
    }
});

current = runner.sortRefs(current);
console.log("updating existing refs.")
runner.writeBiblio(current);
