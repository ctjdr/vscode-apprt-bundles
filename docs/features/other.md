---
layout: default
title: Other
parent: Features
nav_order: 100
---

- [Hide bundle paths](#hide-bundle-paths)
- [Exclude bundle baths](#exclude-bundle-baths)

# Configure bundle path exclusions

## Hide bundle paths
Some projects contain a lot of bundles that only serve as a sample or for testing purposes.
To prevent these bundles from spamming the "Open bundle" pick list, configure paths to bundles that should be excluded from the pick list.
The property `apprtbundles.bundles.hidePaths` takes a list of path glob patterns.
Any bundle with a path matching one the patterns will be excluded from the pick list.

The following glob patterns define paths of bundles that are hidden by default:
* `**/sample/apps/**`
* `**/tests/**`
* `**/src/test/**`


## Exclude bundle paths

To exclude bundles from *all features* of this extension use the configuration property `apprtbundles.bundles.ignorePaths`.
If a bundle has a path matching one of the glob patterns defined here, it will be ignored by this extension completely.
These bundles will not appear when searching service name references or using any other feature of this extension.   
IntelliSense features (like auto-suggest or searching for service name references) won't work when editing `manifest.json` files of those bundles.

The following glob patterns define paths of bundles that are ignored by default:
* `**/node_modules/**`
* `**/target/**`
