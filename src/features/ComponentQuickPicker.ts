import { CancellationToken, commands, Disposable, DocumentSymbol, DocumentSymbolProvider, languages, Location, Position, ProviderResult, QuickPickItem, Range, SymbolInformation, SymbolKind, TextDocument, TextEditorRevealType, window } from "vscode";
import { BundleIndex } from "../bundles/BundleIndex";
import { manifestFilesSelector, noManifestFile } from "../extension";
import { rangeOfSection } from "./Range";

class ComponentItem implements QuickPickItem {
    label: string = "";
    description?: string | undefined;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    position: Position | undefined;

}

export class ComponentQuickPicker implements DocumentSymbolProvider{
    

    constructor(
        private bundleIndex: BundleIndex
    ) {}
        
    register(): Disposable[] {
        const picker = window.createQuickPick<ComponentItem>();

        const pickerDisposables: Disposable[] = [];

        pickerDisposables.push(
            picker,
            picker.onDidChangeSelection((items) => {
                window.setStatusBarMessage(picker.activeItems[0].label + "SELECTION", 2000);
            }),
            picker.onDidChangeValue( _ => 
                {
                    window.setStatusBarMessage(picker.activeItems[0].label + "VALUE", 2000);
                }),
            picker.onDidChangeActive( items => 
                {
                    if (!items[0].position) {
                        return;
                    }
                    window.activeTextEditor?.revealRange(new Range(items[0].position, items[0].position));
                    window.setStatusBarMessage(picker.activeItems[0].label + "ACTIVE", 2000);
                }),
            picker.onDidAccept( () => {
                picker.hide();
            }
            ),
            languages.registerDocumentSymbolProvider(manifestFilesSelector, this, {
                label: "Bundle components"
            })
        );



        return [
            ...pickerDisposables, 
            commands.registerCommand("apprtbundles.component.goto", async () => {
                
                const editor = window.activeTextEditor;
                if (!editor || noManifestFile(editor.document)) {
                    return;
                }
                
                const manifestDoc = this.bundleIndex.findBundleByUri(editor.document.uri.toString());
                if (!manifestDoc) {
                    return [];
                }
                const componentLinks = manifestDoc.getComponents().map( componentFragment => {
                    return {
                        label: componentFragment.getName()?.value || "unknown",
                        description: "desc",
                        detail: undefined,
                        position: new Position(componentFragment.section.start.line, componentFragment.section.start.col)
                    };
                });

                picker.items = componentLinks;
                picker.show();
            })
        ];
    }

    provideDocumentSymbols(document: TextDocument, token: CancellationToken): ProviderResult<SymbolInformation[] | DocumentSymbol[]> {
        const manifestDoc = this.bundleIndex.findBundleByUri(document.uri.toString());
        if (!manifestDoc) {
            return [];
        }
        const components = manifestDoc.getComponents();
        const componentsFragment = manifestDoc.getComponentsFragment();
        if (!componentsFragment) {
            return [];
        }

        const componentsRange = rangeOfSection(componentsFragment.section);
        const positionBeforeComponents = document.positionAt(document.offsetAt(componentsRange.start) - 1);
        // const preComponentsSymbol = new DocumentSymbol("other", "", SymbolKind.Object, new Range(new Position(0,0), positionBeforeComponents), new Range(new Position(0,0), positionBeforeComponents));
        // const componentsSymbol = new DocumentSymbol("components", `(${components.length})`, SymbolKind.Array, componentsRange, rangeOfSection(componentsFragment.section));
        const componentSymbols = components.map(componentFragment => {
            const details = componentFragment.getProvides().map(frag => frag.value).join(", ");
            const symbol = new DocumentSymbol(componentFragment.getName()?.value  || "", details, SymbolKind.Interface, rangeOfSection(componentFragment.section), rangeOfSection(componentFragment.getName()?.section));
            return symbol;
        });
        return componentSymbols;
        // componentsSymbol.children = componentSymbols;
        // return [preComponentsSymbol, componentsSymbol];
    }

}