import { Test, TestingModule } from '@nestjs/testing';
import { CorrelationService } from './correlation.service';

describe('CorrelationService', () => {
  let service: CorrelationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorrelationService],
    }).compile();

    service = module.get<CorrelationService>(CorrelationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return undefined when called outside of context', () => {
    expect(service.getId()).toBeUndefined();
  });

  it('should run callback within correlation context and return id', () => {
    const correlationId = 'test-id';

    service.run(correlationId, () => {
      expect(service.getId()).toBe(correlationId);
    });
  });

  it('should isolate context across different runs', () => {
    const id1 = 'id-1';
    const id2 = 'id-2';

    service.run(id1, () => {
      expect(service.getId()).toBe(id1);
    });

    service.run(id2, () => {
      expect(service.getId()).toBe(id2);
    });
  });

  it('should correctly propagate context through async boundaries', async () => {
    const id = 'async-id';

    await service.run(id, async () => {
      expect(service.getId()).toBe(id);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.getId()).toBe(id);
    });
  });

  it('should return result from run method', () => {
    const result = service.run('some-id', () => {
      return 'hello-world';
    });

    expect(result).toBe('hello-world');
  });

  it('should generate a valid UUID', () => {
    const uuid = service.generate();
    expect(typeof uuid).toBe('string');
    // Check basic UUID v4 format
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
