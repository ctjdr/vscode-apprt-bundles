import * as json from 'jsonc-parser';


export enum ValueType {
    "provides", 
    "referenceProviding",
    "reference",
    "component",
    "unknown"
}

export class StringFragment implements Fragment {
    
    readonly type: ValueType;

    constructor(
        readonly key: string,
        readonly value: string,
        readonly section: Section,
        type?: ValueType) {
            this.type = type ?? ValueType.unknown;
        }
}

/**
 * Block of a property value inside the manifest.json.
 */
export interface Fragment {
    section: Section;
    key: string;
    type: ValueType;
}

export class Section {
    constructor(readonly start: LinePos, readonly end: LinePos){}

    contains(line: number, col: number) {
        if (line < this.start.line || line > this.end.line) {
            return false;
        }

        if (line === this.start.line && col < this.start.col) {
            return false;
        }

        if (line === this.end.line && col > this.end.col) {
            return false;
        }
        
        return true;
    }
}

type LinePos = {
    line: number,
    col: number
};

export class ReferenceFragment implements Fragment {

    #providing: StringFragment | null;
    #name: StringFragment | undefined;
    readonly section: Section;
    readonly key = "references";
    readonly type = ValueType.reference;

    constructor(name: StringFragment, section: Section, providing?: StringFragment) {
        this.#name = name;
        this.section = section;
        this.#providing = providing ?? null;
    }

    getName() {
        return this.#name;
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
    readonly type = ValueType.component;

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
        return this.#references.filter((reference) => reference.hasProviding() && reference.getProviding()!.value === serviceInterfaceName);
    }

};

function* unknownName(): Generator<string> {
    let i: number = 0;
    while (true) {
        yield "unknown-name-" + (i++);
    }
  }

export default class ManifestDocument {

    #line2StringValue: Map<number, Set<StringFragment>> = new Map();
    
    #components: ComponentFragment[] = [];
    #allProvides: Map<string, Set<ComponentFragment>> = new Map();
    #allProviding: Map<string, Set<ReferenceFragment>> = new Map();
    #allServiceNames: Set<string> = new Set();
    #linebreakOffsets: number[];
    readonly name: string;

    private constructor(documentContent: string) {
        this.#linebreakOffsets = this.calcLineBreakOffsets(documentContent);
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

    private calcLineBreakOffsets(text: string): number[] {
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

    /**
     * 
     * @param line zero-based line number
     */
    getStringFragmentsOnLine(line: number) {
        return this.#line2StringValue.get(line);
    }


    registerStringFragment(fragment: StringFragment) {
        const line = fragment.section.start.line;
        let lineFragments = this.#line2StringValue.get(line);
        if (!lineFragments) {
            lineFragments = new Set<StringFragment>(); 
            this.#line2StringValue.set(line, lineFragments);
        }
        lineFragments.add(fragment);
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
        return componentsNode.children.flatMap((componentNode) => {
            const nameNode = json.findNodeAtLocation(componentNode, ["name"]);
            if (!nameNode) {
                return [];
            }
            const component = new ComponentFragment(new StringFragment("name", nameNode.value, this.sectionFor(nameNode)),this.sectionFor(componentNode));
            const provides = this.parseProvides(componentNode);
            component.addProvides(...provides);
            component.addReferences(...this.parseReferences(componentNode));

            this.registerProvides(provides, component);
            return [component];
        });
    }

    private parseProvides(componentNode: json.Node): StringFragment[] {
        const providesNode = json.findNodeAtLocation(componentNode, ["provides"]);
        if (!providesNode) {
            return [];
        }
        if (providesNode.type === "string") {
            return [
                this.buildAndRegisterStringFragment("provides", providesNode, ValueType.provides)
            ];
        }

        //this must be an array
        return providesNode.children!.map((node) => {
            return this.buildAndRegisterStringFragment("provides", node, ValueType.provides);
        });
    }

    private buildAndRegisterStringFragment(key: string, node: json.Node, type: ValueType): StringFragment {
        const fragment = new StringFragment(key, node.value, this.sectionFor(node), type);
        this.registerStringFragment(fragment);
        return fragment;
    }

    private parseReferences(componentNode: json.Node): ReferenceFragment[] {
        const referencesNode = json.findNodeAtLocation(componentNode, ["references"]);
        if (!referencesNode?.children) {
            return [];
        }
        return referencesNode.children.flatMap( (referenceNode) => {
            const nameNode = json.findNodeAtLocation(referenceNode, ["name"]);
            if (!nameNode){
                return[];
            }   
            
            const providingNode = json.findNodeAtLocation(referenceNode, ["providing"]);
            
            if (!providingNode) {
                return [];
            }
            const nameElement = new StringFragment("name", nameNode.value, this.sectionFor(nameNode));
            const providingProp = this.buildAndRegisterStringFragment("providing", providingNode, ValueType.referenceProviding);
            const referenceFragment = new ReferenceFragment(nameElement, this.sectionFor(referenceNode), providingProp);
            this.registerProviding(providingProp, referenceFragment);

            return [referenceFragment];
        });

    }

    getComponents(): ComponentFragment[] {
        return this.#components;
    }

    private sectionFor(node: json.Node) {
        return new Section(this.getLinePos(node.offset), this.getLinePos(node.offset + node.length));
    }
    
}


