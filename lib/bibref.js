var fs = require('fs'),
    formatDate = require('./format-date');

var str = fs.readFileSync('./biblio.json', 'utf8');
var json = JSON.parse(str);
var PROPS =  [
    "authors",
    "etAl",
    "href",
    "title",
    "date",
    "status",
    "publisher",
    "aliasOf"
];

function _copyProps(src, dest) {
    for (var k in src) {
        dest[k] = src[k];
    }
}

function _cloneJSON(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function Bibref(raw) {
    this.raw = raw;
    this.all = cleanupRefs(expandRefs(raw));
}


// Iterates through the reference looking for previous
// versions of the spec which it makes avaialble as:
// KEY-SUBKEY (e.g. DAHUT-19970315).
// Properties which are missing from the previous entry
// fallback to props of the main entry.
// Correctly forwards aliases. For example:
// CSS2 is aliased to CSS21 therefore
// CSS2-20110607 will automatically be aliased to
// CSS21-20110607
function expandRefs(refs) {
    refs = _cloneJSON(refs);
    Object.keys(refs).forEach(function(key) {
        var ref = refs[key];
        if (ref.aliasOf) {
            var obj = ref;
            while (obj && refs[obj.aliasOf]) {
                obj = refs[obj.aliasOf];
            }
        }
        if (obj) {
            obj.aliases = obj.aliases || [];
            obj.aliases.push(key);
        }
    });
    
    Object.keys(refs).forEach(function(key) {
        var ref = refs[key];
        var previousVersions = ref.previousVersions
        if (previousVersions) {
            Object.keys(previousVersions).forEach(function(subKey) {
                var previousVersion = previousVersions[subKey];
                if (previousVersion.aliasOf) {
                    refs[key + '-' + subKey] = previousVersion;
                } else {
                    var obj = {};
                    // Props fallback to main entry.
                    _copyProps(ref, obj);
                    _copyProps(previousVersion, obj);
                    refs[key + '-' + subKey] = obj;
                }
            });
            if (ref.aliases) {
                ref.aliases.forEach(function(aliasKey) {
                    Object.keys(previousVersions).forEach(function(subKey) {
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

function cleanupRefs(refs) {
    Object.keys(refs).forEach(function(ref) {
        ref = refs[ref];
        if (typeof ref === 'object') {
            var latest = findLatest(ref);
            if (ref.rawDate) ref.date = formatDate(ref.rawDate);
            for (var prop in ref) {
                if (PROPS.indexOf(prop) === -1) {
                    delete ref[prop];
                }
            }
        }
    });
    return refs;
}

var EIGHT_DIGITS = /^\d{8}$/;

function findLatest(ref) {
    var keys, latest = null;
    if (ref.previousVersions) {
        keys = Object.keys(ref.previousVersions).filter(function(k) { return EIGHT_DIGITS.test(k); }).sort();
        latest = ref.previousVersions[keys[keys.length - 1]];
    }
    return latest;
}

Bibref.prototype.get = get;
function get(ref, output) {
    output = output || {};
    var obj;
    do {
        obj = this.all[ref];
        if (obj && !output[ref]) output[ref] = obj;
    } while (obj && (ref = obj.aliasOf))
    return output;
}

Bibref.prototype.getRefs = getRefs;
function getRefs(refs) {
    var output = {};
    refs.forEach(function(ref) { this.get(ref, output); }, this);
    return output;
}

module.exports = new Bibref(json);
module.exports.create = function(obj) {
    return new Bibref(obj);
};
module.exports.expandRefs = expandRefs;
module.exports.cleanupRefs = cleanupRefs;
module.exports.findLatest = findLatest;