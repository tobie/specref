#!/usr/bin/env node
'use strict';
const async = require('async');
const { JSDOM } = require('jsdom');
const request = require('request');
const userAgent = require("./user-agent");
const helper = require('./helper');

const FILENAME = "unicode.json";
const current = helper.readBiblio(FILENAME);

const MAX_REPORT = 100;
const skip = new Set([
    // Stabilized
    6, 16, 22, 26,

    // Old versions of Unicode
    4, 8, 27, 28,

    // Other superseded
    1, 2, 3, 5, 7, 13, 19, 21,

    // Withdrawn or suspended
    12, 20, 30, 32, 40, 47, 49, 52,

    // Nonexistent
    43, 48,

    // Not in HTML
    25, 54,
]);

async.each(range(1, MAX_REPORT), (num, cb) => {
    if (skip.has(num)) {
        console.log('Skipping report #' + num);
        cb();
        return;
    }

    const url = `https://www.unicode.org/reports/tr${num}/`;
    console.log('Fetching', url, '...');
    request({
        url,
        headers: {
            'User-Agent': userAgent()
        }
    }, (err, response, body) => {
        if (err || response.statusCode !== 200) {
            console.log("Can't fetch", url);
            cb();
            return;
        }
        console.log('Parsing', url, '...');
        const dom = new JSDOM(body, { url });
        const { document } = dom.window;
        const type = document.title.slice(0, 3);
        if (type !== 'UTS' && type !== 'UTR' && type !== 'UAX') {
            console.log('Unable to parse title', document.title);
            cb();
            return;
        }
        const id = type + num;
        const statusEl = document.querySelector('.body > h2');
        if (!statusEl) {
            console.log('Unable to find status');
            cb();
            return;
        }
        const status = trimText(statusEl.textContent);

        const titleEl = statusEl.nextElementSibling;
        if (!titleEl || titleEl.tagName !== 'H1') {
            console.log('Unable to find title');
            cb();
            return;
        }
        let title = trimText(titleEl.textContent);
        if (!/[a-z]/.test(title))
            title = titleCase(title);

        const infoTableEl = document.querySelector('.body > table');
        const infoTable = infoTableEl && parseTable(infoTableEl);
        if (!infoTable) {
            console.log('Unable to find information table');
            cb();
            return;
        }

        const date = trimText(infoTable.Date);
        if (!date) {
            console.log('Unable to find date in table');
            cb();
            return;
        }
        let isRawDate = /\d{4}-\d{2}-\d{2}/.test(date);

        const href = processURL(infoTable['This Version'] || url);

        const authors = infoTable.Editor && parseEditor(infoTable.Editor);
        if (!authors) {
            console.log('Unable to find/parse editors in table');
            cb();
            return;
        }

        if (type !== 'UAX' && current[`UAX${num}`])
            current[`UAX${num}`] = { aliasOf: id };
        if (type !== 'UTR' && current[`UTR${num}`])
            current[`UTR${num}`] = { aliasOf: id };
        if (type !== 'UTS' && current[`UTS${num}`])
            current[`UTS${num}`] = { aliasOf: id };

        current[id] = {
            authors,
            etAl: authors.etAl,
            href,
            title,
            date: isRawDate ? undefined : date,
            rawDate: isRawDate ? date : undefined,
            status,
            publisher: 'Unicode Consortium'
        };
        cb();
    });
}, (err) => {
    if (err) {
        console.log('there was an error');
        console.error(err);
        return;
    }
    const output = {};
    for (const key of Object.keys(current).sort()) {
        output[key] = current[key];
    }
    helper.writeBiblio(FILENAME, output);
});

function* range(from, until) {
    for (let i = from; i <= until; i++)
        yield i;
}

function trimText(str) {
    return str.replace(/®/g, '').trim().replace(/\s+/g, ' ');
}

function titleCase(str) {
    return str.replace(/(\w)(\S*)/g, (_, first, rest) => first.toUpperCase() + rest.toLowerCase());
}

function gatherText(element) {
    let str = '';
    for (const node of element.childNodes) {
        if (node.nodeType === node.ELEMENT_NODE && node.tagName === 'BR')
            str += '\n';
        else
            str += trimText(node.textContent) + ' ';
    }
    return str;
}

function parseTable(tableEl) {
    const obj = {};
    for (const rowEl of tableEl.querySelectorAll('tr')) {
        if (rowEl.cells.length !== 2)
            return null;
        let key = trimText(rowEl.cells[0].textContent);
        if (key === 'Editors' || key === 'Author' || key === 'Authors')
            key = 'Editor';
        obj[key] = gatherText(rowEl.cells[1]);
    }
    return obj;
}

function processURL(str) {
    return trimText(str).replace(/^http:/, 'https:');
}

function parseEditor(str) {
    const arr = str.split(/\n|,|\band\b/g).map(ed => trimText(ed.replace(/\(.*/, ''))).filter(Boolean);
    if (/\bother\b/.test(arr[arr.length - 1])) {
        arr.pop();
        arr.etAl = true;
    }
    return arr;
}
