var t0 = Date.now();

var bibref = require('./lib/bibref'),
    XREFS = require('./xrefs');

var app = module.exports = require("express")();

var errorhandlerOptions = {};
if (process.env.NODE_ENV == "dev" || process.env.NODE_ENV == "development") {
    errorhandlerOptions.dumpExceptions = true;
    errorhandlerOptions.showStack = true;
}

app.use(require("compression")());
app.use(require("cors")());
app.use(require("body-parser").urlencoded({ extended: true }));
app.use(require("multer")());
app.use(require("errorhandler")(errorhandlerOptions));

// bibrefs
app.get('/bibrefs', function (req, res, next) {
    var refs = req.param("refs");
    if (refs) {
        refs = bibref.getRefs(refs.split(","));
        res.status(200).jsonp(refs);
    } else {
        res.status(200).jsonp(bibref.all);
    }
});

// search
app.get('/search-refs', function (req, res, next) {
    var q = (req.param("q") || "").toLowerCase();
    if (q) {
		var obj = {};
		var current, shortname;
		
		function match(str) {
			return (str.toLowerCase().indexOf(q) > -1);
		}
		
		function add() {
			obj[shortname] = current;
		}
		
		var all = bibref.all;
		for (shortname in all) {
			current = all[shortname];
			if (match(shortname)) {
				add();
				if (current.aliasOf) {
					var k = current.aliasOf;
					while (k) {
						obj[k] = all[k];
						k = obj[k].aliasOf;
					}
				}
			} else if (typeof current == "string") { // legacy
				if (match(current)) { add(); }
			} else if (!("aliasOf" in current)) {
				for (var key in current) {
					var value = current[key];
					if (typeof value == "string") {
						if (match(value)) { add(); }
					} else if (Array.isArray(value)) {
						value.forEach(function(item) {
							if (typeof item == "string") {
								if (match(item)) { add(); }
							} else {
								for (var prop in item) {
									if (match(item[prop])) { add(); }
								}
							}
						});
					}
				}
			}
		}
        res.status(200).jsonp(obj);
    } else {
        res.status(400).jsonp({ message: "Missing q parameter" });
    }
});

// search by url
app.get('/reverse-lookup', function (req, res, next) {
    var refs,
        urls = req.param("urls");
    if (urls) {
        refs = bibref.reverseLookup(urls.split(","));
        res.status(200).jsonp(refs);
    } else {
        res.status(400).jsonp({ message: "Missing urls parameter" });
    }
});

var metadata = (function(pkg) {
    var all = bibref.all;
    var ids = Object.keys(all);
    var refCount = 0;
    ids.forEach(function(id) {
        var ref = all[id];
        if (typeof ref == "string" || !("aliasOf" in ref)) refCount++;
    });
    return {
        name: pkg.name,
        version: pkg.version,
        refCount: refCount,
        aliasCount: ids.length - refCount,
        startupTime: new Date()
    };
})(require("./package.json"));

app.get('/metadata', function (req, res, next) {
    metadata.runningFor = new Date() - metadata.startupTime;
    res.status(200).jsonp(metadata);
});

// xrefs
app.get('/xrefs', function (req, res, next) {
    res.status(410).jsonp({ message: "xrefs are no longer supported." });
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Express server listening on port %d in %s mode", port, app.settings.env);
    console.log("App started in", (Date.now() - t0) + "ms.");
});
