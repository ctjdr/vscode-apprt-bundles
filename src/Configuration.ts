import { Disposable, Event, EventEmitter, workspace, WorkspaceConfiguration } from "vscode";

export interface Configuration {

    onConfigKeyChange(configKey: string, callback: () => void): void;
    get<T>(section: string): T | undefined;
    get<T>(section: string, defaultValue: T): T;
    dispose(): void;
}

type ConfigChange = {
    key: string,
    value: any
};

export class ExtensionConfiguration implements Configuration, Disposable {

    private disposables: Disposable[]= [];

    private configKeyEvents: Map<string, {event: Event<ConfigChange>, emitter:EventEmitter<ConfigChange>}> = new Map();
    // private configKeyEventEmitters: Map<Event<ConfigChange>, EventEmitter<ConfigChange>> = new Map();

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }

    onConfigKeyChange<T>(configKey: string, callback: (change: ConfigChange) => void) {
        let event = this.configKeyEvents.get(configKey)?.event;
        if (!event) {
            const emitter = new EventEmitter<ConfigChange>();
            event = emitter.event;
            this.configKeyEvents.set(configKey, {event, emitter});
        }
        this.disposables.push(event(callback));       
    }
    // private emitter = new EventEmitter<string>();
    // readonly onConfigKeyChange: Event<string> = this.emitter.event;
    
    config: WorkspaceConfiguration | undefined;

    constructor() {
        this.config = workspace.getConfiguration("apprtbundles");
    }

    get<T>(section: string, defaultValue?: T): T | undefined {

        section = section.startsWith("apprtbundles")? section.substring("apprtbundles.".length) : section;

        if (!this.config) {
            return undefined;
        }
        if (defaultValue === undefined || defaultValue === null) {
            return this.config.get<T>(section);

        } else {
            return this.config.get<T>(section, defaultValue);
        }
    }



    register(): Disposable[] {

        return [
            this,
            workspace.onDidChangeConfiguration( changeEvent => {
                
                if (!changeEvent.affectsConfiguration("apprtbundles")) {
                    return;
                }
                
                this.config = workspace.getConfiguration("apprtbundles"); 

                for (const [key, evtEmitterPair] of this.configKeyEvents) {
                    if (changeEvent.affectsConfiguration(key)) {
                        evtEmitterPair.emitter.fire({
                            key,
                            value: workspace.getConfiguration().get<any>(key)
                        });
                    }
                }

            })
        ];

    }


}