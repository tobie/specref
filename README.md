SpecRef API
===========

[![Build Status](https://travis-ci.org/tobie/specref.png?branch=master)](https://travis-ci.org/tobie/specref)

[![Nodejitsu Deploy Status](https://webhooks.nodejitsu.com/tobie/specref.png)](https://webops.nodejitsu.com#tobie/specref)

## API

The API to the service is very simple. It supports two operations, each of which takes the same two parameters. CORS is enabled for all origins. 

The operations are: 

    GET http://specref.jit.su/bibrefs

Used to get a set of bibliographic references. 

    GET http://specref.jit.su/xrefs

Used to get a set of definition cross-references. 

The parameters, to be used in the query string, are: 

    refs=comma-separated list of reference IDs

This is the desired list of reference IDs separated by commas (with no spaces). 

    callback=name of the callback function

By default the service returns JSON data, which is great but not convenient for browsers that do not support CORS yet. For those, simply adding the `callback` parameter with the name of the callback function you want will switch the response to JSON-P. 

Some examples should help: 

    // get references for SVG, REX, and DAHUT
    GET http://specref.jit.su/bibrefs?refs=SVG,REX,DAHUT
    
    // the same as JSON-P
    GET http://specref.jit.su/bibrefs?refs=SVG,REX,DAHUT&callback=yourFunctionName
    
    // get cross-references for the CSS Object Model and File API specifications
    GET http://specref.jit.su/xrefs?refs=cssom,fileapi
    
    // the same as JSON-P
    GET http://specref.jit.su/xrefs?refs=cssom,fileapi&callback=yourFunctionName
            

If you need to find a reference ID (for either bibliographic or cross-references) you need to either lift it from an existing specification, or to find it in the source database. Where to get the latter is explained below. Please note that the identifiers for bibliographic references are not the same as for definition cross-references, and that just because a specification is featured in one does not mean it is also in the other. (Historically, those were two separate databased that were merged. Or, if you really insist on accuracy, the CSS bibref DB was converted into the ReSpec JS DB; the latter was extensively extended and edited, forked into the Specifiction database which was edited, then into the ReSpec v3 database which was also edited, then much of those were merged; in a parallel universe the Anolis bibliographical and cross-reference databases were developed; then all of these were merged into this service. So stop whining and delight in the consistency that you do have.) 

## Updating & Adding

You can make modifications to the databases simply by editing either `biblio.json` or `xrefs.json` in the [GitHub repository](https://github.com/tobie/specref). 

In order to do so you can fork the project and make a pull request to update it, or you can ask to be added as a project collaborator (we're pretty open about that) in which case you'll be able to push changes directly.

In both cases, all changes are automatically tested using [travis](https://travis-ci.org/tobie/specref/). If all tests pass, the changes are immediately (and automaitcally) deployed.

Some rules to observe when editing the databases follow. 

For both DBs: 

*   Before committing, make sure that your JSON is well-formed. Syntax-check it with a tool or some such. Broken JSON means it stops being synchronised to the DB, thereby annoying everyone, and it can even cause the service to stop functioning. Remember: we know unsavoury characters world-wide, and we can find out where you live. 
*   Don't remove entries unless you are 100% certain that no one is using it. Typically that only applies to cases in which you have just added a reference and want to remove it. This applies even if you find a duplicate entry — there are a few, such is life. 
*   Don't duplicate entries. Make treble-sure that what you want to add is not in the DB. Certainly don't add a duplicate entry just because you don't like the reference short name. 

For the cross-references DB: 

*   Entries in this database are typically automatically generated from a specification. If you find yourself hand-editing something here it is quite possible that you may be doing something wrong. Get in touch and we'll figure it out. 

For the bibliographical references DB: 

* Please use structured objects instead of raw strings as much as you possibly can.
* When you want to update an existing reference, if you see that it uses the old string style, please convert it to a structured object. 
* References in this database are expected to be to the “latest and greatest” version of a given specification. In some cases this may be the draft residing in the editor's repository, or it may be the latest snapshot as published by a Working Group into TR — this choice is left to your appreciation. If you really, *really* want to have a reference to a dated version, then use the `previousVersions` property like so:

```js
{
    "REFID": {
        "previousVersions": {
            "YYYYMMDD": {
                "href": "http://..."
            }
        }
    }, //...
}
```
* Keep the entries in alphabetical order. Try to indent them in roughly the same manner that others are.
