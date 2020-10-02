import * as json from 'jsonc-parser';


export class StringFragment implements Fragment {

    constructor(
        readonly key: string,
        readonly value: string,
        readonly section: Section) {
        }

    // static fromNode(node: json.Node, key: string):StringFragment {
    //     return new StringFragment(key, node.value.toString(), sectionFor(node));
    // }

    // static fromNodeWithDefault(node: json.Node, key: string, defaultValue: string):StringFragment {
    //     return new StringFragment(key, node.value? node.value.toString():defaultValue, sectionFor(node));
    // }

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
    // constructor(readonly offset = 0, readonly length = 0, readonly span: Span) {
    // }
    constructor(readonly start: LinePos, readonly end: LinePos){}
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

function* unknownName(): Generator<string> {
    let i: number = 0;
    while (true) {
        yield "unknown-name-" + (i++);
    }
  }

type LinePos = {
    line: number,
    col: number
};

type Span = {
    start: LinePos,
    end: LinePos
};

export default class ManifestDocument {

    
    #components: ComponentFragment[] = [];
    #allProvides: Map<string, Set<ComponentFragment>> = new Map();
    #allProviding: Map<string, Set<ReferenceFragment>> = new Map();
    #allServiceNames: Set<string> = new Set();
    #linebreakOffsets: number[];
    readonly name: string;

    private constructor(documentContent: string) {
        this.#linebreakOffsets = this.getLineBreakOffsets(documentContent);
        const manifestNode = json.parseTree(documentContent);
        this.#components = this.parseComponents(manifestNode);
        this.name = this.parseName(manifestNode) || unknownName().next().value;
    }

    static fromString(content: string): Promise<ManifestDocument> {
        return Promise.resolve(new ManifestDocument(content));
    }

    getLinePos(offset: number): LinePos {
        for (let index = 0; index < this.#linebreakOffsets.length; index++) {
            const element = this.#linebreakOffsets[index];
            if (offset <= element) {
                return {
                    line: index,
                    col: (index === 0) ? offset : offset - this.#linebreakOffsets[index - 1] - 1
                };
            }
        }

        return {
            line: this.#linebreakOffsets.length,
            col: offset - this.#linebreakOffsets[this.#linebreakOffsets.length - 1] - 1
        };
    }

    getLineBreakOffsets(text: string): number[] {
        const lbOffsets:number[] = [];

        let nextLb = 0;
        while (nextLb !== -1) {
            let lbOffset = text.indexOf("\n", nextLb);
            // Math.min(text.indexOf("\r\n", nextLb), text.indexOf("\n", nextLb));
            if (lbOffset !== -1) {
                lbOffsets.push(lbOffset);
                nextLb = lbOffset + 1;
            } else {
                nextLb = lbOffset;
            }
        }
        return lbOffsets;
    }

    getAllProvides(serviceInterfaceName: string): Set<ComponentFragment> {
        return this.#allProvides.get(serviceInterfaceName) || new Set();
    }

    getAllProviding(serviceInterfaceName: string): Set<ReferenceFragment> {
        return this.#allProviding.get(serviceInterfaceName) || new Set();
    }

    getAllServiceNames(): Set<string> {
        return this.#allServiceNames;
    }


    private registerProvides(provides: StringFragment[], component: ComponentFragment) {
        provides.forEach((providesItem) => {
            const serviceName = providesItem.value;
            let allComponents = this.#allProvides.get(serviceName);
            if (!allComponents) {
                allComponents = new Set();
                this.#allProvides.set(serviceName, allComponents);
            }
            allComponents.add(component);
            this.#allServiceNames.add(serviceName);
        });
    }

    private registerProviding(providing: StringFragment, reference: ReferenceFragment) {
        const serviceName = providing.value;
        let allReferences = this.#allProviding.get(serviceName);
        if (!allReferences) {
            allReferences = new Set();
            this.#allProviding.set(serviceName, allReferences);
        }
        allReferences.add(reference);
        this.#allServiceNames.add(serviceName);
    }

    private parseName(manifestNode: json.Node): string | undefined {
        return json.findNodeAtLocation(manifestNode, ["name"])?.value?.toString();
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
            const component = new ComponentFragment(this.stringFragmentFor(nameNode, "name"), this.sectionFor(componentNode));
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
                new StringFragment("provides", providesNode.value, this.sectionFor(providesNode))
            ];
        }

        //this must be an array
        return providesNode.children!.map((node) => {
            return new StringFragment("provides", node.value, this.sectionFor(node));
        });
    }

    private parseReferences(componentNode: json.Node): ReferenceFragment[] {
        const referencesNode = json.findNodeAtLocation(componentNode, ["references"]);
        if (!referencesNode?.children) {
            return [];
        }
        return referencesNode.children.map((referenceNode) => {
            const nameNode = json.findNodeAtLocation(referenceNode, ["name"]);
            const nameElement = this.stringFragmentFor(nameNode, "name");

            const referenceFragment = new ReferenceFragment(nameElement, this.sectionFor(referenceNode));

            const providingNode = json.findNodeAtLocation(referenceNode, ["providing"]);

            if (!providingNode) {
                return referenceFragment;
            }
            const providingProp = new StringFragment("providing", providingNode.value, this.sectionFor(providingNode));
            referenceFragment.setProviding(providingProp);
            this.registerProviding(providingProp, referenceFragment);

            return referenceFragment;
        }).filter((reference) => reference.hasProviding());

    }

    getComponents(): ComponentFragment[] {
        return this.#components;
    }

    private sectionFor(node: json.Node) {
        // const section = new Section(node.offset, node.length, this.getLine(node.offset), this.getLine(node.offset + node.length));
        const section = new Section(this.getLinePos(node.offset), this.getLinePos(node.offset + node.length));
        // section.startLine = this.getLine(node.offset);
        // section.endLine = this.getLine(node.offset + node.length);
        return section;
    }
    
    private stringFragmentFor(node: json.Node | undefined, key: string): StringFragment | undefined {
        if (!node || !node.value) {
            return undefined;
        }
    
        return new StringFragment(key, node.value, this.sectionFor(node));
    }

}


