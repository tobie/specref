module.exports = function(str) {
    var d = str.split("-"),
        m = Number(d[1]) - 1;
    return (d[2] ? Number(d[2]) + " " : "") + MONTHS[m] + " " + d[0];
}

var MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];