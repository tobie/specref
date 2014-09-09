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
            callback(new Error("Spawn errno " + code));
        } else {
            callback(null);
        }
    });
}
spawn("git", ["checkout", "-b", branch_name], function(err) {
    if (err) return console.log(err);
    async.series([
        runScript.bind(null, "list-refs.js"),
        runScript.bind(null, "run.js"),
        runScript.bind(null, "rfc.js"),
        runScript.bind(null, "rdf.js"),
        spawn.bind(null, "npm", ["test"]),
        spawn.bind(null, "git", ["commit", "-a", "-m", today + " auto-update."])
    ], function(err) {
        if (err) {
            console.log("Auto-update failed. Attempting clean up.");
            async.series([
                spawn.bind(null, "git", ["checkout", "master"]),
                spawn.bind(null, "git", ["branch", "-D", branch_name]),
            ], function() { process.exit(1); });
            return;
        }
        console.log("This looks good. You can now push it to your GitHub repository and send us a pull request!")
        process.exit(0);
    });
});

