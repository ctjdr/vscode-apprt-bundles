import * as json from 'jsonc-parser';

const jsonFile = {
    "name": "abc",
    "version": "1.0",
    "components": [
        {
            "name": "xyz",
            "ref": "123"
        }
    ]
};



function parseJson(jsonDoc: string) {
    json.parseTree(JSON.stringify(jsonFile)).type;
    console.info(jsonDoc);
}

export default parseJson; 
