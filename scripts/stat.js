#!/usr/bin/env node
var fs = require('fs');
var json = require('../lib/bibref').all;
var path = require('path');

var things = {};
var prop = process.argv[2];

Object.keys(json).forEach(function(k) {
    var ref = json[k];
    if (ref[prop]) {
        things[ref[prop]] = things[ref[prop]] || 0;
        things[ref[prop]]++;
    }
});

var keys = Object.keys(things).sort();

var maxLength = keys.reduce(function(a, b) {
    return Math.max(a, b.length);
}, 0);
var maxCountLength = keys.reduce(function(a, b) {
    return Math.max(a, (things[b] + "").length);
}, 0);

keys.map(function(k) {
    var count = things[k] + "";
    var pad = (maxLength - k.length) + (maxCountLength - count.length) + 4;
    return k + " " + new Array(pad + 1).join(".") + count;
}).forEach(function(str) {
    console.log(str)
});