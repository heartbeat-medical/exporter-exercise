import { Writable, Stream } from "stream";
import { RedisClient } from "redis";
import { PermissionsService, User } from "./permissions";
import util from "util";
import { UUID } from "./uuid";
import { Logger } from "./logger";

interface Exporter {
  StartExport: (user: User, data: Stream) => Promise<ExportStatus>;
  GetExportStatus: (id: string) => Promise<ExportStatus>;
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
  return {
    StartExport: async (user, data) => {
      deps.logger("starting export")
      try {
        // Check if the given user has the required permission
        const allowed = await deps.permissionsService.CheckPermissions(
          user,
          deps.allowedPermission
        );
        if (!allowed) {
          throw new Error("incorrect permission");
        }

        // Generate a new export ID
        const exportId = deps.UUIDGen.NewUUID();

        // Create a new status object
        const newStatus = {
          status: "CREATED",
          id: exportId,
        };

        // Set the initial status using Redis commands as promises
        const set = util.promisify(deps.cache.SET).bind(deps.cache);
        await set(exportId, JSON.stringify(newStatus));

        // Write the data from the given stream into a new cache writer using the pipe method
        data.pipe(newCacheWriter(exportId, deps.cache));

        // return the new export status
        return newStatus;
      } catch (e) {
        console.log("error");
        throw e;
      }
    },
    GetExportStatus: async (exportId) => {
      // Use Redis commands as promises to get the status
      const get = util.promisify(deps.cache.GET).bind(deps.cache);
      const strStatus = await get(exportId);
      if (!strStatus) {
        throw new Error(`no export found for id: ${exportId}`);
      }
      const status: ExportStatus = JSON.parse(strStatus);
      return status;
    },
  };
};

// Create a new cache writer to handle data writing
export function newCacheWriter(exportId: string, cache: RedisClient) {
  const append = util.promisify(cache.APPEND).bind(cache);
  const set = util.promisify(cache.SET).bind(cache);
  const expire = util.promisify(cache.EXPIRE).bind(cache);

  // Return a new Writable stream
  return new Writable({
    async write(chunk, _, callback) {
      // Append data to the cache
      await append(exportId + "-data", chunk.toString("binary"));

      // Update export status to "PENDING"
      await set(exportId, JSON.stringify({ status: "PENDING", id: exportId }));

      callback();
    },
    async final(callback) {
      // Update export status to "COMPLETE"
      await set(exportId, JSON.stringify({ status: "COMPLETE", id: exportId }));

      // Set expiration for export data and status
      await expire(exportId, 60 * 60);
      await expire(exportId + "-data", 60 * 60);
      
      callback();
    },
  });
}
