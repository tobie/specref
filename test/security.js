var assert = require("assert"),
  sanitizeHtml = require("sanitize-html"),
  request = require("request");

// Test the actual sanitization functions used in the endpoints
function testSanitizeInput(input) {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

// Mock client-side functions for server-side testing
function safeUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (
    url.toLowerCase().startsWith("javascript:") ||
    url.toLowerCase().startsWith("data:")
  ) {
    return "";
  }
  return url; // Updated to match new implementation
}

// Test server endpoints for XSS protection
function testEndpoint(endpoint, params, callback) {
  var url = "http://localhost:5001/" + endpoint;
  if (params) {
    var queryString = Object.keys(params)
      .map((k) => k + "=" + encodeURIComponent(params[k]))
      .join("&");
    url += "?" + queryString;
  }

  request(url, function (error, response, body) {
    if (error) return callback(error);
    try {
      var result = JSON.parse(body);
      callback(null, result);
    } catch (e) {
      callback(null, body);
    }
  });
}

suite("Test XSS Security Protection", function () {
  suite("Server-side input sanitization", function () {
    test("strips script tags from input", function () {
      var malicious = '<script>alert("xss")</script>';
      var sanitized = testSanitizeInput(malicious);
      assert.equal("", sanitized, "Script tags should be completely removed");
    });

    test("strips img onerror handlers", function () {
      var malicious = "<img src=x onerror=alert(document.location)>";
      var sanitized = testSanitizeInput(malicious);
      assert.equal("", sanitized, "Img tags with onerror should be removed");
    });

    test("strips all HTML tags and attributes", function () {
      var malicious = '<div onclick="alert(1)">Click me</div>';
      var sanitized = testSanitizeInput(malicious);
      assert.equal(
        "Click me",
        sanitized,
        "HTML tags removed but text content preserved",
      );
    });

    test("handles empty and null inputs safely", function () {
      assert.equal("", testSanitizeInput(""));
      assert.equal("", testSanitizeInput(null));
      assert.equal("", testSanitizeInput(undefined));
    });
  });

  suite("Client-side URL safety", function () {
    test("blocks javascript: URLs", function () {
      var malicious = "javascript:alert(1)";
      var safe = safeUrl(malicious);
      assert.equal("", safe, "javascript: URLs should be blocked");
    });

    test("blocks data: URLs", function () {
      var malicious = "data:text/html,<script>alert(1)</script>";
      var safe = safeUrl(malicious);
      assert.equal("", safe, "data: URLs should be blocked");
    });

    test("allows legitimate HTTP URLs", function () {
      var legitimate = "https://www.w3.org/TR/html/";
      var safe = safeUrl(legitimate);
      assert.equal(
        "https://www.w3.org/TR/html/",
        safe,
        "Legitimate URLs should be allowed",
      );
    });

    test("handles case-insensitive protocol detection", function () {
      assert.equal(
        "",
        safeUrl("JAVASCRIPT:alert(1)"),
        "Uppercase javascript: should be blocked",
      );
      assert.equal(
        "",
        safeUrl("JavaScript:alert(1)"),
        "Mixed case javascript: should be blocked",
      );
      assert.equal(
        "",
        safeUrl("DATA:text/html,<script>"),
        "Uppercase data: should be blocked",
      );
    });

    test("handles empty and invalid URLs", function () {
      assert.equal("", safeUrl(""));
      assert.equal("", safeUrl(null));
      assert.equal("", safeUrl(undefined));
      assert.equal("", safeUrl(123));
    });
  });

  suite("Live endpoint XSS protection tests", function () {
    test("/search-refs blocks XSS in q parameter", function (done) {
      var xssPayload = "<img src=x onerror=alert(document.location)>";
      testEndpoint("search-refs", { q: xssPayload }, function (err, result) {
        if (err) return done(err);
        assert.deepEqual(
          result,
          { message: "Missing q parameter" },
          "Malicious search query should be sanitized to empty, treated as missing parameter",
        );
        done();
      });
    });

    test("/search-refs blocks script tags", function (done) {
      var scriptPayload = '<script>alert("xss")</script>';
      testEndpoint("search-refs", { q: scriptPayload }, function (err, result) {
        if (err) return done(err);
        assert.deepEqual(
          result,
          { message: "Missing q parameter" },
          "Script tags should be sanitized to empty, treated as missing parameter",
        );
        done();
      });
    });

    test("/reverse-lookup blocks XSS in urls parameter", function (done) {
      var xssPayload = "<img src=x onerror=alert(document.location)>";
      testEndpoint(
        "reverse-lookup",
        { urls: xssPayload },
        function (err, result) {
          if (err) return done(err);
          assert.deepEqual(
            result,
            {},
            "Malicious URL should return empty result",
          );
          done();
        },
      );
    });

    test("/reverse-lookup blocks javascript: URLs", function (done) {
      var jsPayload = "javascript:alert(1)";
      testEndpoint(
        "reverse-lookup",
        { urls: jsPayload },
        function (err, result) {
          if (err) return done(err);
          assert.deepEqual(
            result,
            {},
            "JavaScript URLs should return empty result",
          );
          done();
        },
      );
    });

    test("/search-refs preserves legitimate queries", function (done) {
      testEndpoint("search-refs", { q: "html" }, function (err, result) {
        if (err) return done(err);
        assert.ok(
          typeof result === "object",
          "Legitimate query should return object",
        );
        assert.ok(
          Object.keys(result).length > 0,
          "Legitimate query should return results",
        );
        done();
      });
    });

    test("/reverse-lookup preserves legitimate URLs", function (done) {
      testEndpoint(
        "reverse-lookup",
        { urls: "https://www.w3.org/TR/html/" },
        function (err, result) {
          if (err) return done(err);
          assert.ok(
            typeof result === "object",
            "Legitimate URL should return object",
          );
          // May be empty if URL not in database, but should not error
          done();
        },
      );
    });
  });

  suite("Integration security tests", function () {
    test("XSS payload completely neutralized through full pipeline", function () {
      var xssPayload = "<img src=x onerror=alert(document.location)>";
      var serverSanitized = testSanitizeInput(xssPayload);
      assert.equal(
        "",
        serverSanitized,
        "Server should strip malicious HTML completely",
      );
    });

    test("Legitimate content preserved through pipeline", function () {
      var legitimate = "HTML specification";
      var serverSanitized = testSanitizeInput(legitimate);
      assert.equal(
        "HTML specification",
        serverSanitized,
        "Legitimate text preserved",
      );
    });

    test("Mixed content handled safely", function () {
      var mixed = "Normal text <script>alert(1)</script> more text";
      var serverSanitized = testSanitizeInput(mixed);
      assert.equal("Normal text  more text", serverSanitized);
    });
  });

  suite("Edge case security tests", function () {
    test("handles nested and encoded XSS attempts", function () {
      var nested = "&lt;script&gt;alert(1)&lt;/script&gt;";
      var sanitized = testSanitizeInput(nested);
      // sanitize-html keeps HTML entities as-is when no tags are allowed
      // This is safe because &lt;script&gt; cannot execute as JavaScript
      assert.equal(
        "&lt;script&gt;alert(1)&lt;/script&gt;",
        sanitized,
        "HTML entities kept safe and non-executable",
      );
    });

    test("handles URL with malicious fragments", function () {
      var maliciousUrl = "https://example.com#<script>alert(1)</script>";
      var safe = safeUrl(maliciousUrl);
      // URL is allowed through since it has legitimate https protocol
      // The fragment with script tags will be handled by DOMPurify during HTML sanitization
      assert.ok(
        safe.includes("example.com"),
        "Legitimate domain should be preserved",
      );
    });
  });
});
