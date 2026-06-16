import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { PaymentSDK } from './index';

describe('PaymentSDK', () => {
  const validConfig = {
    fieldPaths: {
      cardNumber: '/card-number',
      cvv: '/cvv',
      expiry: '/expiry',
    },
    hostedFieldsUrl: 'https://fields.example.com',
    publicKey: 'pk_test_123',
  };

  describe('init', () => {
    test('should create an SDK instance with valid config', () => {
      const sdk = PaymentSDK.init(validConfig);

      expect(sdk).toBeInstanceOf(PaymentSDK);
      expect(sdk.getSessionId()).toBeDefined();
    });

    test('should throw when config is invalid', () => {
      expect(() => PaymentSDK.init({} as any)).toThrow();
    });
  });

  describe('createCreditCard', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="card-number"></div>
        <div id="card-expiry"></div>
        <div id="card-cvv"></div>
      `;
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('should inject iframes into the specified containers', () => {
      const sdk = PaymentSDK.init(validConfig);

      sdk.createCreditCard({
        cardNumber: { selector: '#card-number' },
        cvv: { selector: '#card-cvv' },
        expiry: { selector: '#card-expiry' },
      });

      expect(document.querySelector('#card-number iframe')).not.toBeNull();
      expect(document.querySelector('#card-expiry iframe')).not.toBeNull();
      expect(document.querySelector('#card-cvv iframe')).not.toBeNull();
    });

    test('should build iframe URLs with correct params', () => {
      const sdk = PaymentSDK.init(validConfig);

      sdk.createCreditCard({
        cardNumber: { selector: '#card-number' },
        cvv: { selector: '#card-cvv' },
        expiry: { selector: '#card-expiry' },
      });

      const iframe = document.querySelector('#card-number iframe') as HTMLIFrameElement;

      expect(iframe.src).toContain('https://fields.example.com/card-number');
      expect(iframe.src).toContain('key=pk_test_123');
      expect(iframe.src).toContain('session=');
    });

    test('should set sandbox attribute on iframes', () => {
      const sdk = PaymentSDK.init(validConfig);

      sdk.createCreditCard({
        cardNumber: { selector: '#card-number' },
        cvv: { selector: '#card-cvv' },
        expiry: { selector: '#card-expiry' },
      });

      const iframe = document.querySelector('#card-number iframe') as HTMLIFrameElement;

      expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-forms');
    });

    test('should throw when a container selector is not found', () => {
      const sdk = PaymentSDK.init(validConfig);

      expect(() =>
        sdk.createCreditCard({
          cardNumber: { selector: '#nonexistent' },
          cvv: { selector: '#card-cvv' },
          expiry: { selector: '#card-expiry' },
        }),
      ).toThrow('Container not found');
    });

    test('should destroy previous credit card instance when creating a new one', () => {
      const sdk = PaymentSDK.init(validConfig);

      sdk.createCreditCard({
        cardNumber: { selector: '#card-number' },
        cvv: { selector: '#card-cvv' },
        expiry: { selector: '#card-expiry' },
      });

      expect(document.querySelectorAll('iframe').length).toBe(3);

      sdk.createCreditCard({
        cardNumber: { selector: '#card-number' },
        cvv: { selector: '#card-cvv' },
        expiry: { selector: '#card-expiry' },
      });

      expect(document.querySelectorAll('iframe').length).toBe(3);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="card-number"></div>
        <div id="card-expiry"></div>
        <div id="card-cvv"></div>
      `;
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('should remove all iframes from the DOM', () => {
      const sdk = PaymentSDK.init(validConfig);

      sdk.createCreditCard({
        cardNumber: { selector: '#card-number' },
        cvv: { selector: '#card-cvv' },
        expiry: { selector: '#card-expiry' },
      });

      sdk.destroy();

      expect(document.querySelectorAll('iframe').length).toBe(0);
    });
  });
});
