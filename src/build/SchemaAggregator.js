const $RefParser = require("@apidevtools/json-schema-ref-parser");
const fs = require('fs');
const path = require('path');

/**
 * Takes the manifest.json schema and creates a variant of it with all 'markdownDescription' properties stripped off.
 * This file is registered, when the user selects the "Toggle manifest documentation" option, where no doc hovers are diplayed in a manifest.json file.
 */
class SchemaAggregator {


    constructor(rootDir) {
        this.srcSchemaPath = path.resolve(rootDir, "src/schemas");
        this.targetSchemaPath = path.resolve(rootDir, "dist/schemas");
    }

    apply(compiler) {
        compiler.hooks.afterCompile.tap("SchemaAggregator", (compilation) => {
            $RefParser.bundle(path.resolve(this.srcSchemaPath, "manifest.schema.json")).then((jsonSchema) => {
                if (!fs.existsSync(this.targetSchemaPath)) {
                    fs.mkdirSync(this.targetSchemaPath, {recursive: true});
                }
                //Remove $schema element. This is a trick to make the json-language-server of vscode invalidate its schema cache.
                delete jsonSchema["$schema"];
                fs.writeFileSync(path.resolve(this.targetSchemaPath, "manifest.schema.json"),  JSON.stringify(jsonSchema));

                // recursively remove all 'markdownDescription' elements
                this.processDescriptions(jsonSchema, (obj) => {
                    delete obj["markdownDescription"];
                });
                const bundledSchema = JSON.stringify(jsonSchema);
                fs.writeFileSync(path.resolve(this.targetSchemaPath, "manifest.schema.short.json"), bundledSchema);
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
            let description = obj["markdownDescription"];
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