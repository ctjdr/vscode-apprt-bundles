import { Validator, ValidatorResult } from "jsonschema";
import * as fs from "fs";

export class DescriptionAggregator {


    private aggregationMap: {
        [key: string]: string | undefined;
    } = {};

    private validator;
    private schema1: any;

    constructor(private schemaPath: string) {
        this.validator = new Validator();
        this.validator.attributes["description-short"] = (instance, schema: any, options, ctx) => {

            this.aggregationMap[ctx.propertyPath.replace(/\[\d+\]/g, ".0").slice(9)] = schema["description-short"];

            return new ValidatorResult(instance, schema, options, ctx);
        };

        this.schema1 = JSON.parse(fs.readFileSync(`${schemaPath}/manifest.schema.json`, "utf8"));
    }

    findDescription(path: (string | number)[], unknownText?: string) {
        const pathString = path.map((elem) => (typeof elem === "number") ? 0 : elem).join(".");
        const descriptionText = this.aggregationMap[pathString];
        if (descriptionText === undefined && unknownText !== undefined) {
            this.aggregationMap[pathString] = unknownText;
            return unknownText;
        }
        return descriptionText;
    }

    create(doc: any) {
        const t0 = new Date().getTime();
        this.validator.validate(doc, this.schema1);
        console.info(`Validation took ${new Date().getTime() - t0} ms`);

    }
}
