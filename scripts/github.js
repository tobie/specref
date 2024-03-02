"use strict";

// Lifted from https://github.com/w3c/spec-dashboard/blob/master/fetch-data/group-repos.js#L69
const urlToGHRepo = (url = "") => {
    const nofilter = x => true;
    const githubio = url.match(/^https?:\/\/([^\.]*)\.github\.io\/([^\/]*)\/?/);
    if (githubio) {
        return {owner: githubio[1], name: githubio[2], issuefilter: nofilter};
    }
    const githubcom = url.match(/^https:\/\/github.com\/([^\/]*)\/([^\/]*)\//);
    if (githubcom) {
        return {owner: githubcom[1], name: githubcom[2], issuefilter: nofilter};
    }
    const rawgit = url.match(/^https?:\/\/rawgit.com\/([^\/]*)\/([^\/]*)/);
    if (rawgit) {
        return {owner: rawgit[1], name: rawgit[2], issuefilter: nofilter};
    }
    const whatwg = url.match(/https:\/\/([^\.]*).spec.whatwg.org\//);
    if (whatwg) {
        return {owner: "whatwg", name: whatwg[1], issuefilter: nofilter};
    }

    const csswg = url.match(/^https?:\/\/drafts.csswg.org\/([^\/]*)\/?/);
    if (csswg) {
        return {owner: 'w3c', name: 'csswg-drafts', issuefilter: x => x.title.match(new RegExp("\\[" + csswg[1] + "\\]"))};
    }
    const devcss = url.match(/^https?:\/\/dev.w3.org\/csswg\/([^\/]*)\/?/);
    if (devcss) {
        return {owner: 'w3c', name: 'csswg-drafts', issuefilter: x => x.title.match(new RegExp("\\[" + devcss[1] + "\\]"))};
    }
    const devfxtf = url.match(/^https?:\/\/dev.w3.org\/fxtf\/([^\/]*)\/?/);
    if (devfxtf) {
        return {owner: 'w3c', name: 'fxtf-drafts', issuefilter: x => x.title.match(new RegExp("\\[" + devfxtf[1] + "\\]"))};
    }

    const svgwg = url.match(/^https?:\/\/svgwg.org\/specs\/([^\/]*)\/?/);
    if (svgwg) {
        return {owner: 'w3c', name: 'svgwg', issuefilter: x => x.labels.map(l => l.name.toLowerCase()).indexOf("svg " + svgwg[1]) !== -1};
    }
    // Specific cases
    if (url === "https://svgwg.org/svg2-draft/") {
        return {owner: 'w3c', name: 'svgwg', issuefilter: x => x.labels.map(l => l.name.toLowerCase()).indexOf("svg core") !== -1};
    }
    if (url === "https://linkedresearch.org/ldn/") {
        return {owner: 'w3c', name: 'ldn', issuefilter: nofilter};
    }
    if (url === "https://micropub.net/draft/") {
        return {owner: 'w3c', name: 'micropub', issuefilter: nofilter};
    }
    if (url === "https://webmention.net/draft/") {
        return {owner: 'w3c', name: 'webmention', issuefilter: nofilter};
    }
    if (url === "http://dev.w3.org/2009/dap/camera/") {
        return {owner: 'w3c', name: 'html-media-capture', issuefilter: nofilter};
    }

    // Additions
    const draftsfxtf = url.match(/^https?:\/\/drafts.fxtf.org\/([^\/]*)\/?/);
    if (draftsfxtf) {
        return { owner: 'w3c', name: 'fxtf-drafts' };
    }
};

module.exports = function(key, obj, input, output, cb) {
    if (!obj.repository) {
        let r = urlToGHRepo(obj.edDraft || obj.href);
        if (r) {
            obj.repository = `https://github.com/${r.owner}/${r.name}`;
        }
    }

    output[key] = obj;
    cb(null);
};

