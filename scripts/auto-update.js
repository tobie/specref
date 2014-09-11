#!/usr/bin/env node
var cp = require("child_process");
var path = require("path");
var async = require("async");

var today = new Date().toISOString().split("T")[0];
var branch_name = today + "-update";

function runScript(script, callback) {
    spawn("node", [path.join(__dirname, script)], callback);
}

function spawn(cmd, args, callback) {
    var child = cp.spawn(cmd, args || [], {
        cwd: process.cwd(),
        stdio: 'inherit'
    });
    child.on('error', callback);
    child.on('close', function (code) {
        if (code != 0) {
            var err = new Error();
            err.errno = code;
            callback(err);
        } else {
            callback(null);
        }
    });
}
spawn("git", ["checkout", "-b", branch_name], function(err) {
    if (err) return console.log(err);
    async.series([
        runScript.bind(null, "list-refs.js"), // make sure it's up to date before running the tests.
        runScript.bind(null, "run.js"),
        runScript.bind(null, "rfc.js"),
        runScript.bind(null, "rdf.js"),
        function(done) {
            console.log("Running test suite... (This might take a while.)");
            done();
        },
        spawn.bind(null, "mocha", ["-u", "tdd", "-R", "min", "./test/*.js"]),
        runScript.bind(null, "list-refs.js")
    ], function(err) {
        if (err) {
            console.log("Auto-update failed. Attempting clean up.");
            async.series([
                spawn.bind(null, "git", ["checkout", "master"]),
                spawn.bind(null, "git", ["branch", "-D", branch_name]),
            ], function() { process.exit(err.errno || 1); });
            return;
        }
        spawn("git", ["commit", "-a", "-m", today + " auto-update."], function(err) {
            if (err) {
                console.log("Looks like there weren't any changes. No need to update.")
                process.exit(64); //custom exit code
            } else {
                console.log("This looks good. You can now push it to your GitHub repository and send us a pull request!")
                process.exit(0); //custom exit code
            }
        });
    });
});

