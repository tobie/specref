
var helper = require('./helper');

module.exports = function (k, v, input, output, cb) {
    if (typeof v === "object" && v.publisher === 'W3C') {
        console.log("Parsing", v.href, '...')
        var obj = helper.parseURL(v.href);
        if (obj) {
             helper.getURL(obj.href, { isNote: obj.status == 'NOTE' }, function(err, url) {
                 if (url) {
                     if (k === obj.shortName) {
                         // The ref is already using its shortName as key.
                         v.href = url;
                         output[k] = v;
                     } else if (obj.shortName in output || obj.shortName in input) {
                         output[k] = input[k];
                         console.log(k, "has the shortName", obj.shortName, "Needs manual check.");
                     } else {
                         // There is no ref using the shortName as key
                         // We create one and alias this one to it.
                         output[obj.shortName] = v;
                         v.href = url;
                         output[k] = { aliasOf: obj.shortName };
                     }
                 } else {
                     output[k] = input[k];
                 }
                 cb(null);
             });
        } else {
            noop(k, v, output, cb);
        }
    } else {
        noop(k, v, output, cb);
    }
}
function noop(k, v, output, cb) {
    output[k] = v;
    cb(null);
}

