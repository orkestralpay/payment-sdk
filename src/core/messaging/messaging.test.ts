import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { Messenger } from './messaging';

describe('Messenger', () => {
  const allowedOrigin = 'https://fields.example.com';
  let messenger: Messenger;

  beforeEach(() => {
    messenger = new Messenger(allowedOrigin);
  });

  afterEach(() => {
    messenger.destroy();
  });

  describe('listen', () => {
    test('should call handler when receiving a valid message from allowed origin', () => {
      const handler = vi.fn();

      messenger.listen(handler);

      const event = new MessageEvent('message', {
        data: { field: 'cardNumber', type: 'ready' },
        origin: allowedOrigin,
      });

      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith({ field: 'cardNumber', type: 'ready' });
    });

    test('should ignore messages from disallowed origins', () => {
      const handler = vi.fn();

      messenger.listen(handler);

      const event = new MessageEvent('message', {
        data: { field: 'cardNumber', type: 'ready' },
        origin: 'https://malicious.com',
      });

      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    test('should ignore messages without a type property', () => {
      const handler = vi.fn();

      messenger.listen(handler);

      const event = new MessageEvent('message', {
        data: { action: 'something' },
        origin: allowedOrigin,
      });

      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    test('should ignore messages with null or non-object data', () => {
      const handler = vi.fn();

      messenger.listen(handler);

      window.dispatchEvent(
        new MessageEvent('message', { data: null, origin: allowedOrigin }),
      );
      window.dispatchEvent(
        new MessageEvent('message', { data: 'string', origin: allowedOrigin }),
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    test('should post a message to the iframe contentWindow with correct origin', () => {
      const postMessageMock = vi.fn();

      const iframe = {
        contentWindow: { postMessage: postMessageMock },
      } as unknown as HTMLIFrameElement;

      messenger.send(iframe, { action: 'setPlaceholder', placeholder: '4111' });

      expect(postMessageMock).toHaveBeenCalledWith(
        { action: 'setPlaceholder', placeholder: '4111' },
        allowedOrigin,
      );
    });

    test('should not throw when iframe contentWindow is null', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const iframe = { contentWindow: null } as unknown as HTMLIFrameElement;

      expect(() => messenger.send(iframe, { action: 'setPlaceholder', placeholder: '' })).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('contentWindow is null'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    test('should stop receiving messages after destroy', () => {
      const handler = vi.fn();

      messenger.listen(handler);
      messenger.destroy();

      const event = new MessageEvent('message', {
        data: { field: 'cardNumber', type: 'ready' },
        origin: allowedOrigin,
      });

      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
