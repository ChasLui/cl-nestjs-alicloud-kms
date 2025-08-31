import {
  KmsModule,
  KmsService,
  KMS_CONFIG_TOKEN,
  KMS_LOGGER_TOKEN,
  mergeConfig,
  mergeMultipleConfigs,
  validateRequiredKeys,
  filterEmptyValues,
  unflattenConfig,
  flattenConfig,
  getErrorMessage,
} from '../src/index';

describe('索引导出模块', () => {
  describe('模块和服务导出', () => {
    it('应该导出KmsModule', () => {
      expect(KmsModule).toBeDefined();
      expect(typeof KmsModule).toBe('function');
    });

    it('应该导出KmsService', () => {
      expect(KmsService).toBeDefined();
      expect(typeof KmsService).toBe('function');
    });

    it('应该导出令牌', () => {
      expect(KMS_CONFIG_TOKEN).toBe('KMS_CONFIG_TOKEN');
      expect(KMS_LOGGER_TOKEN).toBe('KMS_LOGGER_TOKEN');
    });
  });

  describe('工具函数导出', () => {
    it('应该导出mergeConfig', () => {
      expect(mergeConfig).toBeDefined();
      expect(typeof mergeConfig).toBe('function');
    });

    it('应该导出mergeMultipleConfigs', () => {
      expect(mergeMultipleConfigs).toBeDefined();
      expect(typeof mergeMultipleConfigs).toBe('function');
    });

    it('应该导出validateRequiredKeys', () => {
      expect(validateRequiredKeys).toBeDefined();
      expect(typeof validateRequiredKeys).toBe('function');
    });

    it('应该导出filterEmptyValues', () => {
      expect(filterEmptyValues).toBeDefined();
      expect(typeof filterEmptyValues).toBe('function');
    });

    it('应该导出unflattenConfig', () => {
      expect(unflattenConfig).toBeDefined();
      expect(typeof unflattenConfig).toBe('function');
    });

    it('应该导出flattenConfig', () => {
      expect(flattenConfig).toBeDefined();
      expect(typeof flattenConfig).toBe('function');
    });

    it('应该导出getErrorMessage', () => {
      expect(getErrorMessage).toBeDefined();
      expect(typeof getErrorMessage).toBe('function');
    });
  });

  describe('导出函数集成测试', () => {
    it('应该正确使用导出的mergeConfig函数', () => {
      const result = mergeConfig({ a: 1 }, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('应该正确使用导出的getErrorMessage函数', () => {
      const result = getErrorMessage(new Error('test'));
      expect(result).toBe('test');
    });
  });
});
