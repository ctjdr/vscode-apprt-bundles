
![Node.js CI](https://github.com/ctjdr/vscode-apprt-bundles/workflows/Node.js%20CI/badge.svg?branch=master)
# Visual Studio Code extension for apprt bundles

Adds syntactic validation, auto-completion and code-suggest to _manifest.json_ files, used to define apprt bundles.

The feature is implemented based on a JSON Schema file, defining the cornerstones of a manifest.json file.

![Feature Demo](images/demo.gif)

## Using the extension

1. Install the extension, either via Marketplace or downloading the `vsix` extension file release from this site.
2. Open a `manifest.json` file
3. press CTRL+Space to get code-suggest and auto-complete or hover over a property to get documention hints.

## Further ideas

These are some ideads for additional functions for this extension:

* CodeLense - Every component reference (`"providing"`) gets a CodeLense marker:
    * "Preview": On click, a peek preview of the referenced component is displayed (if available in workspace).
    * "Jump to": On click, the manifest.json file defining the component is opened (if available in workspace)
* Diagnostics - For a component with missing implementation file:
    * Report _problem_ on missing `impl` 
    * ? Possible to identify impl file?
* Code action - For a component with missing impl:
    * provide action "Create implementation"
* Find references - For a component providing an interface, find all references (provides, providing) to it in workspace
