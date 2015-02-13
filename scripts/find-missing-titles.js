var jsdom = require("jsdom")
module.exports = function (k, v, input, output, cb) {
    output[k] = v;
    if (typeof v === "object" && v.source === "./data/w3c-specs.txt" && !v.title) {
        console.log("Fetching: " + v.href)
        jsdom.env(
          v.href,
          function (errors, window) {
              v.title = (window.document.title || "").replace(/[\s\n]+/, " ").trim();
              console.log("Found title: " + v.title)
              cb(null);
          }
        );
    } else {
        cb(null);
    }
}