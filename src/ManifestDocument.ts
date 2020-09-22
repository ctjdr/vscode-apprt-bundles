import * as json from 'jsonc-parser';



function parseJson(jsonDoc: string) {
    const node = json.parseTree(jsonDoc);
    const componentsNode = json.findNodeAtLocation(node, ["components"]);

    const refNode = json.findNodeAtLocation(componentsNode!, [0, "ref"]);
    console.info(refNode?.offset);
}

type DocumentElement = {
    value: any,
    offset: number
};

class ReferenceFragment {
    
    #providing?: DocumentElement;
    
    constructor(private name: DocumentElement) {
    }

    getName() {
        return this.name;
    }

    setAskProviding(serviceInterfaceName: DocumentElement) {
        this.#providing = serviceInterfaceName;
    }
    
    asksProviding(serviceInterfaceName: string) {
        return this.#providing && this.#providing.value === serviceInterfaceName;
    }

}


class ComponentFragment {

    #provides: DocumentElement[] = [];

    constructor(private name: DocumentElement) {
    }

    getName() {
        return this.name;
    }

    addProvides(...serviceInterfaceNames: DocumentElement[]) {
        this.#provides.push(...serviceInterfaceNames);
    }
    provides(serviceInterfaceName: string) {
        return this.#provides.find((fragement) => fragement.value.toString() === serviceInterfaceName);
    }

};

export default class ManifestDocument {

    #components: ComponentFragment[] = [];
    #manifestNode: json.Node;

    private constructor(private documentContent: string) {
        this.#manifestNode = json.parseTree(documentContent);
        this.#components = this.parseComponents(this.#manifestNode);
    }

    static fromString(content: string): ManifestDocument {
        return new ManifestDocument(content);
    }

    private parseComponents(manifestNode: json.Node): ComponentFragment[] {
        const componentsNode = json.findNodeAtLocation(manifestNode, ["components"]);
        if (!componentsNode?.children) {
            return [];
        }
        return componentsNode.children.map((componentNode) => {
            const nameNode = json.findNodeAtLocation(componentNode, ["name"]);
            if (!nameNode) {
                return new ComponentFragment({ value: "unknown", offset: componentNode.offset });
            }
            const component = new ComponentFragment({ value: nameNode.value, offset: nameNode.offset });
            component.addProvides(...this.parseProvides(componentNode));
            return component;
        });
    }

    private parseProvides(componentNode: json.Node) {
        const providesNode = json.findNodeAtLocation(componentNode, ["provides"]);
        if (!providesNode) {
            return [];
        }
        if (providesNode.type === "string") {
            return [
                {
                    value: providesNode.value,
                    offset: providesNode.offset
                }
            ];
        }

        //this must be an array
        return providesNode.children!.map( ({value, offset}) => { 
            return { value, offset};
        });
    }

    private parseReferences(componentNode: json.Node): DocumentElement[] {
        const referencesNode = json.findNodeAtLocation(componentNode, ["references"]);
        if (!referencesNode?.children) {
            return [];
        }
        return referencesNode.children.map((referenceNode) => {
            const providingNode = json.findNodeAtLocation(referenceNode, ["providing"]);
            if (!providingNode) {
                return {
                    value: null,
                    offset: referenceNode.offset
                };
            }
            return {
                value: providingNode.value,
                offset: providingNode.offset
            };
        }).filter((docElem) => docElem.value !== null);

    }

    getComponents(): ComponentFragment[] {
        return this.#components;
    }

}
