import * as json from 'jsonc-parser';

export class StringFragment implements Fragment {

    constructor(
        readonly key: string,
        readonly value: string,
        readonly section: Section) {
        }

    static fromNode(node: json.Node, key: string):StringFragment {
        return new StringFragment(key, node.value.toString(), sectionFor(node));
    }

    static fromNodeWithDefault(node: json.Node, key: string, defaultValue: string):StringFragment {
        return new StringFragment(key, node.value? node.value.toString():defaultValue, sectionFor(node));
    }

}

/**
 * Block of a property value inside the manifest.json.
 */
export interface Fragment {
    section: Section;
    key: string;
}

/**
 * 
 */
export class Section {
    constructor(readonly offset = 0, readonly length = 0) {
    }
    
}

export class ReferenceFragment implements Fragment{

    #providing: StringFragment | null = null;
    #name: StringFragment | undefined;
    readonly section: Section;
    readonly key = "references";

    constructor(name: StringFragment | undefined, section: Section) {
        this.#name = name;
        this.section = section;
    }

    getName() {
        return this.#name;
    }

    setProviding(serviceInterfaceName: StringFragment | undefined) {
        if (serviceInterfaceName === undefined) {
            return;
        }
        this.#providing = serviceInterfaceName;
    }

    hasProvidingFor(serviceInterfaceName: string): boolean {
        return this.hasProviding() && this.#providing!.value === serviceInterfaceName;
    }

    getProviding() {
        return this.#providing;
    }

    hasProviding() {
        return this.#providing !== null;
    }

}


export class ComponentFragment implements Fragment {

    #provides: StringFragment[] = [];
    #references: ReferenceFragment[] = [];
    #name: StringFragment | undefined;
    readonly section: Section;
    readonly key = "components";

    constructor(name: StringFragment | undefined, section: Section) {
        this.#name = name;
        this.section = section;
    }

    getName() {
        return this.#name;
    }

    addProvides(...serviceInterfaceNames: StringFragment[]) {
        this.#provides.push(...serviceInterfaceNames);
    }
    provides(serviceInterfaceName: string) {
        return this.#provides.find((fragement) => fragement.value === serviceInterfaceName);
    }
    addReferences(...references: ReferenceFragment[]) {
        this.#references.push(...references);
    }
    referencesAskProviding(serviceInterfaceName: string) {
        return this.#references.filter((reference) => reference.hasProvidingFor(serviceInterfaceName));
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

    private registerProvides(provides: StringFragment[], component: ComponentFragment) {
        provides.forEach((providesItem) => {
            let allComponents = this.#allProvides.get(providesItem.value);
            if (!allComponents) {
                allComponents = new Set();
                this.#allProvides.set(providesItem.value, allComponents);
            }
            allComponents.add(component);
        });
    }
    private registerProviding(providing: StringFragment, reference: ReferenceFragment) {
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
            // if (!nameNode) {
            //     return new ComponentFragment(undefined, sectionFor(componentNode));
            // }
            const component = new ComponentFragment(stringFragmentFor(nameNode, "name"), sectionFor(componentNode));
            const provides = this.parseProvides(componentNode);
            component.addProvides(...provides);
            component.addReferences(...this.parseReferences(componentNode));

            this.registerProvides(provides, component);
            return component;
        });
    }

    private parseProvides(componentNode: json.Node): StringFragment[] {
        const providesNode = json.findNodeAtLocation(componentNode, ["provides"]);
        if (!providesNode) {
            return [];
        }
        if (providesNode.type === "string") {
            return [
                new StringFragment("provides", providesNode.value, sectionFor(providesNode))
            ];
        }

        //this must be an array
        return providesNode.children!.map((node) => {
            return new StringFragment("provides", node.value, sectionFor(node));
        });
    }

    private parseReferences(componentNode: json.Node): ReferenceFragment[] {
        const referencesNode = json.findNodeAtLocation(componentNode, ["references"]);
        if (!referencesNode?.children) {
            return [];
        }
        return referencesNode.children.map((referenceNode) => {
            const nameNode = json.findNodeAtLocation(referenceNode, ["name"]);
            const nameElement = stringFragmentFor(nameNode, "name");

            const referenceFragment = new ReferenceFragment(nameElement, sectionFor(referenceNode));

            const providingNode = json.findNodeAtLocation(referenceNode, ["providing"]);

            if (!providingNode) {
                return referenceFragment;
            }
            const providingProp = new StringFragment("providing", providingNode.value, sectionFor(providingNode));
            referenceFragment.setProviding(providingProp);
            this.registerProviding(providingProp, referenceFragment);

            return referenceFragment;
        }).filter((reference) => reference.hasProviding());

    }

    getComponents(): ComponentFragment[] {
        return this.#components;
    }

}

function sectionFor(node: json.Node) {
    return new Section(node.offset, node.length);
}

function stringFragmentFor(node: json.Node | undefined, key: string): StringFragment | undefined {
    if (!node || !node.value) {
        return undefined;
    }

    return new StringFragment(key, node.value, sectionFor(node));
}
