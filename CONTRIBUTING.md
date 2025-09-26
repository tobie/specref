# Contributing to Specref

Thank you for your interest in contributing to Specref! This document explains how to contribute to the Specref reference database.

## Table of Contents

* [Commit rights](#commit-rights)
* [Review policy](#review-policy)
* [Hourly auto-updating](#hourly-auto-updating)
* [Overwrite files for auto-generated data corrections](#overwrite-files-for-auto-generated-data-corrections)
* [Manual changes](#manual-changes)

## Commit rights

Specref loosely follows the process described in [The Pull Request Hack](http://felixge.de/2013/03/11/the-pull-request-hack.html). Contributors are generally granted commit access to the repo after their first pull request is successfully merged.

It's expected contributors read-up on how to make [manual changes](#manual-changes) and follow the [review policy](#review-policy) described below.

## Review policy

The review policy has three key principles:

1. Get non-trivial changes reviewed by someone.
2. You can merge trivial changes yourself, but allow enough time for others to comment on them before you do.
3. Never merge a pull request unless GitHub Actions checks are green.

We trust contributors to be a good judge of what is trivial, what isn't, and how long to wait before merging a trivial fix. Generally, the more trivial the fix, the shorter the wait.

Similarly, the more a commit message explains the _why_ of a slightly unexpected fix, the less it requires a review.

For example, for a fix that changes an existing HTTPS url to an HTTP one:

### Bad:

```
Updating URL.
```
### Good:

```
There now exists a Persistent URI Registry of EU Institutions and Bodies[1]
which is to be used when referencing such documents.
Unfortunately it doesn't use HTTPS yet.

[1]: http://data.europa.eu/
```

## Hourly auto-updating

There are [scripts](scripts/run-all) that pull fresh data from IETF, W3C, WHATWG, and other organizations, and update their relevant files in the `refs` directory. These are now run hourly. Their output is tested, committed and deployed without human intervention. Content should now always be up to date.

## Overwrite files for auto-generated data corrections

The `overwrites/` directory contains JSON files that allow post-processing modifications to auto-generated reference data. Each file corresponds to a reference file (e.g., `overwrites/whatwg.json` modifies `refs/whatwg.json`) and contains an array of actions to perform on specific references.

### Overwrite Instructions

Each overwrite file contains an array of instructions. Each instruction is a JSON object that modifies auto-generated reference data.

#### `delete` instruction - Remove a reference entirely

Use this to remove unwanted references from auto-generated data:

```json
{ "id": "OBSOLETE-SPEC", "action": "delete" }
```

#### `replaceProp` instruction - Replace a property value

Use this to fix incorrect property values in auto-generated references:

```json
{
  "id": "rfc1384",
  "action": "replaceProp",
  "prop": "obsoletedBy",
  "value": ["rfc1617"]
}
```

#### `deleteProp` instruction - Remove a property

Use this to remove unwanted properties from auto-generated references:

```json
{ "id": "SPEC-ID", "action": "deleteProp", "prop": "propertyName" }
```

#### `createAlias` instruction - Create an alias pointing to another reference

Use this to add alias references that point to existing entries:

```json
{ "id": "NEW-ALIAS", "action": "createAlias", "aliasOf": "TARGET-SPEC" }
```

#### `renameTo` instruction - Rename a reference ID (preserving versions)

Use this to change a reference ID while maintaining version history:

```json
{ "id": "OLD-ID", "action": "renameTo", "newId": "NEW-ID" }
```

### Complete Example

An overwrite file with multiple instructions:

```json
[
  {
    "id": "N4764",
    "action": "replaceProp",
    "prop": "title",
    "value": "Editors' Report: Programming Languages C++"
  },
  {
    "id": "draft",
    "action": "delete"
  },
  {
    "id": "WEBIDL",
    "action": "replaceProp",
    "prop": "versions",
    "value": {
      "20161215": {
        "href": "https://www.w3.org/TR/2016/REC-WebIDL-1-20161215/",
        "status": "REC"
      }
    }
  }
]
```

This example shows three instructions: fixing a title, removing an unwanted reference, and adding version history.

Overwrites are applied automatically after each auto-update, allowing corrections to auto-generated data without manual intervention in the main reference files.

## Manual changes

Generally, manual changes should be limited to the `refs/biblio.json` file.

If you have commit rights, please don't commit to main directly. Commit to a separate branch (preferably to your fork) and send a pull request.

All changes are automatically tested using GitHub Actions and automatically deployed within minutes if all tests pass. You can check that your changes have been properly deployed on [www.specref.org](http://www.specref.org/), @-mention @tobie in a pull request comment if they haven't.

You can run the tests locally by [installing node.js](https://nodejs.org/en/download/), project dependencies (by running `$ npm install` from the root of the repository) and running `$ npm test`. The test suite is quite large and can take a few minutes to run.

Some rules to observe when editing the `refs/biblio.json` file:

*   Don't remove entries unless you are 100% certain that no one is using it. Typically that only applies to cases in which you have just added a reference and want to remove it.
*   Don't duplicate entries. Make sure that what you want to add is not in the DB. If it is, add an alias.
*   Please use structured objects instead of raw strings.
*   Always favor HTTPS URLs.
*   The format for structured objects is [described in JSON-schema](./schemas/raw-reference.json). The schema is used to test new entries, so you better abide by it. :)

### Reference Entry Format

Reference entries are JSON objects with the following structure:

#### Basic Reference

Use this format to add a new specification reference:

```json
{
  "REFERENCE-ID": {
    "title": "Specification Title",
    "href": "https://example.org/spec/",
    "authors": ["Author Name", "Another Author"],
    "rawDate": "2023-01-01",
    "status": "Working Draft",
    "publisher": "Organization Name"
  }
}
```

This creates a new reference that can be cited as `[REFERENCE-ID]` in specifications.

#### Common Properties

**Required:**
* `title` - The specification title

**Recommended for manual entries:**
* `href` - URL to the specification (always use HTTPS)
* `authors` - Array of author names (include both authors and editors)
* `rawDate` - Machine-readable date in YYYY-MM-DD format (preferred over `date`)
* `status` - Publication status (e.g., "REC", "WD", "NOTE")
* `publisher` - Publishing organization
* `edDraft` - URL to the editor's draft (if available)

**Optional:**
* `date` - Human-readable publication date (use `rawDate` instead when possible)
* `obsoletedBy` - Array of reference IDs that obsolete this spec
* `obsoletes` - Array of reference IDs this spec obsoletes
* `repository` - URL to the specification's repository

**Primarily for automation (avoid in manual entries):**
* `deliveredBy` - Array of working group URLs (auto-populated from W3C API)
* `source` - URL of the data source (automatically added by fetching scripts)
* `rfcNumber` - RFC identifier (automatically extracted for IETF specs)
* `isoNumber` - ISO identifier (automatically extracted for ISO specs)

#### Aliases

Use this format when multiple reference IDs should point to the same specification:

```json
{
  "ALIAS-ID": {
    "aliasOf": "TARGET-REFERENCE-ID"
  }
}
```

This allows both `[ALIAS-ID]` and `[TARGET-REFERENCE-ID]` to resolve to the same reference data. Useful for handling different naming conventions or legacy reference IDs.

#### Versioned References

Use this format when you need to reference specific dated versions of a specification:

```json
{
  "REFERENCE-ID": {
    "title": "Specification Title",
    "href": "https://example.org/spec/",
    "versions": {
      "20230101": {
        "href": "https://example.org/spec/20230101/",
        "date": "1 January 2023"
      }
    }
  }
}
```

This allows citing both the current version as `[REFERENCE-ID]` and the specific dated version as `[REFERENCE-ID-20230101]`. The main reference should point to the "latest and greatest" version, while versions capture historical snapshots.
* References in this database are expected to be to the "latest and greatest" version of a given specification. In some cases this may be the draft residing in the editor's repository, or it may be the latest snapshot as published by a Working Group into TR — this choice is left to your appreciation. If you really, *really* want to have a reference to a dated version, then use the `versions` property like so:

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
* If "Authors" and "Editors" are mentioned in a specification, both should be listed under the `authors` field of an entry.