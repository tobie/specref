var res = []
module.exports = function (k, v, input, output, cb) {
    if (typeof v === "object" && v.status && res.indexOf(v.status) < 0) {
            res.push(v.status)
            res.sort()
            //console.log(res)
    }
    if (typeof v === "object") {
        if (/^RFC\s\d{4}$/.test(v.status)) {
            output[k] = { aliasOf: v.status.replace(" ", "").toLowerCase() };
        } else if (/^Internet[\s-]Draft \(work in progress\)$/.test(v.status)) {
            v.status = "Internet Draft (work in progress)";
            output[k] = v;
        } else if (v.status == "Living Standard " || v.status == "Living Standard") {
            v.publisher = v.publisher || "WHATWG";
            v.status = "Living Standard";
            output[k] = v;
        } else if (/^Unicode/.test(v.status)) {
            v.publisher = v.publisher || "Unicode Consortium";
            output[k] = v;
        } else {
            output[k] = v;
        }
    } else {
        output[k] = v;
    }
    cb(null);
}