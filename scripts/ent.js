var ent = require('ent');

module.exports = function(key, obj, input, output, cb) {
    if (typeof obj == "object") {
        Object.keys(obj).forEach(function(k) {
            var v = obj[k];
            if (typeof v == "string") {
                obj[k] = ent.decode(v);
            } else if (v instanceof Array) {
                for (var i=0; i < v.length; i++) {
                    v[i] = ent.decode(v[i]);
                }
            }
        });
    }
    output[key] = obj;
    cb(null);
};

