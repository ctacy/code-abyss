'use strict';

// 轻量 schema guard：在部署前校验 bundled settings.json 的关键枚举字段
// 防止 v2.1.11 ccstatusline 2.2.18 Zod schema 那种"非法 flexMode 值导致整文件
// 被 ZodError 重置回默认单行预设"的事故复发。
//
// 这里只校验 ccstatusline 实际会用 Zod 严格枚举验证的字段，不复刻全部
// schema —— 上游升版扩字段时 guard 不阻断，只在已知枚举字段越界时报错。

const VALID_FLEX_MODE = new Set(['full', 'full-minus-40', 'full-until-compact']);

function validateCcstatuslineSettings(settings) {
  const errors = [];

  if (settings == null || typeof settings !== 'object') {
    errors.push('settings 必须是对象');
    return errors;
  }

  // flexMode 是 v2.2.18 Zod 严格枚举字段
  if (Object.prototype.hasOwnProperty.call(settings, 'flexMode')) {
    if (!VALID_FLEX_MODE.has(settings.flexMode)) {
      errors.push(
        `flexMode 非法值: ${JSON.stringify(settings.flexMode)}；` +
        `合法值: ${[...VALID_FLEX_MODE].join(' | ')}`
      );
    }
  }

  // version 数字
  if (Object.prototype.hasOwnProperty.call(settings, 'version')
    && typeof settings.version !== 'number') {
    errors.push('version 必须是数字');
  }

  // lines 数组
  if (Object.prototype.hasOwnProperty.call(settings, 'lines')
    && !Array.isArray(settings.lines)) {
    errors.push('lines 必须是数组');
  }

  return errors;
}

module.exports = { validateCcstatuslineSettings, VALID_FLEX_MODE };
