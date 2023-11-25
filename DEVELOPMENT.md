# Developing the app.rt bundles extension

## Setting up the right Node version

Before starting to develop, debug, and build the extension, run

```bash
nvm alias default 16
```

This will make sure, that newly created terminals to build or run the extension will use the correct Node version (16 at the time of this writing)

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

## Build changelog

Run in project root

```bash
$ github_changelog_generator --user ctjdr --project vscode-apprt-bundles --token $GITHUB_TOKEN --output --future-release 0.4.0 --no-compare-link --since-tag v0.1.0
```

Prints the changelog to STDOUT. Copy the new entry into _both_ CHANGELOG.md files.

## Run site

Run in `./docs`

```bash
$ bundle exec jekyll serve
```