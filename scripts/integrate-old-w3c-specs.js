var fs = require("fs"),
    path = require("path"),
    getShortname = require("./get-shortname"),
    runner = require('./run'),
    current = runner.readBiblio();

    var source = "./data/w3c-specs.txt"

console.log("Adding old W3C refs...");    
fs.readFile(path.join(__dirname, "..", "data", "w3c-specs.txt"), "utf8", function(err, data) {
    if (err) throw err;
    data.split("\n").forEach(function(line) {
       var parts = line.split(/\s+/);
       var url = parts[0];
       try {
           var shortname = getShortname(parts[1]);
       } catch(e) {
           return;
       }
       var ref = current[shortname];
       if (!ref) ref = current[shortname.toUpperCase()];
       var m = url.match(/\/(?:(NOTE|WD|CR|PR|REC|PER|)-)?([A-Za-z0-9\+\.\-]+?)-([0-9]+)(?:\/?|\.html|\.HTML|\/.*)$/);
       if (!m) return;
       if (ref) {
           while (ref && ref.aliasOf) {
               ref = current[ref.aliasOf];
           }
       } 
       var k = m[3];
       if (k.length == 6) k = "19" + k; 
       var obj = {
           status: m[1],
           rawDate: [k.substr(0,4), k.substr(4,2), k.substr(6,2)].join("-"),
           href: url,
           source: source
       }

       //if (ref && ref.publisher != "W3C") {
       //    console.log(shortname, obj)
       //} 
       //if (ref && typeof ref !== "object") {
       //    console.log(shortname, obj)
       //} 
       if (!ref) {
           ref = current[shortname] = {
               versions: {},
               href: parts[1],
               publisher: "W3C",
               source: source
           }
       }
       var versions = ref.versions || {};
       if (!(k in versions)) {
           versions[k] = obj;
       }
    });
    Object.keys(current).forEach(function(k) {
        var ref = current[k];
        if (ref.source == source) {
            var latest = Object.keys(ref.versions).sort().reverse()[0]
            latest = ref.versions[latest];
            ref.status = latest.status;
            ref.rawDate = latest.rawDate;
        }
    });
    current = runner.sortRefs(current);
    console.log("updating existing refs.")
    runner.writeBiblio(current);
});

