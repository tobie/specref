module.exports = function(id, ref) {
    return {
        href: encodeURI(ref.href),
        title: ref.title,
        publisher: ref.publisher,
        rawDate: ref.rawDate
    };
}
