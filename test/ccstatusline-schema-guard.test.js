'use strict';

const { validateCcstatuslineSettings, VALID_FLEX_MODE } = require('../bin/optional/ccstatusline/schema-guard');

describe('bin/optional/ccstatusline/schema-guard', () => {
  describe('validateCcstatuslineSettings', () => {
    test('合法 flexMode 全部接受', () => {
      ['full', 'full-minus-40', 'full-until-compact'].forEach((mode) => {
        expect(validateCcstatuslineSettings({ flexMode: mode })).toEqual([]);
      });
    });

    test('非法 flexMode 报错（防 v2.1.11 ZodError 复发）', () => {
      const errors = validateCcstatuslineSettings({ flexMode: 'full-minus-20' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/flexMode/);
      expect(errors[0]).toMatch(/full-minus-20/);
    });

    test('未声明 flexMode 不报错', () => {
      expect(validateCcstatuslineSettings({ version: 3 })).toEqual([]);
    });

    test('空对象不报错', () => {
      expect(validateCcstatuslineSettings({})).toEqual([]);
    });

    test('非对象输入直接报错', () => {
      expect(validateCcstatuslineSettings(null).length).toBeGreaterThan(0);
      expect(validateCcstatuslineSettings('hello').length).toBeGreaterThan(0);
      expect(validateCcstatuslineSettings(42).length).toBeGreaterThan(0);
    });

    test('version 类型错误报错', () => {
      const errors = validateCcstatuslineSettings({ version: '3' });
      expect(errors.some((e) => /version/.test(e))).toBe(true);
    });

    test('lines 类型错误报错', () => {
      const errors = validateCcstatuslineSettings({ lines: 'not-array' });
      expect(errors.some((e) => /lines/.test(e))).toBe(true);
    });
  });

  describe('VALID_FLEX_MODE', () => {
    test('包含官方 3 个枚举值', () => {
      expect(VALID_FLEX_MODE.has('full')).toBe(true);
      expect(VALID_FLEX_MODE.has('full-minus-40')).toBe(true);
      expect(VALID_FLEX_MODE.has('full-until-compact')).toBe(true);
    });

    test('不包含 v2.1.11 误用的 full-minus-20', () => {
      expect(VALID_FLEX_MODE.has('full-minus-20')).toBe(false);
    });
  });
});
