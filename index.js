var t0 = Date.now();

var express = require("express"),
    cors = require("connect-cors"),
    bibref = require('./lib/bibref'),
    XREFS = require('./xrefs');

var app = module.exports = express();

// Configuration
app.configure(function(){
    app.use(express.compress());
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
    var refs = req.param("refs");
    if (refs) {
        refs = bibref.getRefs(refs.split(","));
        res.jsonp(refs);
    } else {
        res.jsonp(bibref.all);
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
    console.log("App started in", (Date.now() - t0) + "ms.");
});
