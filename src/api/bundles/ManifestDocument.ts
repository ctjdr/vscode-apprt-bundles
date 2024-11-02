import * as json from 'jsonc-parser';
import MultiValueIndex from './MultiValueIndex';

export enum ValueType {
    "provides", 
    "referenceProviding",
    "reference",
    "component",
    "unknown"
}

export class StringFragment implements Fragment {

    constructor(
        readonly key: string,
        readonly value: string,
        readonly section: Section,
        readonly type: ValueType) {}
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
    #impl: StringFragment | undefined;
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

    getImpl() {
        return this.#impl;
    }

    setImpl(impl: StringFragment) {
        this.#impl = impl;
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

let i: number = 0;
function* unknownName(): Generator<string> {
    while (true) {
        yield "unknown-name-" + (i++);
    }
  }

export default class ManifestDocument {

    #line2StringValue: MultiValueIndex<number, StringFragment> = new MultiValueIndex();
    
    #components: ComponentFragment[] = [];
    #servicename2components: MultiValueIndex<string, ComponentFragment> = new MultiValueIndex();
    #servicename2references: MultiValueIndex<string, ReferenceFragment> = new MultiValueIndex();
    #servicename2provides: MultiValueIndex<string, StringFragment> = new MultiValueIndex();
    #servicename2providing: MultiValueIndex<string, StringFragment> = new MultiValueIndex();

    #allServiceNames: Set<string> = new Set();
    #linebreakOffsets: number[];
    readonly name: string;
    readonly version: string;

    private constructor(documentContent: string) {
        this.#linebreakOffsets = ManifestDocument.calcLineBreakOffsets(documentContent);
        const manifestNode = json.parseTree(documentContent);
        if (!manifestNode) {
            throw new Error("Cannot parse document");
        }
        this.#components = this.parseComponents(manifestNode);
        this.name = this.parseName(manifestNode) || unknownName().next().value;
        this.version = this.parseVersion(manifestNode) ?? "";
    }

    static fromString(content: string): Promise<ManifestDocument | undefined> {
        try {
            return Promise.resolve(new ManifestDocument(content));
        } catch (e) {
            return Promise.resolve(undefined);
        }

    }

    private getLinePos(offset: number): LinePos {
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

    public static calcLineBreakOffsets(text: string): number[] {
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

    getComponentsFor(serviceInterfaceName: string): Set<ComponentFragment> {
        return this.#servicename2components.getValues(serviceInterfaceName);
    }

    getReferencesFor(serviceInterfaceName: string): Set<ReferenceFragment> {
        return this.#servicename2references.getValues(serviceInterfaceName);
    }

    getProvidingFor(servicename: string) {
        return this.#servicename2providing.getValues(servicename);
    }
    
    getProvidesFor(servicename: string) {
        return this.#servicename2provides.getValues(servicename);
    }

    getServiceNames(): Set<string> {
        return this.#allServiceNames;
    }

    getComponents(): ComponentFragment[] {
        return this.#components;
    }

    /**
     * 
     * @param line zero-based line number
     */
    getStringFragmentsOnLine(line: number) {
        return this.#line2StringValue.getValues(line);
    }

    getStringFragmentLines() {
        return [...this.#line2StringValue.getKeys()];
    }


    private registerComponent(provides: StringFragment[], component: ComponentFragment) {
        provides.forEach((providesItem) => {
            const serviceName = providesItem.value;
            this.#servicename2components.index(serviceName, component);
            this.#allServiceNames.add(serviceName);
        });
    }

    private registerProviding(providing: StringFragment, reference: ReferenceFragment) {
        const serviceName = providing.value;
        this.#servicename2references.index(serviceName, reference);
        this.#allServiceNames.add(serviceName);
    }

    private parseName(manifestNode: json.Node): string | undefined {
        const nameNode = json.findNodeAtLocation(manifestNode, ["name"]) || json.findNodeAtLocation(manifestNode, ["Bundle-SymbolicName"]);
        return nameNode?.value?.toString();
    }

    private parseVersion(manifestNode: json.Node): string | undefined {
        const versionNode = json.findNodeAtLocation(manifestNode, ["version"]) || json.findNodeAtLocation(manifestNode, ["Bundle-Version"]);
        return versionNode?.value?.toString();
    }

    private parseComponents(manifestNode: json.Node): ComponentFragment[] {
        const componentsNode = json.findNodeAtLocation(manifestNode, ["components"]) || json.findNodeAtLocation(manifestNode, ["Components"]);
        if (!componentsNode?.children) {
            return [];
        }
        return componentsNode.children.flatMap((componentNode) => {
            const nameNode = json.findNodeAtLocation(componentNode, ["name"]);
            const implNode = json.findNodeAtLocation(componentNode, ["impl"]);
            if (!nameNode) {
                return [];
            }
            const component = new ComponentFragment(new StringFragment("name", nameNode.value, this.sectionFor(nameNode), ValueType.unknown),this.sectionFor(componentNode));
            if (implNode) {
                component.setImpl(new StringFragment("impl", implNode.value, this.sectionFor(implNode), ValueType.unknown));
            }
            const provides = this.parseProvides(componentNode);
            component.addProvides(...provides);
            component.addReferences(...this.parseReferences(componentNode));

            this.registerComponent(provides, component);
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
        if (type === ValueType.provides) {
            this.#servicename2provides.index(fragment.value, fragment);
        }
        if (type === ValueType.referenceProviding) {
            this.#servicename2providing.index(fragment.value, fragment);
        }
        this.registerStringFragment(fragment);
        return fragment;
    }

    private registerStringFragment(fragment: StringFragment) {
        const line = fragment.section.start.line;
        this.#line2StringValue.index(line, fragment);
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
            const nameElement = new StringFragment("name", nameNode.value, this.sectionFor(nameNode), ValueType.unknown);
            const providingProp = this.buildAndRegisterStringFragment("providing", providingNode, ValueType.referenceProviding);
            const referenceFragment = new ReferenceFragment(nameElement, this.sectionFor(referenceNode), providingProp);
            this.registerProviding(providingProp, referenceFragment);

            return [referenceFragment];
        });

    }

    private sectionFor(node: json.Node) {
        return new Section(this.getLinePos(node.offset), this.getLinePos(node.offset + node.length));
    }
    
}
