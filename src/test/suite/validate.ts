
const AJV = require('ajv');


const schema1 = require("../../schemas/manifest.schema.json");
const schema2 = require("../../schemas/component.schema.json");
const schema3 = require("../../schemas/support.schema.json");
const schema4 = require("../../schemas/layout.schema.json");
const schema5 = require("../../schemas/framework.schema.json");
    
const ajv = new AJV();
const validat = ajv.addSchema(schema2).addSchema(schema3).addSchema(schema4).addSchema(schema5).compile(schema1);


module.exports = function (data: any) {
    return validat(data);
};
