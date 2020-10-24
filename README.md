# ezcache

Caching made easy.  Based on the GitHub Actions Cache, this action simplifies the process of
setting up the cache by providing predefined configurations for different languages and package
management tools.  For example, caching NPM is as easy as adding the step:

```
- use: dhadka/ezcache@master
  with:
    type: npm
```

## Supported Languages

| Language | Package Manager | Type        |
| -------- | --------------- | ----------- |
| Go       |                 | `go`        |
| Java     | Gradle          | `gradle`    |
| Java     | Maven           | `maven`     |
| Node     | NPM             | `npm`       |
| Node     | Yarn            | `yarn`      |
| PHP      | Composer        | `composer`  |
| Python   | PIP             | `pip`       |
| R        |                 | `renv`      | 
| Ruby     | Bundler         | `bundler`   |
| Rust     | Cargo           | `cargo`     |
| Scala    | SBT             | `sbt`       |
| Swift / Obj-C | Carthage   | `carthage`  |
| Swift / Obj-C | Cocoapods  | `cocoapods` |
| Swift    | SPM             | `spm`       |

## Special Configurations

### auto

This is a special configuration that auto-detects the type of cache.  Furthermore, this can match
multiple types, thus creating multiple caches.

```
- use: dhadka/ezcache@master
  with:
    type: auto
```

### diff

This is a special configuration for caching one or more folders, updating the cache if the folder
contents change.  Contrary to what the name might suggest, each time the folder contents change a
brand new cache is created with the full contents of the folders.

```
- use: dhadka/ezcache@master
  with:
    type: diff
    path: ~/path/to/cache
```

The `diff` configuration creates a linear cache (in time) along each branch.  This is an important
distinction as reverts to the code will still restore the most recently created cache.

### run

`run` is a special cache type that creates a unique cache for each run of the workflow.  This is most
useful when sharing content between different jobs in a workflow.  Use the
[needs](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#jobsjob_idneeds)
field to ensure jobs that read the cache run after the job(s) that create the cache.

```
- use: dhadka/ezcache@master
  with:
    type: run
    path: ~/path/to/cache
```

## Versioning

Most caches can also be versioned by specifying the `version` input, for example:

```
- use: dhadka/ezcache@master
  with:
    type: npm
    version: v2
```

The version can be any arbitrary string and is useful when needing to "clear" the cache contents.  This would
normally require you to make a commit to change the version, but an alternative is to use a secret value:

```
- use: dhadka/ezcache@master
  with:
    type: npm
    version: ${{ secrets.CACHE_VERSION }}
```

If the cache is ever corrupted, you can "clear" the cache by quickly changing the value in the secret.