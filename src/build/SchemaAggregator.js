const $RefParser = require("@apidevtools/json-schema-ref-parser");
const fs = require('fs');
const path = require('path');

class SchemaAggregator {


    constructor(rootDir) {
        this.srcSchemaPath = path.resolve(rootDir, "src/schemas");
        this.targetSchemaPath = path.resolve(rootDir, "dist/schemas");
    }

    apply(compiler) {
        compiler.hooks.afterCompile.tap("SchemaAggregator", (compilation) => {
            $RefParser.bundle(path.resolve(this.srcSchemaPath, "manifest.schema.json")).then((jsonSchema) => {
                delete jsonSchema["$schema"];
                this.processDescriptions(jsonSchema, (obj) => {
                    const description = obj["description"];
                    delete obj["description"];
                    obj["description-short"] = description;
                });
                const bundledSchema = JSON.stringify(jsonSchema);
                if (!fs.existsSync(this.targetSchemaPath)) {
                    fs.mkdirSync(this.targetSchemaPath, {recursive: true});
                }
                fs.writeFileSync(path.resolve(this.targetSchemaPath, "manifest.schema.json"), bundledSchema);
            }, (rejected) => {
                console.error("Cannot load manfiest.json schema: " + rejected);    
            }
            );
        });
    }

    processDescriptions(obj, cb) {
        if (obj instanceof Array) {
            for (var i in obj) {
                this.processDescriptions(obj[i], cb);
            }
            return;
        }

        if (obj instanceof Object) {
            let description = obj["description"];
            if (typeof description === "string" || description instanceof String) {
                cb(obj);
            }
            let children = Object.keys(obj);
            if (children.length > 0) {
                for (let i = 0; i < children.length; i++) {
                    this.processDescriptions(obj[children[i]], cb);
                }
            }
        }
        return;
    }
}

module.exports = SchemaAggregator;