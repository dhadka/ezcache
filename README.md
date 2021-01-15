# ezcache

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
   
3. Use a different [backend storage provider](#storage-providers).  Local storage works great on self-hosted
runners and GitHub Enterprise Server!

   ```
   - uses: dhadka/ezcache@master
     with:
       type: npm
       provider: local
   ```

## Supported Languages

The following languages and package management tools are auto-detected by `ezcache`:

| Language | Package Manager    | Type        |
| -------- | ------------------ | ----------- |
| C#       | Nuget              | `nuget`     |
| D        | Dub                | `dub`       |
| Elixir   | Mix                | `mix`       |
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

## Special Configurations

The following special cache types are also supported.  These can cache any arbitrary path.

### daily

A `daily` cache stores one (or more) folders such that the cache is updated once a day.  This is useful when caching
some content that changes frequently, but we don't want to create new caches for every change.  For example,
this could be used to cache the `.git` folder for a large repo, where a full checkout is slow but pulling
new changes is relatively fast.

```
- uses: dhadka/ezcache@master
  with:
    type: daily
    path: .git
- uses: actions/checkout@v2
```

### diff

A `diff` cache will store one (or more) folders.  As the name suggests, the cache is updated whenever
the folder contents change.  Likewise, the last cache created on the branch is restored.

```
- uses: dhadka/ezcache@master
  with:
    type: diff
    path: ~/path/to/cache
```

### env

A `env` cache triggers cache updates by setting the `UPDATE_CACHE` environment variable to `true`.
The last saved cache is restored.

```
- uses: dhadka/ezcache@master
  with:
    type: env
    path: ~/path/to/cache
- name: Install dependencies
  run: |
    MY_VERSION=$(foo --version)
    LATEST_VERSION=$(...get latest version number...)
    if [[ MY_VERSION != LATEST_VERSION ]]; then
      ...install new version...
      echo "UPDATE_CACHE=true" >> $GITHUB_ENV
    fi
```

### run

Using `run` will create a new cache for every run of your workflow.  This can be used to share data between
different jobs in a workflow.  Please use this with caution as caches can be evicted at any time, potentially
leading to failing restores.

Tip: Use the [needs](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#jobsjob_idneeds)
field to ensure jobs that read the cache run after the job that create the cache.

```
- uses: dhadka/ezcache@master
  with:
    type: run
    path: ~/path/to/cache
```

## Powershell

For `powershell`, you specify the modules you need installed:

```
- uses: dhadka/ezcache@master
  with:
    type: powershell
    modules: SqlServer, PSScriptAnalyzer
```

This will either restore the modules from the cache or invoke `Install-Module` to 
install the modules on the runner.

## Docker Configurations

### Build Layers

Using `layers` will cache all Docker layers found on the runner, ignoring any images that existed previously on the runner.
This was originally developed by [satackey/action-docker-layer-caching](https://github.com/satackey/action-docker-layer-caching).

```
- name: Cache docker layers
  uses: dhadka/ezcache@master
  with:
    type: layers
```

### BuildX

The following example demonstrates how to cache the build artifacts from Docker's buildx by specifying the `--cache-from` and `--cache-to` options:

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

Caches misses should be expected and handled by the workflow.  There are two types of caches misses:

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
[usage limits and eviction policy](https://docs.github.com/en/free-pro-team@latest/actions/guides/caching-dependencies-to-speed-up-workflows#usage-limits-and-eviction-policy) applies.  The following alternatives can be used:

### `local`

Stores caches on the local file system.  Caches can only be shared between jobs on the same machine.
As a result, `local` should be avoided when sharing content between jobs within a workflow, since
each job can be picked up by a different runner.  **Do not use with hosted runners.**

```
- uses: dhadka/ezcache@master
  with:
    type: npm
    provider: local
```

### `s3`

Uses the AWS CLI that is installed on hosted runners (or needs to be installed on self-hosted runners)
to save and restore cache content to an S3 bucket or compatible provider (Minio).

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

To use a different endpoint URL, such as with Minio, set the AWS_ENDPOINT env var to the appropriate address.

NOTE: There is no eviction logic built into the AWS S3 storage provider.  Instead, you must set up
an [object lifecycle management policy](https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html)
to evict old content.

# Contributing

Want to add support for a new language or tool?  Great!  The caching logic for each language / tool is contained
within a "handler", which are located in [src/handlers](src/handlers).  Once you have written your handler, register
it inside [src/handlers/all.ts](src/handlers/all.ts).

Once your contribution is ready and tested:
1. Run `npm run build`
2. Add, commit, and push your changes
3. Create a pull request so it can be reviewed
