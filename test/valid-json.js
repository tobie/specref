var assert = require('assert'),
    fs = require('fs');

suite('biblio.json', function() {
  test('is valid JSON', function() {
    var file = fs.readFileSync('./refs/biblio.json');
    assert.doesNotThrow(function() {
        JSON.parse(file);
    }, "biblio.json is well formatted JSON.");
  });
  
  test('is an object', function() {
      var file = fs.readFileSync('./refs/biblio.json');
      assert.ok(typeof JSON.parse(file) == 'object', "Parsing biblio.json yields an object.");
  });
});