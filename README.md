# ezcache

![Tests](https://github.com/dhadka/ezcache/workflows/Tests/badge.svg) ![Publish Actions](https://github.com/dhadka/ezcache/workflows/Publish%20Actions/badge.svg)

Caching made easy.  Based on the [GitHub Actions Cache](http://github.com/actions/cache), this action simplifies
the process of setting up the cache by providing predefined configurations for different languages and package
management tools.  Here's a few simple examples:

1. Auto-detect and create the appropriate cache(s) for your repo:

   ```
   - uses: dhadka/ezcache@master
   ```
   
2. Explicitly configure the cache type:

   ```
   - uses: dhadka/ezcache@master
     with:
       type: npm
   ```

3. [Separate save and restore steps](#explicit-save-and-restore-steps) for even more control:

   ```
   - uses: dhadka/ezcache-restore@master
   ...
   - uses: dhadka/ezcache-save@master
   ```
   
4. Different [backend storage providers](#storage-providers), including hosted, local, Azure, and AWS S3.  Use local
   or S3 to cache content of self-hosted runners and GitHub Enterprise Server!

   ```
   - uses: dhadka/ezcache@master
     with:
       type: npm
       provider: local
   ```

## Supported Languages

ezcache recognizes the following programming languages and package management tools.  If you do
not explicitly specify the `type`, ezcache will attempt to auto-detect the appropriate type
(or types) for your repository.

| Language | Package Manager    | Type        |
| -------- | ------------------ | ----------- |
| C#       | Nuget              | `nuget`     |
| D        | Dub                | `dub`       |
| Elixir   | Mix                | `mix`       |
| Erlang   | Rebar3             | `rebar3`    |
| Go       |                    | `go`        |
| Java     | Gradle             | `gradle`    |
| Java     | Maven              | `maven`     |
| Node     | NPM                | `npm`       |
| Node     | Yarn               | `yarn`      |
| PHP      | Composer           | `composer`  |
| Python   | Pip                | `pip`       |
| Python   | Virtual Env w/ Pip | `pipenv`    |
| Python   | Poetry             | `poetry`    |
| R        |                    | `renv`      | 
| Ruby     | Bundler            | `bundler`   |
| Rust     | Cargo              | `cargo`     |
| Scala    | SBT                | `sbt`       |
| Swift / Obj-C | Carthage      | `carthage`  |
| Swift / Obj-C | Cocoapods     | `cocoapods` |
| Swfit    | Mint               | `mint`      |
| Swift    | SPM                | `spm`       |

## Powershell Cache

The `powershell` cache will not only cache the specified modules but will also
automatically install them during a cache miss.

```
- uses: dhadka/ezcache@master
  with:
    type: powershell
    modules: SqlServer, PSScriptAnalyzer
```

## General-Purpose Caches

ezcache also supports a number of general-purpose cache types designed to store a user-defined path.

### daily

Creates a cache that is updated once a day.  This is useful when caching content that changes frequently,
but we don't want to create new caches after every change.  For example, this could be used to cache the
`.git` folder for a large repo, where a full checkout is slow but pulling new changes is relatively fast:

```
- uses: dhadka/ezcache@master
  with:
    type: daily
    path: .git
- uses: actions/checkout@v2
```

### weekly

Similar to `daily` except, you guessed it, updates once a week.

```
- uses: dhadka/ezcache@master
  with:
    type: weekly
    path: .git
- uses: actions/checkout@v2
```

### diff

Creates a cache that is updated whenever the folder contents change.

```
- uses: dhadka/ezcache@master
  with:
    type: diff
    path: ~/path/to/cache
```

### script

Creates a cache based off an installation script.  Changes to the script will trigger a cache miss.
During a cache miss, the updated script will be invoked and a new cache created.

```
- uses: dhadka/ezcache@master
  with:
    type: script
    script: ./install-dependencies.sh
    path: ~/path/to/dependencies
```

### env

Creates a cache that is updated only when the `UPDATE_CACHE` environment variable is set to `true`.

```
- uses: dhadka/ezcache@master
  with:
    type: env
    path: ~/path/to/cache
- name: Install dependencies
  run: |
    INSTALLED_VERSION=...
    LATEST_VERSION=...
    if [[ INSTALLED_VERSION != LATEST_VERSION ]]; then
      ...install new version...
      echo "UPDATE_CACHE=true" >> $GITHUB_ENV
    fi
```

### run

Creates a new cache for every run of your workflow.  This can be used to share data between different jobs
in a workflow.  Please use this with caution as caches can be evicted at any time, potentially leading to
failing restores.

Tip: Use the [needs](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#jobsjob_idneeds)
field to ensure jobs that read the cache run after the job that create the cache.

```
- uses: dhadka/ezcache@master
  with:
    type: run
    path: ~/path/to/cache
```

## Docker Caches

### Build Layers

Caches each Docker layer found on the runner (excluding any that previously existed on the runner) to improve build times.
This was originally developed by [satackey/action-docker-layer-caching](https://github.com/satackey/action-docker-layer-caching).

```
- name: Cache docker layers
  uses: dhadka/ezcache@master
  with:
    type: layers
```

### BuildX

Caches build artifacts from Docker's BuildX.  This works by specifying the `--cache-from` and `--cache-to` options
used by BuildX:

```
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v1
  with:
    version: latest

- name: Cache Buildx
  uses: dhadka/ezcache@master
  with:
    type: buildx
    path: /tmp/.buildx-cache

- name: Docker Buildx (build)
  run: |
    docker buildx build \
      --cache-from "type=local,src=/tmp/.buildx-cache" \
      --cache-to "type=local,dest=/tmp/.buildx-cache" \
      --platform linux/386 \
      --output "type=image,push=false" \
      --tag myimage:latest \
      --file ./Dockerfile ./
```

## Handling Cache Misses

Cache misses should be expected and handled by the workflow.  There are two types of cache misses:

1. A **miss** where no matching cache was found
2. A **partial hit** where some of the cache contents are restored

In both cases, this action will output `cache-hit` set to `false`.  You can then conditionally run 
any steps to install the remaining dependencies:

```
- name: Install dependencies
  if: steps.cache.outputs.cache-hit != 'true'
  run: ...
```

## Versioning

Caches can also be versioned by specifying the `version` input, for example:

```
- uses: dhadka/ezcache@master
  with:
    type: npm
    version: v2
```

The version can be any arbitrary string and is useful when needing to "clear" the cache contents.  This would
normally require you to make a commit to change the version, but an alternative is to use a secret value:

```
- uses: dhadka/ezcache@master
  with:
    type: npm
    version: ${{ secrets.CACHE_VERSION }}
```

If the cache is ever corrupted, you can "clear" the cache by quickly changing the value in the secret.

## Storage Providers

By default, `hosted` storage is used which is backed by the GitHub Actions Cache servers.  As such, the same
[usage limits and eviction policy](https://docs.github.com/en/free-pro-team@latest/actions/guides/caching-dependencies-to-speed-up-workflows#usage-limits-and-eviction-policy) applies.  You can also use one of these
alternative storage providers.

** 

1. Hosted enforces [branch scoping](https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#restrictions-for-accessing-a-cache), meaning caches can only be shared
   between key 
   is not supported.  All branches in a repo can read and write to the same collection of caches.  
   

### `local`

Stores caches on the local file system.  Please note that caches can only be shared between jobs on the same machine.
Therefore, avoid using when multiple self-hosted runners are registered or on hosted runners.

```
- uses: dhadka/ezcache@master
  with:
    type: npm
    provider: local
```

### `s3`

Uses the AWS CLI that is installed on hosted runners (or [needs to be installed](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
on self-hosted runners) to save and restore cache content to an S3 bucket. 

```
- uses: dhadka/ezcache@master
  with:
    type: npm
    provider: s3
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_BUCKET_NAME: ${{ secrets.AWS_BUCKET_NAME }}
    AWS_REGION: us-east-1
```

To use with an S3 compatible provider, such as Minio, set the AWS_ENDPOINT env var to the appropriate address.

NOTE: There is no eviction logic built into the AWS S3 storage provider.  Instead, you must set up
an [object lifecycle management policy](https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html)
to evict old content.

### `azure`

Uses the Azure CLI (`az`) that is installed on hosted runners (or [needs to be installed](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
on self-hosted runners) to save and restore cache content to an Azure storage account.

```
- uses: dhadka/ezcache@master
  with:
    type: npm
    provider: azure
  env:
    SAS_TOKEN: ${{ secrets.SAS_TOKEN }}
    ACCOUNT_NAME: ${{ secrets.ACCOUNT_NAME }}
    CONTAINER_NAME: cache
```

This supports authentication with a `SAS_TOKEN`, `CONNECTION_STRING`, or `ACCOUNT_KEY`.

NOTE: There is no eviction logic built into the Azure Blob storage provider.  Instead, you must set up an
[lifecycle management policy](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-lifecycle-management-concepts?tabs=azure-portal)
to evict old content.

# Explicit Save and Restore Steps

By default, caches are saved at the end of a workflow, in the so called "post step".  This post step is only
executed when all steps in the workflow are successful.  If you need more control over when to save the cache,
you can call the restore and save operations explicitly:

```
- uses: dhadka/ezcache-restore@master
  with:
    type: npm

...

- uses: dhadka/ezcache-save@master
  with:
    type: npm
```

# Contributing

Want to add support for a new language or tool?  Great!  The caching logic for each language / tool is contained
within a "handler", which are located in [src/handlers](src/handlers).  Once you have written your handler, register
it inside [src/handlers/all.ts](src/handlers/all.ts).

Once your contribution is ready and tested:
1. Run `npm run build`
2. Add, commit, and push your changes
3. Create a pull request so it can be reviewed
