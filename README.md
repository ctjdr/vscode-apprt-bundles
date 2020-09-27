
![Node.js CI](https://github.com/ctjdr/vscode-apprt-bundles/workflows/Node.js%20CI/badge.svg?branch=master)
# Visual Studio Code extension for apprt bundles

Adds syntactic validation, auto-completion and code-suggest to _manifest.json_ files, used to define apprt bundles.

The feature is implemented based on a JSON Schema file, defining the cornerstones of a manifest.json file.

![Feature Demo](images/demo.gif)

## Using the extension

1. Install the extension, either via Marketplace or downloading the `vsix` extension file release from this site.
2. Open a `manifest.json` file
3. press CTRL+Space to get code-suggest and auto-complete or hover over a property to get documention hints.

## Features

* _Validation_ of manifest.json file
* _Documentation hints_ on manifest.json editing
* _Auto-complete_ and _code suggest_ for JSON structure
 

## Upcoming

* Find service name references: When hitting Shift-F12 (**> Find reference**), or Alt-Shift-F12 (**> Find all references**) while over a `"provides"` or`"providing"` value, display links to all references to the same service name.

## Further ideas

See the [Developer Wiki](https://github.com/ctjdr/vscode-apprt-bundles/wiki#developer-pages) for a list of implementation ideas.
