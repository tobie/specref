var MONTHS = {
    jan: "January",
    feb: "February",
    mar: "March",
    apr: "April",
    jun: "June",
    jul: "July",
    aug: "August",
    sep: "September",
    sept: "September",
    oct: "October",
    nov: "November",
    dec: "December"
};

var RAW_DATE = /^\d\d\d\d-(0\d|1[0-2])-[0-2]\d$/;
var MONTH_SHORTNAME = /\b[a-z]{3,}\b/i;
var UNDESIRED_CHAR = /[^0-9a-zA-Z\s]/g;
var LEADING_ZERO = /^0/;
var EXTRA_WS = /\s+/g;

module.exports = function(id, ref) {
    var output = {
        title: ref.title || "(Missing title)",
        href: ref.link,
	    status: ref.status
    }
    if (ref.author) {
        output.authors = [ref.author];
    } else if (ref.submitter) {
        output.authors = [ref.submitter];
    }
    if (ref.date && ref.date != "unknown" ) {
        if (RAW_DATE.test(ref.date)) {
            output.rawDate = ref.date;
        } else {
            output.date = ref.date.replace(MONTH_SHORTNAME, function(mmm) {
                return MONTHS[mmm.toLowerCase()] || mmm;
            }).replace(UNDESIRED_CHAR, "").replace(LEADING_ZERO, "").replace(EXTRA_WS, " ");
        }
    }
    
    return output;
}
