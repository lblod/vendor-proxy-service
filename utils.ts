type BooleanResult = {
  type: 'boolean';
  parsedValue: boolean;
};
type ArrayResult = {
  type: 'array';
  parsedValue: string[];
};
type UnknownResult = {
  type: 'unknown';
  parsedValue: unknown;
};
type NonJsonResult = {
  type: 'non-json';
  parsedValue: null;
};
type ProcessResult =
  BooleanResult | ArrayResult | UnknownResult | NonJsonResult;
export function parseCorsSettings(rawEnvValue: string): ProcessResult {
  let parsed = null;
  try {
    parsed = JSON.parse(rawEnvValue);
    if (typeof parsed === 'boolean') {
      return {
        type: 'boolean',
        parsedValue: parsed,
      };
    } else if (parsed instanceof Array) {
      return {
        type: 'array',
        parsedValue: parsed,
      };
    } else {
      return {
        type: 'unknown',
        parsedValue: parsed,
      };
    }
  } catch (_e) {
    console.info('env var CORS_ALLOW has a non-json value');
    return {
      type: 'non-json',
      parsedValue: null,
    };
  }
}
