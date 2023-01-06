import "regenerator-runtime/runtime";
import {Writable, Stream, Readable} from "stream";
import { RedisClient } from "redis";
import { PermissionsService, User } from "./permissions";
import util from "util";
import { UUID } from "./uuid";
import { Logger } from "./logger";

/**
 * Used to temporarily keep  track of ongoing jobs incase of a cancellation or error
 */
const ongoingExportJobs: Map<string, [Writable, Readable]> = new Map<string, [Writable, Readable]>()

interface Exporter {
  StartExport: (user: User, data: Readable) => Promise<ExportStatus>;
  GetExportStatus: (id: string) => Promise<ExportStatus>;
  CancelExport: (id: string) => Promise<ExportStatus>
}

type ExportStatus = {
  status: string;
  id: string;
};

export type HBExporterDependencies = {
  cache: RedisClient;
  permissionsService: PermissionsService;
  allowedPermission: string;
  UUIDGen: UUID;
  logger: Logger;
};


export const HBExporter = (deps: HBExporterDependencies): Exporter => {
  /**
   * exporter is extracted into variable and later returned. This is to provide a reference
   * for internal functions to trigger other internal functions.
   */
  const exporter: Exporter =  {
    StartExport: async (user, data: Readable) => {
      deps.logger("starting export")
      try {
        // Check required permission in user object.
        const allowed = await deps.permissionsService.CheckPermissions(
          user,
          deps.allowedPermission
        );
        if (!allowed) {
          throw new Error("incorrect permission");
        }
        const exportId = deps.UUIDGen.NewUUID();
        const newStatus = {
          status: "CREATED",
          id: exportId,
        };
        const set = util.promisify(deps.cache.SET).bind(deps.cache);
        await set(exportId, JSON.stringify(newStatus));

        // Create Writable stream that monitors and writes Read Stream updates to cache
        const writable = newCacheWriter(exportId, deps.cache)
        data.pipe(newCacheWriter(exportId, deps.cache));
        ongoingExportJobs.set(exportId, [writable, data])

        return newStatus;
      } catch (e) {
        console.log("error");
        throw e;
      }
    },
    GetExportStatus: async (exportId) => {
      const get = util.promisify(deps.cache.GET).bind(deps.cache);
      const strStatus = await get(exportId);
      if (!strStatus) {
        throw new Error(`no export found for id: ${exportId}`);
      }
      const status: ExportStatus = JSON.parse(strStatus);
      return status;
    },

    CancelExport: async (exportId) => {
      /**
       * Retrieve and verify existence of export job. We rely on the *throwing* capacity of the
       * [GetExport Job]
       */
      await exporter.GetExportStatus(exportId)
      const [writer, reader] = ongoingExportJobs.get(exportId) || [];
      //Destroy streams and halt any pending writes or reads
      writer?.destroy();
      reader?.destroy();

      ongoingExportJobs.delete(exportId)
      const set = util.promisify(deps.cache.SET).bind(deps.cache);
      const expire = util.promisify(deps.cache.EXPIRE).bind(deps.cache);

      const jobStatus = { status: "CANCELED", id: exportId }
      await set(exportId, JSON.stringify(jobStatus));
      await expire(exportId, 60 * 60);
      await expire(`${exportId}-data`, 60 * 60);

      return jobStatus;
    }
  };

  return exporter;
};

function newCacheWriter(exportId: string, cache: RedisClient) {
  const append = util.promisify(cache.APPEND).bind(cache);
  const set = util.promisify(cache.SET).bind(cache);
  const expire = util.promisify(cache.EXPIRE).bind(cache);
  return new Writable({
    /**
     * Implementation/Overwriting of write in Writable, to append chunk to redis cache as well as upsert
     * Redis cache entry
     * @param chunk
     * @param _
     * @param callback
     */
    async write(chunk, _, callback) {
      await append(exportId + "-data", chunk.toString("binary"));
      await set(exportId, JSON.stringify({ status: "PENDING", id: exportId }));
      callback();
    },
    /**
     * Implementation/Overwriting of final in Writable, to upsert export status as well set expiry to all accumulated
     * data
     * @param callback
     */
    async final(callback) {
      await set(exportId, JSON.stringify({ status: "COMPLETE", id: exportId }));
      await expire(exportId, 60 * 60);
      await expire(exportId + "-data", 60 * 60);
      ongoingExportJobs.delete(exportId)
      callback();
    },
  });
}
