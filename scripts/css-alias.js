/**
 * Script creates alias for CSS specs
 * see https://github.com/tobie/specref/issues/563
 */
const { promises: fs } = require("fs");
const w3cSpecsPath = require("path").resolve(__dirname, "../refs/w3c.json");

// Some are delta specs, or not stable enough to
// be used as the canonical ones.
const overrides = new Map([["css-grid", "css-grid-1"]]);

(async () => {
  const data = await fs.readFile(w3cSpecsPath);
  const obj = JSON.parse(data);

  // Store the keys in canonical form as lowercase to make sure
  // we don't override existing ones
  const canonicalKeys = Object.keys(obj).reduce((map, key) => {
    return map.set(key.toLowerCase(), key);
  }, new Map());

  // Find all the CSS WG specs that are not already aliased in "obj"
  // by taking the "greater" level
  const aliasMap = Object.keys(obj)
    // Find css-what-ever-number
    .filter(key => key.startsWith("css") && /-\d$/.test(key))
    .reduce((map, spec) => {
      let key = spec.slice(0, -2);
      // if this key already exists, potentially update it
      // to latest spec
      if (canonicalKeys.has(key.toLowerCase())) {
        key = canonicalKeys.get(key.toLowerCase());
      }
      if (overrides.has(key)) {
        map.set(key, overrides.get(key));
      } else if (!map.has(key) || spec > map.get(key)) {
        map.set(key, spec);
      }
      return map;
    }, new Map());

  // Create the "aliasOf" entries
  Array.from(aliasMap.entries()).reduce((obj, [key, aliasOf]) => {
    obj[key] = { aliasOf };
    return obj;
  }, obj);

  // Insert the aliasOf entries in the right order
  const sortedObj = Object.keys(obj)
    .sort()
    .reduce((sortedObj, key) => {
      sortedObj[key] = obj[key];
      return sortedObj;
    }, {});

  // Write the file back out
  const json = JSON.stringify(sortedObj, null, 4) + "\n";
  await fs.writeFile(w3cSpecsPath, json, "utf-8");
})();
