---
layout: default
title: Bundle navigation
parent: Features
nav_order: 20
---

# Bundle navigation

Features provided by the extension that help you work with bundles:

- [Quick-open bundle](#quick-open-bundle)
- [Go to component implementation](#go-to-component-implementation)
- [Jump to manifest.json or README.md](#jump-to-manifestjson-or-readmemd)

## Quick-open bundle
Sometimes it takes more time than you expect to locate the bundle inside the file tree of VS Code. This is where *Quick-open bundle* comes to a rescue:

Execute *> apprt-bundles: Open bundle* from the command palette, enter some parts of the bundle name, and the bundle folder will be highlighted in the file tree.

![Enter bundle name in command palette](../images/feature_bundle_open02.png)

The actual effect of *opening a bundle* can be customized in the settings.
The property `apprtbundles.bundles.reveal.goal.type` lets you select if
* the bundle folder is just highlighted,
* the bundle folder is highlighted and expanded, or
* the manifest.json file of the bundle folder is highlighted, which obviously requires to expand the folder. :smirk:

## Go to component implementation

In `manifest.json` files, execute the *> Go to Definition* command on the name or `"impl"` property value of a component to open the corresponding implementation file.
This is equivalent to a `Ctrl-Click` or pressing `F12`.

!["Go to Definition" for components](../images/feature_component_goto_declaration.gif)

This works for components where the `"name"` or `"impl"` property matches the file name of a `.js` or `.ts` file inside the bundle folder.
But sometimes the component is mapped to another source file in the `module.js`.
In that case executing the command has no effect.

## Jump to manifest.json or README.md

The commands
* *> apprt-bundles: Open current manifest.json*
* *> apprt-bundles: Open current README.md*

allow you to open the respective file of the current bundle.
The "current" bundle is determined by the location of the file opened inside the active file editor. 

!["Open current manifest/readme"](../images/feature_command_opencurrent.gif)
