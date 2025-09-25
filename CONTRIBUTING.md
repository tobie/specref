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

Supported overwrite actions:

*   **`delete`** - Remove a reference entirely
*   **`createAlias`** - Create an alias pointing to another reference
*   **`renameTo`** - Rename a reference ID (preserving versions)
*   **`replaceProp`** - Replace a property value
*   **`deleteProp`** - Remove a property

Example overwrite file:
```json
[
  {
    "id": "OBSOLETE-SPEC",
    "action": "delete"
  },
  {
    "id": "WEBIDL",
    "action": "replaceProp",
    "prop": "versions",
    "value": { "20161215": { "href": "...", "status": "REC" } }
  }
]
```

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
*   The format for structured objects is [described in JSON-schema](./schemas/raw-reference.json). The schema is used to test new entries, so you better abide by it. :)  _(Note I'm still looking for a tool to turn the JSON schema into something more easily consumed by human beings. Let me know if you have an idea, or better yet, send a pull request.)_
*   When you want to update an existing reference, if you see that it uses the old string style, please convert it to a structured object. Edit both `refs/biblio.json` and `refs/legacy.json` in the same pull request, or you won't pass validation.
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