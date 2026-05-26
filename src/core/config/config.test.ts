import { describe, test, expect } from 'vitest';

import { validateConfig } from './config';

describe('validateConfig', () => {
  const validConfig = {
    fieldPaths: {
      cardNumber: '/card-number',
      cvv: '/cvv',
      expiry: '/expiry',
    },
    hostedFieldsUrl: 'https://fields.example.com',
    publicKey: 'pk_test_123',
  };

  test('should return a valid SDKConfig when all required fields are provided', () => {
    const result = validateConfig(validConfig);

    expect(result.publicKey).toBe('pk_test_123');
    expect(result.hostedFieldsUrl).toBe('https://fields.example.com');
    expect(result.fieldPaths.cardNumber).toBe('/card-number');
    expect(result.fieldPaths.expiry).toBe('/expiry');
    expect(result.fieldPaths.cvv).toBe('/cvv');
    expect(result.sessionId).toBeDefined();
  });

  test('should remove trailing slashes from hostedFieldsUrl', () => {
    const result = validateConfig({
      ...validConfig,
      hostedFieldsUrl: 'https://fields.example.com///',
    });

    expect(result.hostedFieldsUrl).toBe('https://fields.example.com');
  });

  test('should use provided sessionId when given', () => {
    const result = validateConfig({ ...validConfig, sessionId: 'custom-session' });

    expect(result.sessionId).toBe('custom-session');
  });

  test('should generate a 32-char hex sessionId when not provided', () => {
    const result = validateConfig(validConfig);

    expect(result.sessionId).toMatch(/^[0-9a-f]{32}$/);
  });

  test('should throw when config is null or undefined', () => {
    expect(() => validateConfig(null)).toThrow('Configuration object is required');
    expect(() => validateConfig(undefined)).toThrow('Configuration object is required');
  });

  test('should throw when config is not an object', () => {
    expect(() => validateConfig('string')).toThrow('Configuration object is required');
    expect(() => validateConfig(123)).toThrow('Configuration object is required');
  });

  test('should throw when publicKey is missing or empty', () => {
    expect(() => validateConfig({ ...validConfig, publicKey: '' })).toThrow('publicKey');
    expect(() => validateConfig({ ...validConfig, publicKey: 123 })).toThrow('publicKey');
  });

  test('should throw when hostedFieldsUrl is missing or empty', () => {
    expect(() => validateConfig({ ...validConfig, hostedFieldsUrl: '' })).toThrow(
      'hostedFieldsUrl',
    );
  });

  test('should throw when hostedFieldsUrl is not a valid URL', () => {
    expect(() =>
      validateConfig({ ...validConfig, hostedFieldsUrl: 'not-a-url' }),
    ).toThrow('valid absolute URL');

    expect(() =>
      validateConfig({ ...validConfig, hostedFieldsUrl: 'ftp://fields.example.com' }),
    ).toThrow('valid absolute URL');
  });

  test('should throw when fieldPaths is missing', () => {
    const { fieldPaths, ...withoutPaths } = validConfig;
    expect(() => validateConfig(withoutPaths)).toThrow('fieldPaths');
  });

  test('should throw when fieldPaths is not an object', () => {
    expect(() => validateConfig({ ...validConfig, fieldPaths: 'invalid' })).toThrow('fieldPaths');
  });

  test('should throw when a fieldPaths property is missing or empty', () => {
    expect(() =>
      validateConfig({
        ...validConfig,
        fieldPaths: { cardNumber: '/card', cvv: '', expiry: '/exp' },
      }),
    ).toThrow('fieldPaths.cvv');

    expect(() =>
      validateConfig({
        ...validConfig,
        fieldPaths: { cardNumber: '/card', cvv: '/cvv' },
      }),
    ).toThrow('fieldPaths.expiry');
  });
});
