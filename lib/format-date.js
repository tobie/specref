module.exports = function(str) {
    var date = str.split("-"),
        y = date[0],
        m = date[1],
        d = date[2],
        output = [];
        
    if (d) {
        output.push(Number(d));
    }
    if (m) {
        m = Number(m) - 1;
        output.push(MONTHS[m]);
    }
    output.push(y);
    return output.join(" ");
};

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