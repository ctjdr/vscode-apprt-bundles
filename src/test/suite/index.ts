import jsonParser from "./jsonParser";

const { assert } = require("chai");
const validate = require("./validate");
const path = require("path");
const glob = require("glob");


describe("manifest.json validation", function () {
    it("accepts minimal config", function () {
        assert.isTrue(validate(require("./files/manifest.json")));
    });
    it("tests", function() {
        jsonParser("Jan Drewnak");
    });
});
