import * as json from 'jsonc-parser';



function parseJson(jsonDoc: string) {
    const node = json.parseTree(jsonDoc);
    const componentsNode = json.findNodeAtLocation(node, ["components"]);

    const refNode = json.findNodeAtLocation(componentsNode!, [0, "ref"]);
    console.info(refNode?.offset);
}

export type DocumentElement = {
    value: any,
    offset: number,
    length?: number
};

export class ReferenceFragment {

    #providing: DocumentElement | null = null;

    constructor(private name: DocumentElement) {
    }

    getName() {
        return this.name;
    }

    setAskProviding(serviceInterfaceName: DocumentElement) {
        this.#providing = serviceInterfaceName;
    }

    asksProviding(serviceInterfaceName: string): boolean {
        return this.isAsksProviding() && this.#providing!.value === serviceInterfaceName;
    }

    getAskProviding() {
        return this.#providing;
    }

    isAsksProviding() {
        return this.#providing !== null;
    }

}


export class ComponentFragment {

    #provides: DocumentElement[] = [];
    #references: ReferenceFragment[] = [];

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
    addReferences(...references: ReferenceFragment[]) {
        this.#references.push(...references);
    }
    referencesAskProviding(serviceInterfaceName: string) {
        return this.#references.filter((reference) => reference.asksProviding(serviceInterfaceName));
    }

};

export default class ManifestDocument {

    #components: ComponentFragment[] = [];
    #manifestNode: json.Node;
    #allProvides: Map<string, Set<ComponentFragment>> = new Map();
    #allProviding: Map<string, Set<ReferenceFragment>> = new Map();

    private constructor(private documentContent: string) {
        this.#manifestNode = json.parseTree(documentContent);
        this.#components = this.parseComponents(this.#manifestNode);
    }

    static fromString(content: string): ManifestDocument {
        return new ManifestDocument(content);
    }

    getAllProvides(serviceInterfaceName: string): Set<ComponentFragment> {
        return this.#allProvides.get(serviceInterfaceName) || new Set();
    }

    getAllProviding(serviceInterfaceName: string): Set<ReferenceFragment> {
        return this.#allProviding.get(serviceInterfaceName) || new Set();
    }

    private registerProvides(provides: DocumentElement[], component: ComponentFragment) {
        provides.forEach((providesItem) => {
            let allComponents = this.#allProvides.get(providesItem.value);
            if (!allComponents) {
                allComponents = new Set();
                this.#allProvides.set(providesItem.value, allComponents);
            }
            allComponents.add(component);
        });
    }
    private registerProviding(providing: DocumentElement, reference: ReferenceFragment) {
        let allReferences = this.#allProviding.get(providing.value);
        if (!allReferences) {
            allReferences = new Set();
            this.#allProviding.set(providing.value, allReferences);
        }
        allReferences.add(reference);
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
            const provides = this.parseProvides(componentNode);
            component.addProvides(...provides);
            component.addReferences(...this.parseReferences(componentNode));

            this.registerProvides(provides, component);
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
        return providesNode.children!.map(({ value, offset }) => {
            return { value, offset };
        });
    }

    private parseReferences(componentNode: json.Node): ReferenceFragment[] {
        const referencesNode = json.findNodeAtLocation(componentNode, ["references"]);
        if (!referencesNode?.children) {
            return [];
        }
        return referencesNode.children.map((referenceNode) => {
            const nameNode = json.findNodeAtLocation(referenceNode, ["name"]);
            const nameElement = toElementWithDefault(nameNode, null, referenceNode.offset);

            const referenceFragment = new ReferenceFragment(nameElement);

            const providingNode = json.findNodeAtLocation(referenceNode, ["providing"]);

            if (!providingNode) {
                return referenceFragment;
            }
            const providing = {
                value: providingNode.value,
                offset: providingNode.offset,
                length: providingNode.length
            };

            referenceFragment.setAskProviding(providing);
            this.registerProviding(providing, referenceFragment);

            return referenceFragment;
        }).filter((reference) => reference.isAsksProviding());

    }

    getComponents(): ComponentFragment[] {
        return this.#components;
    }

}

function toElementWithDefault(node: json.Node | undefined, valueDefault: string | null, offsetDefault: number): DocumentElement {
    if (!node) {
        return {
            value: valueDefault,
            offset: offsetDefault
        };
    }
    return {
        value: node.value,
        offset: node.offset
    };

}
