module.exports = function(k, obj, input, output, cb) {
    var parts = k.split('-'),
        key = parts.pop(),
        base = input[parts.join('-')];
    if (typeof base === "object" && /^\d{8}$/.test(key)) {
        base.versions = base.versions || {};
        if (base.versions[key]) throw "Duplicate key for " + k;
        base.versions[key] = obj;
    } else {
        output[k] = obj;
    }
    cb(null);
}

