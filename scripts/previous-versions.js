module.exports = function(k, obj, input, output, cb) {
    var parts = k.split('-'),
        key = parts.pop(),
        base = input[parts.join('-')];
    if (typeof base === "object" && /^\d{8}$/.test(key)) {
        base.previousVersions = base.previousVersions || {};
        if (base.previousVersions[key]) throw "Duplicate key for " + k;
        base.previousVersions[key] = obj;
    } else {
        output[k] = obj;
    }
    cb(null);
}

