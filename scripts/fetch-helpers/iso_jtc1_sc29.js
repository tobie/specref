module.exports = function(id, ref) {
    return {
        href: ref.href,
        title: ref.title,
        status: ref.status,
        publisher: ref.publisher,
        isoNumber: ref.isoNumber,
        isRetired: ref.isRetired,
        isSuperseded: ref.isSuperseded,
        rawDate: ref.rawDate,
        obsoletedBy: ref.obsoletedBy
    };
}
