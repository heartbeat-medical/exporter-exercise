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

**Tips**

1.  Read through the various files.
2.  Map out the high level system
    architecture and important functionality.
3.  (optional) Add comments to the `src/exporter.ts` file.

**What we are looking for**

1. Clear explanations of what individual elements are.
2. Some parts may be confusing, that's ok. We are looking for a
   thoughtful consideration of the different elements.
3. Your approach to documentation.

### Task 2a 🛠

**Please choose either 2a or 2b!**

We need new functionality adding. In addition to starting and fetching the
status of exports. **We would also like to cancel currently running exports**. Please implement
this functionality.

**Tips**

1. _We are looking for a minimum working example_, try focus on getting to something working.
   We can talk through your design and architecture decisions during the next interview.
2. The cancel existing import functionality should ideally **stop** an existing import. So no
   further bytes are piped from data source to the cache.
4. Bonus points for helpful test coverage on new code.

### Task 2b 🧪

**Please choose either 2a or 2b!**

The engineer who implemented this functionality forgot to add tests. We would like to cover
this feature with tests. Please add suitable tests for the exporter.

**Tips**

1. We are looking for how you approach testing code - be prepared to answer questions on why
   certain tests have been added!
2. Test names should be descriptive and help us understand why you chose to write that test.

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

# Description <a name = "description"></a>
## When the app starts(index.ts) <a name = "description"></a>
- It initializies dependancies consisting of Redis client(mock), UUID generator, user and permission.
- Then initializies exporter module with the dependancies.
- Starts export process by calling the start export function ``` await exporter.StartExport(myUser, mockOpenFile()) ``` passing the user object and the read stream.
- Check status of the exports every 500 milliseconds
  

## The exporter module(exporter.ts) <a name = "exporter"></a>

It has two main functions; StartExport and GetExportStatus

## StartExport <a name = "start-export"></a>
- Validates user permission before proceeding
- Generates an export ID(exportId)
- Creates a status object ```const newStatus = {
          status: "CREATED",
          id: exportId,
        }; ```
- Creates a cache entry with the exportId as the key and add the JSON of the newStatus as value.
- pipes the file read stream(passed as an argument) to the write stream(newCacheWriter) that updates the status of the exports and the data chunks.  

## newCacheWriter <a name = "new-cache-writer"></a>
- Appends cache entry for each chunk of data.
- updates the status to ```PENDING```

When the stream data ends; 
- Modifies the status to ```COMPLETED```
- Set the expiration of the key(exportId) and the data to 60 minutes.

## GetExportStatus <a name = "get-export-status"></a>
- Gets export status from cache using the ```exportId```
- And returns status object if found.

# Potential Improvements <a name = "improvements"></a>

- The interfaces and types can be seperated into their own files.
- Functions like ```mockOpenFile``` and  ```sleep``` can be moved into a utilis file.
- ```newCacheWriter``` function can be extracted into it own module and imported in to ```exporter.ts```.
- Make the status an enum.
- Overall refactoring of the code to follow clean code standard.
## Start the application

Run the example with:

```shell
yarn start
```

Format code:

```shell
yarn format
```
