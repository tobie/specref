var LEVELED_SPECS = [
    "WebIDL"
];

var LEVELED_SPECS_DOWNCASE = LEVELED_SPECS.map(function(shortname) { return shortname.toLowerCase(); });

exports.isLeveledSpec = isLeveledSpec;
function isLeveledSpec(shortname) {
    return isRoot(getRootShortname(shortname));
}

exports.isRoot = isRoot;
function isRoot(shortname) {
    shortname = shortname.toLowerCase();
    return LEVELED_SPECS_DOWNCASE.indexOf(shortname) > -1;
}

exports.isLevel = isLevel;
function isLevel(shortname) {
    return isLeveledSpec(shortname) && !isRoot(shortname);
}

exports.getRootShortname = getRootShortname;
function getRootShortname(shortname) {
    return shortname.replace(/-?\d+$/, "");
}

exports.getLevel = getLevel;
function getLevel(shortname) {
    return shortname.replace(/^.*?(-?\d+)$/, "$1");
}

exports.getLeveledSpecs = getLeveledSpecs;
function getLeveledSpecs() {
    return LEVELED_SPECS.slice(0);
}