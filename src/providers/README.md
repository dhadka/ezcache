# Storage Providers

This folder contains implementations for various storage providers.  The default is `hosted` which uses
the official GitHub Actions cache servers.  This provides 5 GBs of free cache storage with a 7-day
eviction policy.  While hosted storage should work for most users, it has some limitations including:

1. The storage capacity and eviction policy may be too restrictive for large repos, especially when testing
   across different operating systems and software versions.

2. Hosted caching uses [branch scoping](https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#restrictions-for-accessing-a-cache)
   to restrict how caches can be shared.  Furthermore, hosted caching can only be used in workflows triggered
   by events including a `GITHUB_REF` (i.e., associated with a specific git ref).

3. Self-hosted runners may experience slower upload and download speeds due to increased distances between
   the runner and the GitHub Actions cache servers.

4. Caching is currently not supported on GitHub Enterprise Server.

These alternative storage providers remove most if not all of these limitations.

## Security Considerations

The branch scoping policy used by `hosted` is designed to prevent a user from injecting malicious
code or dependencies into the cache.  A cache created by a branch can not be used by any parent or
upstream branch (e.g., `master`) until the branch is merged (hopefully after being thorougly reviewed).
This provides a security boundary but also leads to caching inefficiencies.

None of these alternative storage providers implement branch scoping.  Insead, caches are scoped to the
repo.  As a result, all branches in a repo have access to and can share caches.  To ensure the integrity
of your caches, you should require that all contributions from untrusted sources come from forks.
Please also be aware of similar security concerns when using [self-hosted runners with public repos](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners#self-hosted-runner-security-with-public-repositories).

## Additional Info

Please refer to the source code documentation for more information about each provider.  For example, some
providers, such as AWS S3 and Azure Blob storage, do not provide any eviction mechanism and instead require
you to configure a lifecycle management policy.  You are responsible for all costs associated with operating
the storage provider.
