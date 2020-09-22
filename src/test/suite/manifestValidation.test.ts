const { assert } = require("chai");
const validate = require("./validate");


suite("manifest.json validation", function () {
    test("accepts minimal config", function () {
        assert.isTrue(validate(require("./files/manifest.json")));
    });
});
