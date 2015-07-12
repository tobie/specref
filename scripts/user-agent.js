var pkg = require("../package.json");

module.exports = function() {
    var info = ["http://www.specref.org"];
    var email = process.env.USER_AGENT_EMAIL;
    if (email) info.push(email);
    return pkg.name + "/" + pkg.version + " (" + info.join("; ") + ")";
}