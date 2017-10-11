var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    formatDate = require('./format-date');

var PROPS =  [
    "id",
    "authors",
    "etAl",
    "href",
    "edDraft",
    "title",
    "date",
    "status",
    "publisher",
    "pages",
    "isbn",
    "aliasOf",
    "obsoletes",
    "obsoletedBy",
    "versions",
    "versionOf",
    "deliveredBy",
    "repository"
];

var WG_SHORTNAME_SPECIAL_CASES = {
    'graphics_svg': 'svg',
    'graphics_webcgm': 'webcgm',
    'markup': 'html-old',
    'markup_coord': 'hypertextcg',
    'markup_forms': 'forms',
    'mobile_ccpp': 'ccpp',
    'p3p_specification': 'p3p',
    'style_css': 'css',
    'style_xsl': 'xsl',
    'xp': 'xml_protocol' 
};

var WG_REVERSE_INDEX = {
    'https://www.dvb.org/': 'dvb',
    'http://www.iso.org/iso/home/standards_development/list_of_iso_technical_committees/iso_technical_committee.htm?commid=45316':  'ISO_IEC-JTC-1_SC-29',
    'http://www.opengeospatial.org': 'ogc',
    'https://datatracker.ietf.org/wg/httpauth/': 'httpauth'
};

function _getWGShortNameFromURL(url) {
    if (WG_REVERSE_INDEX[url]) {
        return WG_REVERSE_INDEX[url];
    }
    var shortname = url.toLowerCase()
             // Die, date space die!
             .replace(/\/([0-9]+\/)+/g, '/')
             .replace(/-?wg/,'')
             .replace(/group/,'')
             .replace(/members/,'')
             .replace(/\.html/,'')
             .replace(/community/,'cg')
             .replace(/international/,'i18n')
             // base url
             .replace(/https?:\/\/www\.w3\.org\//, "")
             .replace(/^https?:\/\//, "")
             .replace(/\/+/g, '/')
             // Trailing slash
             .replace(/\/$/, '')
             // convert / into _
             .replace(/\//g, "_") ;
    if (WG_SHORTNAME_SPECIAL_CASES[shortname]) {
        return WG_SHORTNAME_SPECIAL_CASES[shortname];
    }
    return shortname;
}

function _copyProps(src, dest) {
    for (var k in src) {
        dest[k] = src[k];
    }
}

function _cloneJSON(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function Bibref() {
    this.raw = {};
}

Bibref.prototype.addRefs = addRefs;
function addRefs(refs) {
    if (this.all) {
        throw new Error("Can no longer add references as Bibref.prototype.doneAddingRefs was called.");
    }
    _merge(this.raw, refs);
}

Bibref.prototype.doneAddingRefs = doneAddingRefs;
function doneAddingRefs() {
    this.all = cleanupRefs(addIds(createUppercaseRefs(expandRefs(this.raw))));
    this.reverseLookupTable = prepareReverseLookup(this.all);
}

function _merge(target, source) {
    for (var k in source) {
        if (k in target) {
            throw new Error("Dupliate entry " + k);
        } else {
            target[k] = source[k];
        }
    }
}

function normalizeUrl(u) {
    // We treat different protocols as identical, so omit them from the
    // output. Same for whatever's after the hash.
    // Likewise, we consider trailing slashes optional and remove them
    // when present (it's easier to remove a trailing slash than to add
    // one where missing).
    u = url.parse(u);
    u = (u.hostname || "").replace(/^www\./, "") + (u.pathname || "").replace(/\/$/, "") + (u.search || "") + (u.hash || "");
    // Case insensitive match.
    return u.toLowerCase();
}

function prepareReverseLookup(refs) {
    var output = {};
    Object.keys(refs).forEach(function(k) {
        var ref = refs[k];
        var href = ref.href;
        if (href) {
            href = normalizeUrl(href);
            output[href] = refs[ref.versionOf || k];
        }
        var edDraft = ref.edDraft;
        if (edDraft && !(edDraft in output)) {
            edDraft = normalizeUrl(edDraft);
            output[edDraft] = refs[ref.versionOf || k]; 
        }
    });
    return output;
}

// Iterates through the reference looking for previous
// versions of the spec which it makes available as:
// KEY-SUBKEY (e.g. DAHUT-19970315).
// Properties which are missing from the previous entry
// fall back to props of the main entry.
// Correctly forwards aliases. For example:
// CSS2 is aliased to CSS21 therefore
// CSS2-20110607 will automatically be aliased to
// CSS21-20110607
function expandRefs(refs) {
    refs = _cloneJSON(refs);
    Object.keys(refs).forEach(function(key) {
        var ref = refs[key];
        if (ref.aliasOf) {
            var obj = ref,
                lastKey = key;
            while (obj && refs[obj.aliasOf]) {
                lastKey = obj.aliasOf;
                obj = refs[lastKey];
            }
        }
        if (obj && key !== lastKey) {
            obj.aliases = obj.aliases || [];
            obj.aliases.push(key);
        }
    });

    Object.keys(refs).forEach(function(key) {
        var ref = refs[key];
        var versions = ref.versions
        if (versions) {
            Object.keys(versions).forEach(function(subKey) {
                var ver = versions[subKey];
                if (ver.aliasOf) {
                    refs[key + '-' + subKey] = ver;
                } else {
                    var obj = {
                        versionOf: key
                    };
                    // Props fallback to main entry.
                    _copyProps(ref, obj);
                    _copyProps(ver, obj);
                    delete obj.versions;
                    delete obj.obsoletes;
                    refs[key + '-' + subKey] = obj;
                }
            });
            if (ref.aliases) {
                ref.aliases.forEach(function(aliasKey) {
                    Object.keys(versions).forEach(function(subKey) {
                        // Watch out not to overwrite existing aliases.
                        if (!refs[aliasKey + '-' + subKey]) {
                            refs[aliasKey + '-' + subKey] = { aliasOf: key + '-' + subKey };
                        }
                    });
                });
            }
        }
    });
    return refs;
}

// Creates uppercased aliases to allow case-insensitive retrieval
function createUppercaseRefs(refs) {
    Object.keys(refs).forEach(function(key) {
        var upper = key.toUpperCase();
        if (!refs[upper]) {
            refs[upper] = { aliasOf: key };
        }
    });

    return refs;
}

function cleanupRefs(refs) {
    Object.keys(refs).forEach(function(k) {
        var ref = refs[k];
        if (typeof ref === 'object') {
            if (ref.rawDate) ref.date = formatDate(ref.rawDate);
            for (var prop in ref) {
                if (PROPS.indexOf(prop) === -1) {
                    delete ref[prop];
                }
                if (prop == "deliveredBy") {
                    ref.deliveredBy = ref.deliveredBy.map(function(url) {
                        return { url: url, shortname: _getWGShortNameFromURL(url) };
                    });
                }
                if (prop == "versions") {
                    ref.versions = Object.keys(ref.versions).map(function(subKey) {
                        return k + "-" + subKey;
                    });
                    ref.versions.sort();
                    ref.versions.reverse();
                }
            }
        }
    });
    return refs;
}

function addIds(refs) {
    Object.keys(refs).forEach(function(k) {
        var ref = refs[k];
        if (typeof ref === 'object') {
            ref.id = k;
        }
    });
    return refs;
}

var EIGHT_DIGITS = /^\d{8}$/;

function findLatest(ref) {
    var keys, latest = null;
    if (ref.versions) {
        keys = Object.keys(ref.versions).filter(function(k) { return EIGHT_DIGITS.test(k); }).sort();
        latest = ref.versions[keys[keys.length - 1]];
    }
    return latest;
}

Bibref.prototype.get = get;
function get(ref, output) {
    output = output || {};
    var obj, versionOf, uRef;

    // if ref doesn't exist but the uppercased key does, add an alias on the fly
    if ((!this.all[ref]) && this.all[ref.toUpperCase()]) {
        output[ref] = { aliasOf: ref.toUpperCase(), id: ref };
        ref = ref.toUpperCase();
    }

    do {
        obj = this.all[ref];
        uRef = ref.toUpperCase();
        // if ref doesn't exist but the uppercased key does, add an alias on the fly
        if (!obj && !output[ref] && this.all[uRef]) {
            output[ref] = { aliasOf: uRef, id: ref };
            ref = uRef;
            obj = this.all[ref];
        }
        if (obj && !output[ref]) output[ref] = obj;
    } while (obj && (ref = obj.aliasOf))
    if (obj && (versionOf = obj.versionOf)) {
        output[versionOf] = this.all[versionOf];
    }
    return output;
}

Bibref.prototype.getRefs = getRefs;
function getRefs(refs) {
    var output = {};
    refs.forEach(function(ref) { this.get(ref, output); }, this);
    return output;
}

Bibref.prototype.reverseLookup = reverseLookup;
function reverseLookup(urls) {
    var output = {};
    urls.forEach(function(url) {
        var ref = this.reverseLookupTable[normalizeUrl(url || "")];
        if (ref) output[url] = ref;
    }, this);
    return output;
}

var REFS_DIR = './refs';

var b = new Bibref();
fs.readdirSync(REFS_DIR).forEach(function(file) {
    var content = fs.readFileSync(path.join(REFS_DIR, file), 'utf8');
    var json = JSON.parse(content);
    b.addRefs(json);
});
b.doneAddingRefs();

module.exports = b;
module.exports.create = function() {
    var b = new Bibref();
    for (var i = 0; i < arguments.length; i++) {
        b.addRefs(arguments[i]);
    }
    b.doneAddingRefs();
    return b;
};
module.exports.expandRefs = expandRefs;
module.exports.createUppercaseRefs = createUppercaseRefs;
module.exports.cleanupRefs = cleanupRefs;
module.exports.findLatest = findLatest;
module.exports.normalizeUrl = normalizeUrl;

