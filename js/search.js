var REF_STATUSES = {
    "NOTE":     "W3C Note"
,   "WG-NOTE":  "W3C Working Group Note"
,   "ED":       "W3C Editor's Draft"
,   "FPWD":     "W3C First Public Working Draft"
,   "WD":       "W3C Working Draft"
,   "LCWD":     "W3C Last Call Working Draft"
,   "CR":       "W3C Candidate Recommendation"
,   "PR":       "W3C Proposed Recommendation"
,   "PER":      "W3C Proposed Edited Recommendation"
,   "REC":      "W3C Recommendation"
};

function highlight(txt, searchString) {
    var regexp = new RegExp("(<[^>]+>)|(" + searchString + ")", "gi");
    return (txt || "").replace(regexp, function wrap(_, tag, txt) {
        if (tag) return tag;
        return "<strong class='highlight'>" + txt + "</strong>";
    });
}

function stringifyRef(ref) {
    if (typeof ref === "string") return ref;
    var output = "";
    if (ref.authors && ref.authors.length) {
        output += ref.authors.join("; ");
        if (ref.etAl) output += " et al";
        output += ". ";
    }
    if (ref.href) output += '<a href="' + ref.href + '"><cite>' + ref.title + "</cite></a>. ";
    else output += '<cite>' + ref.title + '</cite>. ';
    if (ref.date) output += ref.date + ". ";
    if (ref.status) output += (REF_STATUSES[ref.status] || ref.status) + ". ";
    if (ref.href) output += 'URL:&nbsp;<a href="' + ref.href + '">' + ref.href + "</a>";
    if (ref.edDraft) output += ' ED:&nbsp;<a href="' + ref.edDraft + '">' + ref.edDraft + "</a>";
    return output;
};

function pluralize (count, sing, plur) {
    return count + ' ' + (count == 1 ? sing : plur);
}
function buildResults(json) {
    var html = "", count = 0;
    for (var k in json) {
        var obj = json[k];
        if (!obj.aliasOf) {
            count++;
            html += "<dt>[" + (obj.id || k) + "]</dt><dd>" + stringifyRef(obj) + "</dd>";
        }
    }
    return { html: html, count: count };
}

function msg(query, count) {
    if (count) {
        return 'We found ' + pluralize(count, 'result', 'results') + ' for your search for "' + query + '".';
    }
    return 'Your search for "' + query + '" did not match any references in the Specref database.<br>Sorry. :\'(';
}


function setup($root) {
    var $search = $root.find("input[type=search]");
    var $status = $("#status");
    var $results = $root.find("dl");
    
    function fetch(query, callback) {
        $.when(
            $.getJSON("https://specref.herokuapp.com/search-refs", { q: query }),
            $.getJSON("https://specref.herokuapp.com/reverse-lookup", { urls: query })
        ).done(function(search, revLookup) {
            var ref;
            search = search[0],
            
            revLookup = revLookup[0];
            for (var k in revLookup) {
                ref = revLookup[k];
                search[ref.id] = ref;
            }
            var results = buildResults(search);
            results.raw = search;
            callback(null, results);
        });
    }
    $root.find("form").on("submit", function() {
        var query = $search.val();
        if (query) {
            $status.html("Searching…");
            fetch(query, function(err, output) {
                window.history && window.history.pushState(null, '', queryToUrl(query));
                update(query, output);
            });
        }
        return false;
    });
    
    function update(query, output) {
        $results.html(highlight(output.html, query));
        $status.html(msg(query, output.count));
        $search.select();
    }
    
    function search() {
        query = queryFromLocation();
        if (!query) return;
        $search.val(query);
        $status.html("Searching…");
        fetch(query, function(err, output) {
            update(query, output);
        });
    }
    window.onpopstate = search;
    
    function queryFromLocation() {
        var obj = {};
        (window.location.href.split('?')[1] || '').split('&').forEach(function(str) {
            str = (str || "").split('=');
            obj[str[0]] = str[1];
        });
        return obj.q ? decodeURIComponent(obj.q) : null;
    }
    
    function queryToUrl(query) {
        return location.pathname + "?q=" + encodeURIComponent(query);
    }
    
    search();
    $search.focus();
}

function metadata(refcount, timeago) {
    function formatRefCount(n) {
        n = ""+n;
        var l = n.length;
        return n.substr(0, l - 3) +  "," + n.substr(l - 3, l);
    }
    
    function formatTime(delta) {
        delta = Math.floor(delta / 60000); // minutes
        if (delta < 1) return "less than a minute ago";
        if (delta == 1) return "a minutes ago";
        if (delta < 60) return delta + " minutes ago";
        delta = Math.floor(delta / 60); // hours
        if (delta == 1) return "an hour ago";
        if (delta < 24) return delta + " hours ago";
        delta = Math.floor(delta / 24); // days
        if (delta == 1) return "a day ago";
        if (delta < 7) return delta + " days ago";
        delta = Math.floor(delta / 7); // weeks
        if (delta == 1) return "a week ago";
        return delta + " weeks ago";
    }
    
    $.getJSON("https://specref.herokuapp.com/metadata").then(function(data) {
        refcount.html(formatRefCount(data.refCount));
        timeago.html(" (last one " + formatTime(data.runningFor) + ")");
    });
}
