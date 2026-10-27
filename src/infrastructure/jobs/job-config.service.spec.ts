import { JobConfigService } from './job-config.service';
import { JobNames } from './job-names';

describe('JobConfigService', () => {
  let service: JobConfigService;

  beforeEach(() => {
    service = new JobConfigService();
  });

  describe('generateJobId', () => {
    it('should prefix a random UUID with the job name', () => {
      const jobId = service.generateJobId(JobNames.PROCESS_CHECKOUT);

      const prefix = `${JobNames.PROCESS_CHECKOUT}-`;

      expect(jobId.startsWith(prefix)).toBe(true);
      expect(jobId.slice(prefix.length)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should generate a unique id on each call', () => {
      const first = service.generateJobId(JobNames.PROCESS_CHECKOUT);
      const second = service.generateJobId(JobNames.PROCESS_CHECKOUT);

      expect(first).not.toBe(second);
    });
  });

  describe('getJobId', () => {
    it('should join the job name and identifier', () => {
      expect(service.getJobId(JobNames.REFUND_PAYMENT, 'order-42')).toBe(
        `${JobNames.REFUND_PAYMENT}-order-42`,
      );
    });
  });

  describe('getJobOptions', () => {
    it('should set removeOnComplete and omit jobId without identifier', () => {
      const options = service.getJobOptions(JobNames.REFUND_PAYMENT);

      expect(options.removeOnComplete).toBe(true);
      expect(options.jobId).toBeUndefined();
    });

    it('should set a stable jobId when an identifier is given', () => {
      const options = service.getJobOptions(JobNames.REFUND_PAYMENT, 42);

      expect(options.jobId).toBe(`${JobNames.REFUND_PAYMENT}-42`);
    });
  });
});
