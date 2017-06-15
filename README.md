Specref API [![Build Status](https://travis-ci.org/tobie/specref.png?branch=master)](https://travis-ci.org/tobie/specref)
===========

[Specref](http://www.specref.org/) is an open-source, community-maintained database of Web standards & related references.

## Table of Contents ##

* [API](#api)
  * [Get references](#get-a-set-of-bibliographic-references)
  * [Search references](#search-bibliographic-references)
  * [Reverse lookup](#reverse-lookup)
  * [Aliases](#aliases)
  * [Obsoleted references](#obsoleted-references)
  * [CORS](#cors)
  * [Examples](#examples)
* [Updating & adding new references](#updating--adding-new-references)
  * [Hourly auto-updating](#hourly-auto-updating)
  * [Manual changes](#manual-changes)
* [Licenses](#licenses)

## API

The API to the service is very simple. It supports three operations which are: 

###  Get a set of bibliographic references
    
[`GET https://api.specref.org/bibrefs?refs=FileAPI,rfc2119`](https://api.specref.org/bibrefs?refs=FileAPI,rfc2119)

parameters:

    refs=comma-separated,list,of,reference,IDs
    callback=nameOfCallbackFunction

returns: a JSON object indexed by IDs

```json
{
    "FileAPI": {
        "authors": [
            "Arun Ranganathan",
            "Jonas Sicking"
        ],
        "date": "12 September 2013",
        "deliveredBy": [
            {
                "shortname": "webapps",
                "url": "http://www.w3.org/2008/webapps/"
            }
        ],
        "edDraft": "http://dev.w3.org/2006/webapi/FileAPI/",
        "href": "http://www.w3.org/TR/FileAPI/",
        "id": "FileAPI",
        "publisher": "W3C",
        "status": "LCWD",
        "title": "File API"
    },
    "rfc2119": {
        "authors": [
            "S. Bradner"
        ],
        "date": "March 1997",
        "href": "http://www.ietf.org/rfc/rfc2119.txt",
        "id": "rfc2119",
        "publisher": "IETF",
        "status": "Best Current Practice",
        "title": "Key words for use in RFCs to Indicate Requirement Levels"
    }
}
```
    
### Search bibliographic references

[`GET https://api.specref.org/search-refs?q=coffee`](https://api.specref.org/search-refs?q=coffee)
    
parameters:

    q=search%20term
    callback=nameOfCallbackFunction

returns: a JSON object indexed by IDs

```json
{
    "rfc2324": {
        "authors": [
            "L. Masinter"
        ],
        "date": "1 April 1998",
        "href": "http://www.ietf.org/rfc/rfc2324.txt",
        "id": "rfc2324",
        "publisher": "IETF",
        "status": "Informational",
        "title": "Hyper Text Coffee Pot Control Protocol (HTCPCP/1.0)"
    },
    "rfc7168": {
        "authors": [
            "I. Nazar"
        ],
        "date": "1 April 2014",
        "href": "http://www.ietf.org/rfc/rfc7168.txt",
        "id": "rfc7168",
        "publisher": "IETF",
        "status": "Informational",
        "title": "The Hyper Text Coffee Pot Control Protocol for Tea Efflux Appliances (HTCPCP-TEA)"
    }
}
```

Used to get a set of bibliographic references that include the search term in any of their attributes. This is usefull to find specs related to a given area of study, specs by a given editor, etc.
    
### Reverse Lookup

[`GET https://api.specref.org/reverse-lookup?urls=http://www.w3.org/TR/2012/WD-FileAPI-20121025/`](https://api.specref.org/reverse-lookup?urls=http://www.w3.org/TR/2012/WD-FileAPI-20121025/)

parameters:

    urls=comma-separated,list,of,reference,URLs.
    callback=nameOfCallbackFunction

returns: a JSON object indexed by URLs

```json
{
    "http://www.w3.org/TR/2012/WD-FileAPI-20121025/": {
        "authors": [
            "Arun Ranganathan",
            "Jonas Sicking"
        ],
        "date": "12 September 2013",
        "deliveredBy": [
            {
                "shortname": "webapps",
                "url": "http://www.w3.org/2008/webapps/"
            }
        ],
        "edDraft": "http://dev.w3.org/2006/webapi/FileAPI/",
        "href": "http://www.w3.org/TR/FileAPI/",
        "id": "FileAPI",
        "publisher": "W3C",
        "status": "LCWD",
        "title": "File API"
    }
}
```

Notice this finds you the canonical version of a spec and not the precise version the URL points to.
This is by design.

### Aliases

Because of legacy references, case sensivity issues and taste, many entries have multiple identifiers. Thus an aliasing system was put in place. It isn't _that_ complicated really: an identifier either points directly to the reference object or to another identifier (through the `aliasOf` property), recursively. All aliases are resolved (there are tests for that) and when you query the API for a reference you always get all the objects necessary to resolve it in the same response. So for example, https://api.specref.org/bibrefs?refs=rfc7230 responds with:

```json
{
    "rfc7230": {
        "authors": [
            "R. Fielding, Ed.",
            "J. Reschke, Ed."
        ],
        "date": "June 2014",
        "href": "https://tools.ietf.org/html/rfc7230",
        "id": "rfc7230",
        "publisher": "IETF",
        "status": "Proposed Standard",
        "title": "Hypertext Transfer Protocol (HTTP/1.1): Message Syntax and Routing"
    }
}
```

while https://api.specref.org/bibrefs?refs=HTTP11 gives you:

```json
{
    "HTTP11": {
        "aliasOf": "RFC7230",
        "id": "HTTP11"
    },
    "RFC7230": {
        "aliasOf": "rfc7230",
        "id": "RFC7230"
    },
    "rfc7230": {
        "authors": [
            "R. Fielding, Ed.",
            "J. Reschke, Ed."
        ],
        "date": "June 2014",
        "href": "https://tools.ietf.org/html/rfc7230",
        "id": "rfc7230",
        "publisher": "IETF",
        "status": "Proposed Standard",
        "title": "Hypertext Transfer Protocol (HTTP/1.1): Message Syntax and Routing"
    }
}
```

Which let's you get to the data by using a simple `while` loop over the response. The contract guaranteed by the API is to always let you resolve aliases.

Now whether you decide to display the result as `[HTTP1]`, `[rfc7230]`, `[RFC7230]`, or even `[1]` is up to you. Of course, it's silly to reference both `[HTTP1]` and `[rfc7230]` in the same specification, but that's something for the editors and/or their tools to avoid.

### Obsoleted references

Some entries have an `obsoletedBy` property which contains an array of identifiers.
These identifiers reference specifications that replace this one and can be queried separately from the database.

Like aliases, these identifiers are resolved (there are tests for that), but, unlike aliases, they are not returned with the response to the initial query.

Note that these identifiers can themselves point to aliases or have their own `obsoletedBy` property, recursively.

### CORS

**CORS is enabled for all origins.** By default the service returns JSON data, which is great but not convenient for browsers that do not support CORS yet. For those, simply adding the `callback` parameter with the name of the callback function you want will switch the response to JSON-P.

### Examples

Some examples should help: 

    // get references for SVG, REX, and DAHUT
    GET https://api.specref.org/bibrefs?refs=SVG,REX,DAHUT
    
    // the same as JSON-P
    GET https://api.specref.org/bibrefs?refs=SVG,REX,DAHUT&callback=yourFunctionName

If you need to find a reference ID (for either bibliographic or cross-references) you need to look for it on [specref.org](http://specref.org).

## Updating & Adding New References

### Hourly Auto-Updating

There are scripts that pull fresh data from IETF, W3C, and WHATWG, and update their relevant files in the `refs` directory. These are now run hourly. Their output is tested, comitted and deployed without human intervention. Content should now always be up to date.

### Manual Changes

You can make modifications to the database by editing `refs/biblio.json` in the [GitHub repository](https://github.com/tobie/specref). 

To do so, fork the project and send a pull request. Note you can ask to be added as a project collaborator (we're pretty open about that) so you can merge your changes directly.

All changes are automatically tested using [travis](https://travis-ci.org/tobie/specref/) and automatically deployed if all tests pass. 
You can run the tests locally by [installing node.js](https://nodejs.org/en/download/), project dependencies (by running `$ npm install` from the root of the repository) and running `$ npm test`. The test suite is quite large and can take a few minutes to run.

Some rules to observe when editing the database files: 

*   If you have commit rights, don't commit to master directly. Commit to a seperate branch (preferably to your fork) and send a pull request. Only merge the pull request to master once travis is green.
*   Don't remove entries unless you are 100% certain that no one is using it. Typically that only applies to cases in which you have just added a reference and want to remove it.
*   Don't duplicate entries. Make sure that what you want to add is not in the DB. If it is, add an alias.
*   Please use structured objects instead of raw strings as much as you possibly can.
*   The format for structured objects is [described in JSON-schema](./schemas/raw-reference.json). The schema is used to test new entries, so you better abide by it. :)  _(Note I'm still looking for a tool to turn the JSON schema into something more easily consumed by human beings. Let me know if you have an idea, or better yet, send a pull request.)_
*   When you want to update an existing reference, if you see that it uses the old string style, please convert it to a structured object. 
* References in this database are expected to be to the “latest and greatest” version of a given specification. In some cases this may be the draft residing in the editor's repository, or it may be the latest snapshot as published by a Working Group into TR — this choice is left to your appreciation. If you really, *really* want to have a reference to a dated version, then use the `versions` property like so:

```js
{
    "REFID": {
        "versions": {
            "YYYYMMDD": {
                "href": "http://..."
            }
        }
    }, //...
}
```

## Licenses

* Specref Reference Database (all files in [refs/](./refs/)): <span xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/" about="http://www.specref.org/"><a rel="license" href="http://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0 Universal</a></span>
* Code (all other files): [Apache License Version 2.0](./LICENSE)
