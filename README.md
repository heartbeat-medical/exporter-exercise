# Heartbeat engineering challenge

> 🚨 Please create a private fork of this repository and make all PRs into your own repository.
> **Could not make repo private, because main repo is public.**

## Tasks

### Task 1

Complete this README with a description of how the exporter works. You may
also add diagrams/code snippets, whatever you think is required ⭐️

#### Description
The Exporter acts as Job Queue Manager. In a nutshell, it creates jobs and 
tracks/manages their statuses in a cache (redis). It exposes 3 main functions

**- `StartExport`:** Simply put, this function,
- Collects the User and the Job [Readable] Stream
- Tries to authorize the user's action based a configured permission requirement
- Creates a default Job object (including an id and a default status)
- Writes the job object to a cache with the "unique" identifier
- Pipes the Job Readable Stream to a Writable Stream that handles the following, 
both of which updates the job in cache
    - Chunk additions: Appends chunk to `<job-id>-data`
    - Job Completion: Updates job status 

**- `GetExportStatus`:** This retrieves a provided job object by their id from
cache and returns the status, for when it exists/hasn't expired and throws an error
for when it is not found.
  
**- `CancelExport (My Addition)`:** The function, cancels any specific pending job,
- Closes the Streams
- Updates the Job Status


### Task 2a 🛠

We need new functionality adding. In addition to starting and fetching the
status of exports. **We would also like to cancel currently running exports**. Please implement
this functionality.

**Implemented**

### Task 3 📈

What would you improve? We know this feature isn't great. What would you change?

#### Improvements
- The Redis client usage is redefined in multiple places and instances. It is recommended to wrap
the RedisClient in an object that exposes the asynchronous versions of the redis functions
- Re-useable blocks are best extracted to functions. Eg
```ts
await set(exportId + "-data", "...");
// Can be changed to

function getExportDataKey(id: string) {
	return `${id}-data`;
}
```
- It is not recommended to throw in `try` blocks as seen in `StartExport`.
```ts
try {
  ...
  throw new Error(...)
}
```
- `StartExport` should be fail-proof and should cancel any created job if an error happens 
in stream creation and piping
- Judging by filename `permission.ts`, `User` should not exported in it. It's best exported in a
generic file or user (contextual) file

## Start the application

Run the example with:

```shell
yarn start
```

Format code:

```shell
yarn format
```

Test code:

```shell
yarn test
```
