import type { SDKConfig } from '../../core/config/config.types';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CreditCard } from './index';

describe('CreditCard', () => {
  const config: SDKConfig = {
    fieldPaths: { cardNumber: '/card-number', cvv: '/cvv', expiry: '/expiry' },
    hostedFieldsUrl: 'https://fields.example.com',
    publicKey: 'pk_test_123',
    sessionId: 'test-session-id',
  };
  const options = {
    cardNumber: { selector: '#card-number' },
    cvv: { selector: '#card-cvv' },
    expiry: { selector: '#card-expiry' },
  };
  const correlationId = 'test-correlation-id';

  function getAggregatorSource(): Window | null {
    const iframe = document.querySelector('iframe[title="Payment field aggregator"]');
    return (iframe as HTMLIFrameElement | null)?.contentWindow ?? null;
  }

  function dispatchAggregatorMessage(data: Record<string, unknown>): void {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin: config.hostedFieldsUrl,
        source: getAggregatorSource(),
      }),
    );
  }

  function simulateReady(): void {
    for (const field of ['cardNumber', 'expiry', 'cvv', 'aggregator']) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { field, type: 'ready' },
          origin: config.hostedFieldsUrl,
        }),
      );
    }
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="card-number"></div>
      <div id="card-expiry"></div>
      <div id="card-cvv"></div>
    `;
    vi.stubGlobal('crypto', { ...crypto, randomUUID: () => correlationId });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('creates three visible fields and one hidden aggregator', () => {
    const card = new CreditCard(config, options);

    expect(document.querySelectorAll('iframe')).toHaveLength(4);
    expect(document.querySelector('iframe[title="Payment field aggregator"]')).not.toBeNull();

    card.destroy();
  });

  test('emits field events and ignores invalid field names', () => {
    const card = new CreditCard(config, options);
    const callback = vi.fn();
    card.on('focus', callback);

    for (const field of ['cardNumber', 'invalidField']) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { field, type: 'focus' },
          origin: config.hostedFieldsUrl,
        }),
      );
    }

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith({ field: 'cardNumber' });
    card.destroy();
  });

  test('tokenize resolves the aggregator result', async () => {
    const card = new CreditCard(config, options);
    simulateReady();

    const promise = card.tokenize({ paymentIntentId: 'pi_123' });
    dispatchAggregatorMessage({
      correlationId,
      data: {
        card: { brand: 'visa', lastFourDigits: '4242' },
        error: '',
        token: 'tok_123',
      },
      type: 'tokenizeResult',
    });

    await expect(promise).resolves.toEqual({
      card: { brand: 'visa', lastFourDigits: '4242' },
      error: '',
      token: 'tok_123',
    });
    card.destroy();
  });

  test.each([
    ['pay', 'payResult'],
    ['payWithSavedCard', 'payWithSavedCardResult'],
  ] as const)('%s resolves a payment result', async (method, resultType) => {
    const card = new CreditCard(config, options);
    simulateReady();
    const paymentResult = {
      card: { brand: 'visa', lastFourDigits: '4242' },
      error: '',
      result: 'APPROVED' as const,
      transaction: { id: 'tx_123' },
    };

    const promise =
      method === 'pay'
        ? card.pay({ paymentIntentId: 'pi_123' })
        : card.payWithSavedCard({ paymentIntentId: 'pi_123', token: 'tok_123' });
    dispatchAggregatorMessage({ correlationId, data: paymentResult, type: resultType });

    await expect(promise).resolves.toEqual(paymentResult);
    card.destroy();
  });

  test('rejects operations until all fields and aggregator are ready', async () => {
    const card = new CreditCard(config, options);

    await expect(card.tokenize({ paymentIntentId: 'pi_123' })).rejects.toThrow('FIELDS_NOT_READY');
    card.destroy();
  });

  test('rejects concurrent operations', async () => {
    const card = new CreditCard(config, options);
    simulateReady();

    const first = card.pay({ paymentIntentId: 'pi_123' });
    await expect(card.tokenize({ paymentIntentId: 'pi_123' })).rejects.toThrow('TOKENIZE_BUSY');

    dispatchAggregatorMessage({
      correlationId,
      data: {
        card: { brand: 'visa', lastFourDigits: '4242' },
        error: '',
        result: 'APPROVED',
        transaction: {},
      },
      type: 'payResult',
    });
    await first;
    card.destroy();
  });

  test('ignores a response with a different correlation id', async () => {
    vi.useFakeTimers();
    const card = new CreditCard({ ...config, tokenizeTimeout: 10 }, options);
    simulateReady();

    const promise = card.tokenize({ paymentIntentId: 'pi_123' });
    const rejection = expect(promise).rejects.toThrow('TOKENIZE_TIMEOUT');
    dispatchAggregatorMessage({ correlationId: 'stale', data: {}, type: 'tokenizeResult' });
    await vi.advanceTimersByTimeAsync(10);

    await rejection;
    card.destroy();
  });

  test('rejects after destroy', async () => {
    const card = new CreditCard(config, options);
    card.destroy();

    await expect(card.tokenize({ paymentIntentId: 'pi_123' })).rejects.toThrow('SDK_DESTROYED');
  });
});
