jest.mock("../permissions");
jest.mock("../uuid");

import { Writable } from 'stream';
import redisMock from 'redis-mock';
import { HBExporter, HBExporterDependencies, newCacheWriter } from '../exporter';
import { MockUUIDGen } from '../uuid';
import { NewMockLogger } from '../logger';
import { MockPermissions } from '../permissions';
import util from 'util';

describe("HBExporter", () => {
  // Mock dependencies
  const mockCache = redisMock.createClient();
  const mockPermissionsService = MockPermissions;
  const mockUUIDGen = MockUUIDGen;
  const mockLogger = NewMockLogger("exporter");

  const mockDependencies: HBExporterDependencies = {
    cache: mockCache,
    permissionsService: mockPermissionsService,
    allowedPermission: 'somePermission',
    UUIDGen: mockUUIDGen,
    logger: mockLogger,
  };

  // Create an instance of HBExporter using mockDependencies
  const exporter = HBExporter(mockDependencies);

  // Mock the stream and writable
  const mockData: any = new Writable();
  const mockWritable: any = new Writable({
    write(chunk, _encoding, callback) {
      // This is a simple implementation that logs the chunk to the console
      console.log(chunk.toString());
      callback(); // Call the callback to indicate successful write
    }
  });

  // Mock the user
  const myUser = {
    id: "1",
    permissions: ["exporter"],
  };

  it('should start an export and update cache status', async () => {
    // Mock permissions to return true
    (mockPermissionsService.CheckPermissions as jest.Mock).mockResolvedValue(true);
    
    // Mock UUID generation
    (mockUUIDGen.NewUUID as jest.Mock).mockReturnValue('mockExportId');
    
    // Mock Redis actions
    // @ts-ignore
    mockCache.SET = jest.fn((_key, _value, callback) => {
      // @ts-ignore
      callback(null, 'OK');
    });
    // @ts-ignore
    mockCache.APPEND = jest.fn((_key, _value, callback) => {
      // @ts-ignore
      callback(null, 'OK');
    });
    // @ts-ignore
    mockCache.EXPIRE = jest.fn((_key, _value, callback) => {
      // @ts-ignore
      callback(null, 'OK');
    });
    
    // Mock writable's pipe method
    mockData.pipe = jest.fn(() => mockWritable);
    
    // Call StartExport
    const result = await exporter.StartExport(myUser, mockData);

    // Assertions
    expect(result.status).toBe('CREATED');
    expect(result.id).toBe('mockExportId');

    // Verify cache interactions
    expect(mockCache.SET).toHaveBeenCalledWith(
      'mockExportId',
      JSON.stringify({ status: 'CREATED', id: 'mockExportId' }),
      expect.any(Function)
    );

    // Verify writable's pipe method was called
    expect(mockData.pipe).toHaveBeenCalledWith(expect.any(Writable));
  });

  it('should get export status from cache', async () => {
    // Mock Redis actions
    const mockStatusObject = { status: 'PENDING', id: 'mockExportId' };
    // @ts-ignore
    mockCache.SET = jest.fn((_key, _value, callback) => {
      // @ts-ignore
      callback(null, JSON.stringify(mockStatusObject));
    });
    // @ts-ignore
    mockCache.GET = jest.fn((_key, callback) => {
      // @ts-ignore
      callback(null, JSON.stringify(mockStatusObject));
    });

    // Call GetExportStatus
    const status = await exporter.GetExportStatus('mockExportId');

    // Assertions
    expect(status.status).toBe('PENDING');
    expect(status.id).toBe('mockExportId');

    // Verify cache interaction
    expect(mockCache.GET).toHaveBeenCalledWith('mockExportId', expect.any(Function));
  });

  it.only("should write data to cache using cache writer", async () => {
    // @ts-ignore
    mockCache.SET = jest.fn((_key, _value, callback) => {
      // @ts-ignore
      callback(null, 'OK');
    });
    // @ts-ignore
    mockCache.APPEND = jest.fn((_key, _value, callback) => {
      // @ts-ignore
      callback(null, 'OK');
    });
    // @ts-ignore
    mockCache.EXPIRE = jest.fn((_key, _value, callback) => {
      // @ts-ignore
      callback(null, 'OK');
    });

    // Create cache writer
    const exportId = "test-export-id";
    const cacheWriter = newCacheWriter(exportId, mockCache);

    // Mock writable stream methods
    const writeMock = jest.spyOn(cacheWriter, "_write");
    const finalMock = jest.spyOn(cacheWriter, "_final");

    // Write data using the cache writer
    const testData = "This is a test data chunk";

    const writePromise = util.promisify(cacheWriter._write).bind(cacheWriter);
    await writePromise(Buffer.from(testData, "utf-8"), "utf-8");

    // Verify cache updates and behavior
    expect(writeMock).toHaveBeenCalledWith(expect.any(Buffer), expect.anything(), expect.any(Function));

    // Verify cache.APPEND behavior
    expect(mockCache.APPEND).toHaveBeenCalledWith(
      `${exportId}-data`,
      testData,
      expect.any(Function)
    );

    // Verify cache.SET behavior during write
    expect(mockCache.SET).toHaveBeenCalledWith(
      exportId,
      JSON.stringify({ status: "PENDING", id: exportId }),
      expect.any(Function)
    );

    // Simulate 'final' call
    const finalPromise = util.promisify(cacheWriter._final).bind(cacheWriter);
    await finalPromise();

    // Verify cache.SET behavior during final
    expect(mockCache.SET).toHaveBeenCalledWith(
      exportId,
      JSON.stringify({ status: "COMPLETE", id: exportId }),
      expect.any(Function)
    );

    // Verify cache.EXPIRE behavior
    expect(mockCache.EXPIRE).toHaveBeenCalledWith(exportId, 3600, expect.any(Function));
    expect(mockCache.EXPIRE).toHaveBeenCalledWith(`${exportId}-data`, 3600, expect.any(Function));

    // Ensure the correct number of function calls
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(finalMock).toHaveBeenCalledTimes(1);
  });
});
