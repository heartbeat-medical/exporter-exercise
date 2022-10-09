import { Writable, Stream } from "stream";
import { RedisClient } from "redis";
import { PermissionsService, User } from "./permissions";
import util from "util";
import { UUID } from "./uuid";
import { Logger } from "./logger";

interface Exporter {
  StartExport: (user: User, data: Stream) => Promise<ExportStatus>;
  GetExportStatus: (id: string) => Promise<ExportStatus>;
  CancelExport: (id: string) => void;
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

export type Writables = Record<string, Writable>;

const writables: Writables = {}

export const HBExporter = (deps: HBExporterDependencies): Exporter => {
  const set = util.promisify(deps.cache.SET).bind(deps.cache);
  const get = util.promisify(deps.cache.GET).bind(deps.cache);
  return {
    StartExport: async (user, data) => {
      deps.logger("starting export")
      const exportId = deps.UUIDGen.NewUUID();
      try {
        const allowed = await deps.permissionsService.CheckPermissions(
          user,
          deps.allowedPermission
        );
        if (!allowed) {
          throw new Error("incorrect permission");
        }
        const newStatus = {
          status: "CREATED",
          id: exportId,
        };
        await set(exportId, JSON.stringify(newStatus));

        const writable = data.pipe(newCacheWriter(exportId, deps.cache));
        writables[exportId] = writable;
        return newStatus;
      } catch (e) {
        console.log("error");
        delete writables[exportId];
        throw e;
      }
    },
    GetExportStatus: async (exportId) => {
      const strStatus = await get(exportId);
      if (!strStatus) {
        throw new Error(`no export found for id: ${exportId}`);
      }
      const status: ExportStatus = JSON.parse(strStatus);
      return status;
    },
    CancelExport: (exportId) => {
      writables[exportId].end();

      writables[exportId].on('close', async () => {
        await set(exportId, JSON.stringify({ status: "CANCELLED", id: exportId }));
        delete writables[exportId];
        console.log(`Cancelled Export ${exportId}`);
      })
    }
  };
};

function newCacheWriter(exportId: string, cache: RedisClient) {
  const append = util.promisify(cache.APPEND).bind(cache);
  const set = util.promisify(cache.SET).bind(cache);
  const expire = util.promisify(cache.EXPIRE).bind(cache);
  return new Writable({
    async write(chunk, _, callback) {
      await append(exportId + "-data", chunk.toString("binary"));
      await set(exportId, JSON.stringify({ status: "PENDING", id: exportId }));
      callback();
    },
    async final(callback) {
      await set(exportId, JSON.stringify({ status: "COMPLETE", id: exportId }));
      await expire(exportId, 60 * 60);
      await expire(exportId + "-data", 60 * 60);
      delete writables[exportId];
      callback();
    },
  });
}
