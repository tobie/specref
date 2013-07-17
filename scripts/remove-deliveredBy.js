module.exports = function (k, v, input, output, cb) {
    if (typeof v === "object") {
        if (typeof v.deliveredBy == "string") {
            delete v.deliveredBy;
        }
        
        var versions = v.versions;
        if (versions) {
            for (var prop in versions) {
                if (typeof versions[prop].deliveredBy == "string") {
                    delete versions[prop].deliveredBy;
                }
            }
        }
    }
    output[k] = v;
    cb(null);
}