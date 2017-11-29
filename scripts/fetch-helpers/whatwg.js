module.exports = function(id, ref) {
    return {
        authors: ref.authors,
        href: ref.href,
        title: ref.title,
        obsoletedBy: ref.obsoletedBy,
        status: ref.status || "Living Standard"
    };
}
