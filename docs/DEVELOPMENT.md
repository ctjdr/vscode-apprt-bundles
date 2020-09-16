# Development hints

## Build

```bash
$ npm run compile
```

## Build extension file

```bash
$ npm install -g vsce
```

## Install extension file

```bash
$ code --install-extension vscode-apprt-bundles-<VERSION>.vsix
```

## Test

Run test suite:
```bash
$ npm test
```

Test all `manifest.json` files located in a folder and its subfolders:
```bash
$ MANIFEST_PATH='/path/to/folder' npm run test-manifest-path
```
