module.exports = function(id, ref) {
    return {
        href: ref.href,
        title: ref.title,
        status: ref.status,
        publisher: ref.publisher,
        isRetired: ref.isRetired,
        rawDate: ref.rawDate
    };
}
