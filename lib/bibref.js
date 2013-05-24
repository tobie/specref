var fs = require('fs');
var str = fs.readFileSync('./biblio.json', 'utf8');
var rawBibref = JSON.parse(str);
var bibref = JSON.parse(str);

exports.rawBibref = rawBibref;
exports.bibref = bibref;

function copyProps(src, dest) {
    for (var k in src) {
        dest[k] = src[k];
    }
}

Object.keys(bibref).forEach(function(ref) {
    var previousVersions = bibref[ref].previousVersions
    if (previousVersions) {
        delete bibref[ref].previousVersions;
        Object.keys(previousVersions).forEach(function(subRef) {
            var previousVersion = previousVersions[subRef];
            if (previousVersion.aliasOf) {
                bibref[ref + '-' + subRef] = previousVersion;
            } else {
                var obj = {};
                copyProps(bibref[ref], obj);
                copyProps(previousVersions[subRef], obj);
                bibref[ref + '-' + subRef] = obj;
            }
        });
    }
});
