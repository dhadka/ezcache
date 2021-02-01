# Storage Providers

This folder contains implementations for various storage providers.  The default is `hosted` which uses
the official GitHub Actions cache servers.  This provides 5 GBs of free cache storage with a 7-day
eviction policy.  While hosted storage should work for most users, it has some limitations including:

1. The storage capacity and eviction policy may be too restrictive for large repos, especially when testing
   across different operating systems and software versions.

2. Hosted caching uses [branch scoping](https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#restrictions-for-accessing-a-cache)
   to restrict how caches can be shared.
   
3. Hosted caching can only be used in workflows triggered by events including a `GITHUB_REF`
   (i.e., associated with a specific git ref).

4. Self-hosted runners may experience slower upload and download speeds due to increased distances between
   the runner and the GitHub Actions cache servers.

5. Caching is currently not supported on GitHub Enterprise Server.

These alternative storage providers remove most if not all of these limitations.

## Security Considerations

The branch scoping policy used by `hosted` is designed to prevent a user from injecting malicious
code or dependencies into the cache.  A cache created by a branch can not be used by any parent or
upstream branch (e.g., `master`) until the branch is merged (hopefully after being thorougly reviewed).
This provides a security boundary but also leads to caching inefficiencies.

None of these alternative storage providers implement branch scoping.  Insead, caches are scoped to the
repo.  As a result, all branches in a repo have access to and can share caches.  To ensure the integrity
of your caches, you should require that all contributions from untrusted sources come from forks.

Please also be aware of all security concerns when using [self-hosted runners with public repos](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners#self-hosted-runner-security-with-public-repositories).
For example, take all necessary steps to protect and restrict access to the host machine.
Secrets used to connect to storage accounts are sent to and used by the runner.  These secrets could
be obtained by users with access to the host machine.

## Additional Info and Known Issues

Refer below for additional information specific to each cache provider.

### Local Provider

1. Cached content is only accessible by the local machine.  Therefore, if you have multiple self-hosted runners,
   each will need to populate its local cache.

2. Furthermore, workflows that share cache content between jobs will not work if there are multiple
   self-hosted runners, as each job could be picked up by a different runner.

### Azure Provider

1. The Azure provider requires the Azure CLI (`az`) to be installed.

2. Unfortunately, while we do offer this provider, our experience shows some of the operations required
   for caching, such as listing existing blobs, are incredibly slow.  We have observed the list operation
   taking upwards of 10 seconds.  This could substantially limit any benefit from caching.

3. Eviction is not supported.  Instead, configure a lifecycle management policy to clean up old content.

### Amazon S3 Provider

1. The Amazon S3 provider requires the Amazon CLI to be installed.

2. Eviction is not supported.  Instead, configure a lifecycle management policy to clean up old content.
