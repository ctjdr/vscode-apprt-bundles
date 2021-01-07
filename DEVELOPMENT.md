# Developing the app.rt bundles extension

## Test and debug extension

1. Open this project in VS Code
2. In VS Code open terminal
3. In terminal run `npm run watch-json`
4. Press `F5`
   * Another VS Code instance ("extension host") is started with extension activated
5. Make code changes
6. In extension host, exec command "Developer: Reload Window"
    * Code changes get applied

## Build extension

1. Install VS Code tool "vsce"
   ```shell
    $ npm install -g vsce
   ```
2. Run
   ```shell
    $ vsce package
   ```

This generates the extension `.vsix` file that can be installed in VS Code.

## Run tests

Run 
```shell
$ npm test
```

## Validate manifest.json files in folder tree

If you want to validate all `manifest.json` files in a folder tree, you can use the `test-manifest-path` script.

Run 
```shell
$ export MANIFEST_PATH="/home/foo/folder_with_many_manifests"
$ npm run test-manifest-path
```
