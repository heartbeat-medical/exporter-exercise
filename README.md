# Heartbeat engineering challenge

> 🚨 Please create a private fork of this repository and make all PRs into your own repository

Thank you for taking part in this and we are excited to see your work!

This repository contains a slimmed down version of an _exporter_ and associated
constructs for mocking functionality. There are three
tasks to complete.

The following files are simple mocks and need not be edited for the purpose
of this exercise.

```
1. src/logger.ts
2. src/permissions.ts
3. src/uuid.ts
```

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
- Pipes the Job Readable Stream to a Writable Stream that handles the following, both of which updates the job in cache
    - Chunk additions: Appends chunk to `<job-id>-data`
    - Job Completion: Updates job status 

**- `GetExportStatus`:** This retrieves a provided job object by their id from
cache and returns the status, for when it exists/hasn't expired and throws an error for when it is not foun d.
  
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

**Tips**

1. We are looking for ideas such as patterns, principles and performance.
2. You don't need to implement any improvements, but feel free to use code
   examples where you feel it would be helpful.

## How to submit

1. Create a private fork of this repository
2. Create a new branch in your fork
3. Commit on that branch
4. When you are ready to submit, create a PR back to your fork
5. Add the user @heartbeat-med (https://github.com/heartbeat-med)
6. We will comment on the PR
7. You can either submit more code or we can discuss in the next interview 🤘
8. Any questions, reach out to us!

## Start the application

Run the example with:

```shell
yarn start
```

Format code:

```shell
yarn format
```
