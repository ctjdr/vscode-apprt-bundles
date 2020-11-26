

suite("manifest.json validation", function () {
    const { assert } = require("chai");
    const validate = require("./validate");
    test("accepts minimal config", function () {
        assert.isTrue(validate(require("../files/manifest.json")));
    });
});
