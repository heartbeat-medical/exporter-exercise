import {createClient} from "redis-mock";
import {HBExporter, HBExporterDependencies} from "./exporter";
import {MockUUIDGen} from "./uuid";
import {MockPermissions} from "./permissions";
import {NewMockLogger} from "./logger";
import {createReadStream} from "fs";

function mockOpenFile() {
	return createReadStream("myexport.txt", {
		encoding: "utf8",
		autoClose: true,
	});
}


describe('Exporter', function () {
	const redisClient = createClient();
	const exporterDeps: HBExporterDependencies = {
		cache: redisClient,
		UUIDGen: MockUUIDGen,
		allowedPermission: "exporter",
		permissionsService: MockPermissions,
		logger: NewMockLogger("exporter"),
	};
	const myUser = {
		id: "1",
		permissions: ["exporter"],
	};

	const exporter = HBExporter(exporterDeps);

	describe('CancelExport', function () {
		it('should throw an error when export job does not exist', async () => {
			await expect(exporter.CancelExport("SomeID")).rejects.toThrow("no export found for id:")
		});

		it('should start job and close and job successfully and close stream', async () => {
			const streamJob = mockOpenFile();
			const job =  await exporter.StartExport(myUser, streamJob);
			expect(streamJob.destroyed).toBe(false)

			const jobUpdate = await exporter.CancelExport(job.id)
			expect(streamJob.destroyed).toBe(true)
			expect(jobUpdate.status).toEqual("CANCELED")
		});

	});
});
