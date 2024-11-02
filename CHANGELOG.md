# Changelog

## [v0.5.1](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.5.1) (2024-11-02)

**Bug fixes**

- Peek providers/consumers doesn't work for service names containing a number [\#56](https://github.com/ctjdr/vscode-apprt-bundles/issues/56)

## [v0.5.0](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.5.0) (2024-02-11)

**Enhancements**

- Add default key binding for "Open bundle" command [\#54](https://github.com/ctjdr/vscode-apprt-bundles/issues/54)
- Allow to jump from component declaration to implementation instantly [\#53](https://github.com/ctjdr/vscode-apprt-bundles/issues/53)
- Make "Go to Definition" go to module.js/.ts file. [\#52](https://github.com/ctjdr/vscode-apprt-bundles/issues/52)

## [v0.4.4](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.4.4) (2022-08-11)

**Enhancements**

- Support new manifest.json properties `editor` and `deprecated`  [\#51](https://github.com/ctjdr/vscode-apprt-bundles/issues/51)

## [v0.4.3](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.4.3) (2022-08-10)

**Bug fixes**

- Service name completion does not replace existing text correctly since VS Code 1.69 [\#50](https://github.com/ctjdr/vscode-apprt-bundles/issues/50)
- Peeking component providers and consumers in manifest.json fails since VS Code 1.69 [\#49](https://github.com/ctjdr/vscode-apprt-bundles/issues/49)

## [v0.4.2](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.4.2) (2022-06-09)

**Bug fixes**

- Error "Unable to load schema from 'apprt://.manifest.schema.json'" displayed when editing manifest.json file [\#48](https://github.com/ctjdr/vscode-apprt-bundles/issues/48)

## [v0.4.1](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.4.1) (2022-06-09)

**Enhancements**

- Support new manifest.json properties 'cssThemes' and 'cssThemesExtension' [\#47](https://github.com/ctjdr/vscode-apprt-bundles/pull/47) ([jessebluemr](https://github.com/jessebluemr))

## [v0.4.0](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.4.0) (2021-03-28)

**Enhancements**

- Provide quick fix for deprecated manifest items [\#45](https://github.com/ctjdr/vscode-apprt-bundles/issues/45)

## [v0.3.0](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.3.0) (2021-01-14)

**Enhancements**

- "Goto Definition" for components opens implementing file [\#11](https://github.com/ctjdr/vscode-apprt-bundles/issues/11)
- "Open bundle" command: Don't display bundle name \(again\) in details [\#35](https://github.com/ctjdr/vscode-apprt-bundles/issues/35)
- "Open Bundle" command: Match on bundle parent paths [\#33](https://github.com/ctjdr/vscode-apprt-bundles/issues/33)
- Make "manifest" reveal type the default [\#32](https://github.com/ctjdr/vscode-apprt-bundles/issues/32)
- Clean up bundle reveal type settings [\#31](https://github.com/ctjdr/vscode-apprt-bundles/issues/31)
- Exclude bundles from defined paths from list displayed for "Open bundle" command [\#25](https://github.com/ctjdr/vscode-apprt-bundles/issues/25)
-  Add command to "open current README" [\#23](https://github.com/ctjdr/vscode-apprt-bundles/issues/23)
- Keep a list of recently opened bundles when using the "apprt: Open bundle" command [\#20](https://github.com/ctjdr/vscode-apprt-bundles/issues/20)
- Add command to "open current manifest" [\#19](https://github.com/ctjdr/vscode-apprt-bundles/issues/19)
- Don't suggest deprecated or other unwanted keys when editing manifest.json files [\#16](https://github.com/ctjdr/vscode-apprt-bundles/issues/16)
- Provide better snippets for most commonly used manifest.json keys [\#15](https://github.com/ctjdr/vscode-apprt-bundles/issues/15)
- Tag deprecated keys in manifest.schema.json [\#14](https://github.com/ctjdr/vscode-apprt-bundles/issues/14)

**Bug fixes**

- Configuration not restored for "Open bundle" command [\#21](https://github.com/ctjdr/vscode-apprt-bundles/issues/21)
- No help docs on auto-complete [\#17](https://github.com/ctjdr/vscode-apprt-bundles/issues/17)

## [v0.2.0](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.2.0) (2020-11-27)

**Enhancements**

- Activate extension only when manifest.json file present in workspace [\#9](https://github.com/ctjdr/vscode-apprt-bundles/issues/9)
- Indicate extension startup in status bar [\#8](https://github.com/ctjdr/vscode-apprt-bundles/issues/8)

**Bug fixes**

- Extension bundle contains unnecessary files [\#7](https://github.com/ctjdr/vscode-apprt-bundles/issues/7)

## [v0.1.0](https://github.com/ctjdr/vscode-apprt-bundles/tree/v0.1.0) (2020-11-06)

**Enhancements**

- Toggle apprt documentation hints when editing manifest.json files  [\#4](https://github.com/ctjdr/vscode-apprt-bundles/issues/4)
- Reveal bundle folder in Explorer by typing bundle name [\#2](https://github.com/ctjdr/vscode-apprt-bundles/issues/2)

**Bug fixes**

- Service name completion list contains garbage values [\#5](https://github.com/ctjdr/vscode-apprt-bundles/issues/5)
- Components and references not found when deprecated "Components" uppercase property key is used [\#1](https://github.com/ctjdr/vscode-apprt-bundles/issues/1)

## 0.0.5 (2020-10-21)

**Enhancements**

- Add code lenses to `"providing"` and `"provides"` elements.

## 0.0.4 (2020-10-14)

**Enhancements**

- Enable to use "Find all References" and "Peek References" commands to search service name references in all manifest.json files
- Add auto-completion for service names when editing `"providing"` and `"provides"` elements.

## 0.0.3 (2020-09-18)

**Enhancements**

- Added missing description for manifest.json elements.

## 0.0.2 (2020-09-17)
- Allow to build release based on GitHub Actions

## 0.0.1 (2020-09-16)
- Initial release
- Implement basic manifest.json editing support through JSON Schema file.


\* *This Changelog was automatically generated by [github_changelog_generator](https://github.com/github-changelog-generator/github-changelog-generator)*
