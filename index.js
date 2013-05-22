var express = require("express"),
    cors = require("connect-cors"),
    BIBREF = require('./biblio'),
    XREFS = require('./xrefs');

var app = module.exports = express();

function copyProps(src, dest) {
    for (var k in src) {
        dest[k] = src[k];
    }
}

// Handle previous versions.
Object.keys(BIBREF).forEach(function(ref) {
    var previousVersions = BIBREF[ref].previousVersions
    if (previousVersions) {
        delete BIBREF[ref].previousVersions;
        Object.keys(previousVersions).forEach(function(subRef) {
            var previousVersion = previousVersions[subRef];
            if (previousVersion.aliasOf) {
                BIBREF[ref + '-' + subRef] = previousVersion;
            } else {
                var obj = {};
                copyProps(BIBREF[ref], obj);
                copyProps(previousVersions[subRef], obj);
                BIBREF[ref + '-' + subRef] = obj;
            }
        });
    }
});

// Configuration
app.configure(function(){
    app.use(cors());
    app.use(express.bodyParser());
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// bibrefs
app.get('/bibrefs', function (req, res, next) {
    var data = {};
    var refs = req.param("refs");
    if (refs) {
        refs.split(",").forEach(function(ref) {
            var obj;
            do {
                obj = BIBREF[ref];
                if (obj && !data[ref]) data[ref] = obj;
            } while (obj && (ref = obj.aliasOf))
        });
        res.jsonp(data);
    } else {
        res.jsonp(BIBREF);
    }
});

// xrefs
app.get('/xrefs', function (req, res, next) {
    var data = {};
    var refs = req.param("refs");
    if (refs) {
        refs.split(",").forEach(function(ref) {
            if (XREFS[ref]) data[ref] = XREFS[ref];
        });
        res.jsonp(data);
    } else {
        res.jsonp(XREFS);
    }
    
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});
