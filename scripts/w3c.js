#!/usr/bin/env node
const userAgent =require('./user-agent');
const bibref = require('../lib/bibref');
const helper = require('./helper');
const getShortName = require('./get-shortname');

// Read CLI arguments
const args = process.argv.slice(2);
const verbose = !!args.find(arg => arg === '--verbose' || arg === '-v');
let since = args.find(arg => arg.match(/^\d{4}(-\d\d(-\d\d)?)?$/));
if (!since && args.find(arg => !arg.startsWith('-'))) {
    console.log(
`Cannot interpret the provided parameter as a date.
Please provide a date following the format YYYY, YYYY-MM, or YYYY-MM-DD format.
Or run the script without parameter to update recently published specs`);
    process.exit(1);
}

const W3C_API = "https://api.w3.org/";
const FILENAME = "w3c.json";
const current = helper.readBiblio(FILENAME);

// Record the entries that used to be aliases and that get turned into concrete
// entries, so that we may reverse the alias link in the end.
const aliasesToInvert = {};

// Record the number of requests sent to the W3C API
let requestsToW3CApi = 0;

/**
 * Specref uses abbreviations for W3C statuses.
 *
 * TODO: It would probably be better to use longer forms throughout. That would
 * require updating all statuses in refs/w3c.json at once, and making sure that
 * consumers are aware of the change first...
 *
 * Note that the W3C API considers that the status of a Retired spec is
 * "Retired", while Specref records that information on the side and uses the
 * status of the spec before it got retired.
 */
const STATUSES = {
    'First Public Working Draft': 'FPWD',
    'Working Draft': 'WD',
    'Last Call Working Draft': 'LCWD',
    'Candidate Recommendation': 'CR',
    'Candidate Recommendation Draft': 'CRD',
    'Candidate Recommendation Snapshot': 'CR',
    'Proposed Recommendation': 'PR',
    'Proposed Edited Recommendation': 'PER',
    'Recommendation': 'REC',
    'Draft Note': 'DNOTE',
    'Note': 'NOTE',
    'Draft Registry': 'DRY',
    'Candidate Registry Draft': 'CRYD',
    'Candidate Registry': 'CRY',
    'Registry': 'RY',
    'Statement': 'STMT'
};
function getStatus(version, versions) {
    if (version.status in STATUSES) {
        return STATUSES[version.status];
    }
    if (version.status === 'Retired') {
        // Let's look for something that looks like a W3C status in the URL of
        // the retired spec and fallback to the status of the first previous
        // version for which we can determine a non-retired status otherwise.
        // Note: while that may seem strange, more than one "Retired" version
        // of a spec may be published for a single spec. For an example, see:
        // https://api.w3.org/specifications/cselection/versions?embed=1
        const reStatus = /^https:\/\/www\.w3\.org\/TR\/(?:\d{4}\/)?([^-]+)-.*-\d{6,8}/;
        let seen = false;
        for (let i = versions.length - 1; i >= 0; i--) {
            const currVersion = versions[i];
            if (!seen) {
                seen = currVersion === version;
            }
            if (!seen) {
                continue;
            }
            if (currVersion.status in STATUSES) {
                return STATUSES[currVersion.status];
            }
            const match = currVersion.uri.match(reStatus);
            if (match && Object.values(STATUSES).includes(match[1])) {
                return match[1];
            }
        }

        // And then, there's WCA-Terms, which just exists as a "Retired" spec
        // published in 1999 in the W3C API (that's the only case):
        // https://api.w3.org/specifications/WCA-terms
        if (version.shortlink === 'https://www.w3.org/1999/05/WCA-terms/') {
            return STATUSES['Working Draft'];
        }
    }
    console.error(`- No good status in ${version._links.self.href} for ${version.title}, using "WD"`);
    return STATUSES['Working Draft'];
}

function makeKey(ref) {
    return ref.rawDate.replace(/\-/g, '');
}

/**
 * Helper function to sleep for a specified number of milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms, 'slept'));
}

/**
 * The W3C API has a rate limit of 6000 requests every 10 minutes.
 * Hopefully, we won't need to send that many requests, but let's
 * throttle requests to 10 per second to err on the safe side.
 */
async function fetchW3CApi(url) {
    const fetchParams = {
        headers: [['User-Agent', userAgent()]]
    };
    try {
        const response = await fetch(url, fetchParams);
        requestsToW3CApi++;
        await sleep(100);
        return response;
    }
    catch (err) {
        console.error(`Network error while fetching ${url}`);
        console.error(err);
        return null;
    }
}

/**
 * Most W3C API requests return responses that are paginated. This function
 * retrieves and merges all pages for a particular endpoint, using embedded
 * information if so requested.
 */
async function fetchW3CPages(endpoint, property, embed) {
    let nbPages = 1;
    let page = 1;
    let baseUrl = (endpoint.startsWith('https') ? '' : W3C_API) +
        endpoint + '?embed=' + (embed ? '1' : '0') +
        '&page=';
    let res = [];
    while (page <= nbPages) {
        const url = baseUrl + page;
        if (verbose) {
            console.log(`Fetching ${url}`);
        }
        const response = await fetchW3CApi(url);
        if (!response) {
            return null;
        }
        if (response.status !== 200) {
            console.error(`W3C API server error while fetching ${url}: HTTP status ${response.status} received`);
            return null;
        }
        const json = await response.json();
        nbPages = json.pages;
        const pageRes = embed ?
            json._embedded[property] :
            json._links[property];
        if (pageRes) {
            res = res.concat(pageRes);
        }
        page += 1;
    }
    return res;
}

/**
 * Return true if the entry in Specref contains outdated info about the spec
 * compared to the W3C API.
 *
 * Note the comparison is only about generic spec info (title, ED) as more
 * requests to the W3C API are needed to get more info about the spec.
 */
function containsOutdatedInfo(curr, w3cSpec, w3cLatestDate) {
    return makeKey(curr) <= w3cLatestDate &&
        (curr.href !== w3cSpec.shortlink ||
            curr.title !== w3cSpec.title ||
            curr.edDraft && w3cSpec['editor-draft'] &&
                curr.edDraft !== w3cSpec['editor-draft']);
}

/**
 * Return the latest publication date (format YYYYMMDD) of the given W3C spec
 */
function getLatestDate(w3cSpec) {
    const latestDateUrl = w3cSpec._links['latest-version'].href;
    return latestDateUrl.match(/versions\/(\d{8})$/)[1];
}

/**
 * Update the Specref entry from the data returned by the W3C API, fetching
 * additional detailed information about versions as needed.
 *
 * Note: to avoid sending too many requests to the W3C API, we assume that old
 * data about the list of editors and deliverers is correct. We will only fetch
 * that information for recent versions.
 */
async function updateSpecrefFromW3CApi(curr, w3cSpec, fromDate) {
    // Set base information returned by the W3C API
    curr.href = w3cSpec.shortlink;
    curr.title = w3cSpec.title;
    if (w3cSpec['editor-draft']) {
        curr.edDraft = w3cSpec['editor-draft'];
    }
    else if (curr.edDraft) {
        console.warn(`- ${w3cSpec.shortname}: ED URL in Specref but not in the W3C API - ${curr.edDraft}`);
    }
    curr.publisher = 'W3C';
    curr.source = w3cSpec._links.self.href;

    // Fetch the list of specs that supsersede the current entry, if needed.
    if (w3cSpec._links['superseded-by']) {
        curr.isSuperseded = true;
        const supersededBy = await fetchW3CPages(
            w3cSpec._links['superseded-by'].href, 'superseded', true);
        if (supersededBy) {
            curr.obsoletedBy = supersededBy.map(spec => spec.shortname);
        }
        else {
            console.error(`- ${w3cSpec.shortname}: could not retrieve the list of superseding specs from the W3C API`);
        }
    }
    else if (curr.isSuperseded || curr.obsoletedBy) {
        console.warn(`- ${w3cSpec.shortname}: superseded in Specref but not in the W3C API.`);
    }

    // Retrieve the list of versions from the W3C API. The list includes
    // versions directly associated with the specification, as well as those
    // that are relevant to the history of the spec but that are actually
    // associated with another specification. Let's drop the latter one (they
    // will be handled as part of that other specification).
    let versions = await fetchW3CPages(w3cSpec._links['version-history'].href, 'version-history', true);
    if (!versions) {
        console.error(`- ${w3cSpec.shortname}: could not retrieve versions info from the W3C API`);
        return;
    }
    versions = versions.filter(version =>
        version._links.specification.href === w3cSpec._links.self.href
    );
    versions.sort((v1, v2) => v1.date.localeCompare(v2.date));

    const latestVersion = versions[versions.length - 1];
    for (const version of versions) {
        version.rawDate = version.date;
        const key = makeKey(version);
        if (key > fromDate || version === latestVersion) {
            // Recent (or last) version, fetch editors and deliverers
            // (If that yields an error, we will just preserve whatever info
            // already exists in Specref until next time the script runs)
            version.editors = await fetchW3CPages(version._links.editors.href, 'editors', false);
            if (!version.editors) {
                console.error(`- ${w3cSpec.shortname} (${key}): could not retrieve the list of editors from the W3C API`);
            }
            version.deliverers = await fetchW3CPages(version._links.deliverers.href, 'deliverers', true);
            if (version.deliverers) {
                // Note: the W3C API associates very old specs with a fake
                // group named "unknownwg".
                version.deliverers = version.deliverers.filter(g =>
                    g.shortname !== 'unknownwg');
            }
            else {
                console.error(`- ${w3cSpec.shortname} (${key}): could not retrieve the list of deliverers from the W3C API`);
            }
        }
        if (!curr.versions) {
            curr.versions = {};
        }
        let currVersion = curr.versions[key];
        if (!currVersion) {
            // Unknown version in Specref, let's add it
            curr.versions[key] = {};
            currVersion = curr.versions[key];
        }
        else if (currVersion.aliasOf) {
            // Version was known as being an alias in Specref, let's align with
            // the W3C API instead and make it a concrete entry. We'll make the
            // other entry an alias of this one at the end if needed
            console.log(`- ${w3cSpec.shortname} (${key}): drop alias to ${currVersion.aliasOf} in Specref`);
            aliasesToInvert[currVersion.aliasOf] = w3cSpec.shortname + '-' + key;
            delete currVersion.aliasOf;
        }
        if (version.editors?.length > 0) {
            currVersion.authors = version.editors
                .map(editor => editor.title);
        }
        currVersion.href = version.uri;
        currVersion.title = version.title;
        currVersion.rawDate = version.rawDate;
        currVersion.status = getStatus(version, versions);
        currVersion.publisher = "W3C";
        if (version.deliverers?.length > 0) {
            // Note: the W3C API associates very old specs with a fake group
            // named "unknownwg".
            currVersion.deliveredBy = version.deliverers
                .map(group => group._links.homepage.href);
        }
        if (version.status === 'Retired') {
            currVersion.isRetired = true;
        }
        else if (currVersion.isRetired) {
            console.warn(`- ${w3cSpec.shortname} (${version.date}): retired in Specref but not in the W3C API, see ${version._links.self.href}`);
        }
        if (version.errata) {
            currVersion.hasErrata = version.errata;
        }
        else if (currVersion.hasErrata) {
            console.warn(`- ${w3cSpec.shortname} (${version.date}): errata in Specref but not in the W3C API - ${currVersion.hasErrata}`);
        }
        currVersion.source = version._links.self.href;
    }
    if (curr.versions) {
        curr.versions = helper.sortRefs(curr.versions);
    }

    // Complete base info with the info from the latest version
    curr.rawDate = latestVersion.date;
    curr.status = getStatus(latestVersion, versions);
    if (latestVersion.editors?.length > 0) {
        curr.authors = latestVersion.editors
            .map(editor => editor.title);
    }
    if (latestVersion.deliverers?.length > 0) {
        curr.deliveredBy = latestVersion.deliverers
            .map(group => group._links.homepage.href);
    }
    if (latestVersion.status === 'Retired') {
        curr.isRetired = true;
    }
    else if (curr.isRetired) {
        console.warn(`- ${w3cSpec.shortname}: retired in Specref but not in the W3C API.`);
    }
    if (latestVersion.errata) {
        curr.hasErrata = latestVersion.errata;
    }
    else if (curr.hasErrata) {
        if (versions.find(version => version.errata)) {
            // The errata link was for a previous version, it shouldn't be
            // kept as generic info since it's no longer current.
            delete curr.hasErrata;
        }
        else {
            console.warn(`- ${w3cSpec.shortname}: errata in Specref but not in the W3C API - ${curr.hasErrata}`);
        }
    }
}


/**
 * Update W3C references
 *
 * Steps:
 * 1. retrieve the list of >1600 specifications from the W3C API.
 * 2. use the "latest-version" link under "_links" to determine the last time
 * a spec got published.
 * 3. If that last time is greater than the last known version in Specref,
 * retrieve information about the new versions published since the last known
 * version, and update Specref.
 *
 * Note: We try to limit the number of updates because each update requires
 * sending a few network requests to the W3C API, which takes time.
 *
 * Note: In this model, the publication date is used as a synonym of the last
 * modification date for the data. That is correct in 99% of all cases. Once in
 * a while, the initial data in the W3C API needs fixing, and fixes will be
 * missed until the next time the spec gets published. Such errors are rare and
 * are usually detected and fixed within a few days after publication. To
 * be more resilient, the "sinceDate" parameter may be used to also consider
 * versions published after that date as worthy of being updated.
 */
async function updateW3CRefs(sinceDate, verbose) {
    // Entries use a compat format for dates
    sinceDate = sinceDate.replace(/\-/g, '');

    // Retrieve the list of W3C specifications from the W3C API.
    const specs = await fetchW3CPages('specifications', 'specifications', true);
    if (!specs) {
        console.error('- Could not retrieve the list of W3C specifications from the W3C API');
        return;
    }
    const mapped = [];
    for (const spec of specs) {
        const latestDate = getLatestDate(spec);

        // Note: for historical reasons, the W3C API uses shortnames for a few
        // very old specs that start with the specification status, for example
        // "WD-mux" instead of "mux". The exact list is hardcoded in
        // getShortName.
        const shortname = getShortName(spec.shortname);

        // Let's look for a corresponding entry in Specref. If none is found,
        // we'll add one. If one is found, we'll consider updating it, unless
        // the spec has not been published after the threshold date.
        // Note: for historical reasons, the W3C API lists ~30 legacy "specs"
        // that are not real specs but rather team submissions. These specs
        // had been removed from "tr.rdf" and have never been added to Specref.
        // The check on the date skips them ("real" specs published before 2000
        // are already in Specref, and a `curr` will be found for them).
        let curr = current[shortname] ?? current[shortname.toUpperCase()];
        if (!curr && !(shortname in bibref.get(shortname)) &&
                latestDate >= '2000') {
            // Some W3C specs have shortnames that do not match the shortname
            // that appears in the /TR URL. That is usually because the
            // shortname evolved over time for some reason, usually because
            // of a change in the way versions/levels were handled. Specref
            // often knows these specs under the shortname that appears in the
            // /TR URL. One such practical example is "rdf11-turtle", published
            // at https://www.w3.org/TR/turtle/ and known as "turtle".
            const altShortname = getShortName(spec.shortlink);
            curr = current[altShortname] ?? current[altShortname.toUpperCase()];
            if (!curr && !(altShortname in bibref.get(altShortname))) {
                console.log(`- ${spec.shortname} (${latestDate}): add the spec to Specref`);
                curr = { rawDate: '' };
                current[shortname] = curr;
            }
            else {
                const altSpec = specs.find(spec => spec.shortname === altShortname);
                if (altSpec) {
                    // The alternate shortname also exists in the W3C API.
                    // That happens rarely, but signals that the spec went
                    // through multiple cycles in the W3C API, typically one as
                    // a non-leveled instance, and one as a leveled instance.
                    // Two known examples:
                    // - uievents-old / uievents
                    // - performance-timeline-1 / performance-timeline
                    // Specref typically merges both entries. Let's ignore the
                    // "old" W3C API entry when that happens.
                    const altLatestDate = getLatestDate(altSpec);
                    if (altLatestDate > latestDate) {
                        continue;
                    }
                }
                console.log(`- ${spec.shortname} (${latestDate}): /TR shortname "${altShortname}" used in Specref`);
            }
        }
        if (curr && !curr.aliasOf && makeKey(curr) > latestDate) {
            // Specref has more recent info about the spec than the W3C API.
            // That happens when the W3C API uses multiple entries for what
            // Specref considers to be the same spec, usually because of
            // versioning (examples: performance-timeline, user-timing).
            // TODO: Improve information in Specref once specification series
            // are supported.
            console.log(`- ${spec.shortname} (${latestDate}): more recent info (${makeKey(curr)}) in Specref`);
            continue;
        }
        if (!curr) {
            // Ignore the spec, it's either known in Specref from a different
            // source or it's a very old spec that did not appear in tr.rdf for
            // some reason and that no one raised as worthy of addition since
            // Specref started listing W3C specs.
            if (latestDate >= '2000') {
                console.log(`- ${spec.shortname} (${latestDate}): spec in another source in Specref`);
            }
            else {
                console.log(`- ${spec.shortname} (${latestDate}): legacy spec not in Specref`);
            }
            continue;
        }

        // Record the fact that we found a mapping between the Specref entry
        // and the W3C entry.
        if (mapped.find(entry => entry === curr)) {
            console.error(`- ${spec.shortname} (${latestDate}): second mapping for ${curr.href} in Specref, how come?`);
        }
        mapped.push(curr);

        // We could update all specs, but an update potentially requires
        // sending lots of requests to the W3C API, so the goal is to do that
        // only for a limited number of specs. We'll look at the latest version
        // of the spec that Specref knows about. If a "more recent" version of
        // the spec was published, the entry in Specref needs to be updated. To
        // trap potential data fixes that may have been made shortly after
        // publication, we'll also force an update if the last publication was
        // recent enough.
        if (curr.aliasOf) {
            // The handful of aliases caught here were typically added manually
            // for some reason, usually because a new level of the spec was
            // published. For example: "png-2" maps to "PNG" in Specref (that's
            // the /TR shortname), and "PNG" is an alias of "png-3" in Specref.
            // The aliases are for older versions of the spec in any case, they
            // can be ignored.
            console.log(`- ${spec.shortname} (${latestDate}): alias of ${curr.aliasOf} in Specref`);
        }
        else if (latestDate > makeKey(curr)) {
            console.log(`- ${spec.shortname} (${latestDate}): add recently published versions to Specref`);
            await updateSpecrefFromW3CApi(curr, spec,
                makeKey(curr) > sinceDate ? sinceDate : makeKey(curr));
        }
        else if (latestDate > sinceDate) {
            console.log(`- ${spec.shortname} (${latestDate}): refresh recently published versions in Specref`);
            await updateSpecrefFromW3CApi(curr, spec,
                makeKey(curr) > sinceDate ? sinceDate : makeKey(curr));
        }
        else if (containsOutdatedInfo(curr, spec, latestDate)) {
            console.log(`- ${spec.shortname} (${latestDate}): update outdated info in Specref`);
            await updateSpecrefFromW3CApi(curr, spec, '');
        }
    }

    // In theory, all Specref entries (except aliases) should have a
    // corresponding entry in the W3C API. If not, something is wrong!
    for (const [shortname, entry] of Object.entries(current)) {
        if (mapped.find(e => e === entry)) {
            // All good, we already mapped the entry to a W3C entry
            continue;
        }
        if (entry.aliasOf) {
            // Aliases are essentially created once and for all. They need to
            // be preserved forever, no need to worry too much about them.
            continue;
        }
        if (shortname.match(/-\d{8}$/)) {
            // These dated entries were typically added to Specref to preserve
            // links that would otherwise have disappeared, following a change
            // of shortname. Same as with aliases, we need to preserve them
            // forever.
            continue;
        }
        const spec = specs.find(spec =>
            spec.shortname.toLowerCase() === shortname.toLowerCase() ||
            spec.shortlink === entry.href);
        if (spec) {
            continue;
        }
        if (!entry.href.match(/^https:\/\/www\.w3\.org\/TR\//)) {
            console.error(`- ${shortname}: not a /TR spec, should be moved to refs/biblio.json (href: ${entry.href})`);
            continue;
        }

        // The W3C API listing does not include superseded specs by
        // default. Let's check whether the spec is one of them.
        const url = W3C_API + 'specifications/' + shortname;
        if (verbose) {
            console.log(`Fetching ${url}`);
        }
        const resp = await fetchW3CApi(url);
        if (!resp) {
            console.error(`- ${shortname}: could not retrieve info from the W3C API`);
        }
        else if (resp.status === 200) {
            const json = await resp.json();
            if (json._links?.['superseded-by']) {
                entry.isSuperseded = true;
                const supersededBy = await fetchW3CPages(
                    json._links['superseded-by'].href, 'superseded', true);
                if (supersededBy) {
                    entry.obsoletedBy = supersededBy.map(spec => spec.shortname);
                }
                else {
                    console.error(`- ${shortname}: could not retrieve the list of superseding specs from the W3C API`);
                }
            }
            else if (json.shortname !== shortname) {
                console.log(`- ${shortname}: alias of ${json.shortname} in the W3C API`);
            }
            else {
                console.error(`- ${shortname}: exists in the W3C API but not returned in the default listing, why?`);
            }
        }
        else if (resp.status === 404) {
            console.error(`- ${shortname}: unknown to the W3C API, how come?`);
        }
        else {
            console.error(`- ${shortname}: could not retrieve info from the W3C API, HTTP status ${resp.status} received`);
        }
    }

    console.log("Invert aliases that we turned into concrete entries...");
    for (const [name, alias] of Object.entries(aliasesToInvert)) {
        // Look for the previously targeted entry.
        // If it does not exist, that's fine, we'll just ignore it.
        // Tests will catch any hiccup we may create in any case.
        const match = name.match(/^(.+)-([^-]+)/);
        if (!match) {
            continue;
        }
        entry = current[match[1]];
        if (!entry || !entry.versions) {
            continue;
        }
        if (entry.versions[match[2]]) {
            console.log(`- ${match[1]} (${match[2]}): make alias of ${alias}`);
            entry.versions[match[2]] = { aliasOf: alias };
        }
    }

    console.log("Sorting references...");
    const sorted = helper.sortRefs(current);

    console.log("Updating obsoletes properties...");
    const superseders = {};
    for (const [shortname, entry] of Object.entries(current)) {
        if (entry.obsoletes) {
            delete entry.obsoletes;
        }
        for (const superseder of (entry.obsoletedBy ?? [])) {
            if (!superseders[superseder]) {
                superseders[superseder] = [];
            }
            superseders[superseder].push(shortname);
        }
    }
    for (const [shortname, obsoletes] of Object.entries(superseders)) {
        const entry = current[shortname];
        if (!entry) {
            continue;
        }
        obsoletes.sort();
        entry.obsoletes = obsoletes;
    }

    console.log("Writing file...");
    helper.writeBiblio(FILENAME, sorted);
    helper.tryOverwrite(FILENAME);
}

if (!since) {
    // Compute the most recent W3C spec date in Specref, and substract a
    // few weeks to get a threshold date beyond which we consider that the
    // data in Specref no longer needs to be updated.
    const latestUpdate = Object.values(current).reduce((version, curr) =>
        curr.rawDate > version ? curr.rawDate : version, '');
    const twoWeeks = 2 * 7 * 24 * 60 * 60 * 1000;
    const thresholdDate = new Date(latestUpdate);
    thresholdDate.setTime(thresholdDate.getTime() - twoWeeks);
    since = thresholdDate
        .toISOString()
        .substring(0, 10);
}

const start = Date.now();
if (start - (new Date(since)).getTime() > 365 * 24 * 3600 * 1000) {
    // A full update can take more than an hour. Let's alert the user
    // (text on a red background).
    console.warn("\x1b[41mBeware, update may take a while, possibly more than an hour!\x1b[0m");
}

console.log(`Updating W3C references since ${since}...`);
updateW3CRefs(since)
    .then(_ => {
        const end = Date.now();
        const duration = Math.round((end - start) / 1000);
        console.log(`Done updating W3C references in ${duration} seconds, ${requestsToW3CApi} requests sent to the W3C API`);
    });
