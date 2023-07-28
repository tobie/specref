#!/usr/bin/env node
var request = require('request'),
    userAgent = require("./user-agent"),
    helper = require('./helper'),
    bibref = require('../lib/bibref');

var SOURCE = 'https://raw.githubusercontent.com/w3c/browser-specs/web-specs%40latest/index.json';
var PUBLISHER = 'browser-specs';
var FILENAME = PUBLISHER.toLowerCase() + ".json";

var biblio = helper.readBiblio();
var current = helper.readBiblio(FILENAME);
var updatedList = {};
var refs = bibref.createUppercaseRefs(bibref.expandRefs(bibref.raw));

function convertSpec(spec) {
    const ref = {
        href: spec.url,
        title: spec.title,
        status: spec.nightly.status,
        publisher: spec.organization,
        deliveredBy: spec.groups.map(function(group) {
            // Specref does not like fragment IDs in group URLs
            // (not a big deal, that would only potentially be useful for
            // FIDO Alliance groups)
            return group.url.replace(/#.*$/, '');
        }),
        source: SOURCE
    };
    if (spec.nightly.repository) {
        ref.repository = spec.nightly.repository;
    }
    if (spec.standing === 'discontinued') {
        ref.isRetired = true;
    }
    if (spec.obsoletedBy) {
        ref.obsoletedBy = spec.obsoletedBy;
    }
    return ref;
}


function isInSpecref(id) {
    if (updatedList[id]) {
        return true;
    }
    var ref = refs[id];
    if (ref && ref.source !== SOURCE) {
        return true;
    }
    return false;
}

console.log("Updating", PUBLISHER, "references...");
console.log("Fetching", SOURCE + "...");
request({
    url: SOURCE,
    headers: {
        'User-Agent': userAgent()
    }
}, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", SOURCE + ".");
        return;
    }

    console.log("Parsing", SOURCE + "...");
    const browserSpecs = JSON.parse(body);
    browserSpecs
        .filter(function(spec) {
            // Only keep specs from browser-specs that meet the following
            // criteria:
            // 1. The info comes from the spec itself. Other specs should
            // already be in Specref.
            // 2. The name ID is available, or lives in browser-specs.json.
            // Given the way that browser-specs is maintained, a name collision
            // means that the spec already started to appear in another source
            // but this transition has not yet been picked up by browser-specs.
            // That's good, no need to throw an error, let's give priority to
            // the other source.
            const uppercaseId = spec.shortname.toUpperCase();
            return spec.source === 'spec' && !isInSpecref(uppercaseId);
        })
        .forEach(function(spec) {
            // Add an entry to browser-specs.json for the spec, unless Specref
            // already has an entry somewhere else for a spec with the same URL.
            const uppercaseId = spec.shortname.toUpperCase();
            const rv = bibref.reverseLookup([spec.url])[spec.url];
            if (rv && !current[rv.id]) {
                if (current[uppercaseId] &&
                        rv.id.toUpperCase() !== uppercaseId) {
                    // There was an entry for this spec in browser-specs.json
                    // but Specref has an entry for a spec with the same URL
                    // somewhere else. Let's give that other entry priority and
                    // mark the browser-specs entry as an alias of it.
                    updatedList[uppercaseId] = { aliasOf: rv.id };
                    return;
                }
                else if (!current[uppercaseId]) {
                    // There is an entry for this spec in Specref somewhere else
                    // and we had not yet created a browser-specs.json entry.
                    // Let's not.
                    return;
                }
            }

            // No entry in Specref, let's add one
            updatedList[uppercaseId] = convertSpec(spec);
        });

    // For continuity, add back aliases that we may have created earlier on,
    // unless the targeted entry no longer exists (that should never happen
    // though). Also add back entries that used to exist but that are now known
    // under another name.
    const browserSpecsWithFormerNames = browserSpecs.filter(s => s.formerNames);
    Object.keys(current)
        .filter(function(id) { return !updatedList[id]; })
        .forEach(function(id) {
            var ref = current[id];
            var browserSpec = browserSpecsWithFormerNames.find(s =>
                s.formerNames.find(n => n === id || n.toUpperCase() === id)
            );
            if (browserSpec) {
                const uppercaseId = browserSpec.shortname.toUpperCase();
                if (updatedList[uppercaseId]) {
                    updatedList[id] = { aliasOf: uppercaseId };
                }
                else {
                    let rv = bibref.reverseLookup([uppercaseId])[uppercaseId];
                    if (!rv) {
                        rv = bibref.reverseLookup([browserSpec.url])[browserSpec.url];
                    }
                    if (rv) {
                        updatedList[id] = { aliasOf: rv.id };
                    }
                }
            }
            else if (ref.aliasOf && isInSpecref(ref.aliasOf)) {
                updatedList[id] = ref;
            }
        });

    // Make sure that "obsoletedBy" properties target actual specs in Specref
    Object.keys(updatedList)
        .filter(function(id) { return !!updatedList[id].obsoletedBy; })
        .forEach(function(id) {
            var ref = updatedList[id];
            ref.obsoletedBy = ref.obsoletedBy
                .map(n => {
                    if (isInSpecref(n)) {
                        return n;
                    }
                    else if (isInSpecref(n.toUpperCase())) {
                        return n.toUpperCase();
                    }
                    else {
                        return null;
                    }
                })
                .filter(n => !!n);
            if (ref.obsoletedBy.length > 0) {
                ref.isSuperseded = true;
                if (ref.isRetired) {
                    delete ref.isRetired;
                }
            }
            else {
                delete ref.obsoletedBy;
            }
        });

    updatedList = helper.sortRefs(updatedList);
    console.log("updating existing refs.")
    helper.writeBiblio(FILENAME, updatedList);
    helper.tryOverwrite(FILENAME);
    helper.writeBiblio(biblio);
});
