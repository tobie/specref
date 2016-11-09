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

module.exports = function(id, ref) {
    var output = {
        title: ref.title,
        href: ref.link,
	    status: ref.status
    }
    if (ref.author) {
        output.authors = [ref.author];
    } else if (ref.submitter) {
        output.authors = [ref.submitter];
    }
    if (ref.date && ref.date != "unknown" ) {
        if (/^\d\d\d\d-(0\d|1[0-2])-[0-2]\d$/.test(ref.date)) {
            output.rawDate = ref.date;
        } else {
            output.date = ref.date.replace(/\b[a-z]{3,}\b/i, function(mmm) {
                return MONTHS[mmm.toLowerCase()] || mmm;
            }).replace(/[^0-9a-zA-Z\s]/g, "").replace(/^0/, "").replace(/\s+/g, " ");
        }
    }
    
    return output;
}
