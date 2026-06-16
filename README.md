# @orkestralpay/payment-sdk

Open-source Payment SDK with **Hosted Fields** support for secure card data capture. Enables merchants to collect sensitive payment data without it ever touching their servers, achieving PCI DSS SAQ-A compliance.

## Features

- **Hosted Fields** — Card data is captured in secure iframes, isolated from the merchant's page
- **Agnostic** — Configurable endpoints; works with any Hosted Fields server implementation
- **Customizable** — Style fields to match your checkout design via a controlled CSS API
- **Save Card (Vaulting)** — Built-in support for saving cards for future payments
- **Typed Events** — Full TypeScript support with typed event emitter
- **Tree-shakeable** — Modular architecture, import only what you need
- **Multiple Formats** — ESM, CJS, and UMD builds available

## Architecture

The SDK follows a **Hosted Fields** pattern where sensitive card data never touches the merchant's page.

For a deep dive into the SDK internals such as component responsibilities, communication protocol between SDK and iframes, tokenization sequence diagrams, security model, and design decisions, see [ARCHITECTURE.md](ARCHITECTURE.md).

### Key Components

| Component | Responsibility |
|-----------|---------------|
| `PaymentSDK` | Entry point. Validates config, manages CreditCard instances |
| `CreditCard` | Orchestrates iframes, events, and tokenization |
| `IframeManager` | Creates/destroys iframe elements, builds URLs, sends initial config |
| `Messenger` | Sends `postMessage` to iframes with origin validation |
| `EventEmitter` | Typed pub/sub for field events exposed to the merchant |

## Communication Flow

The SDK and iframes communicate exclusively via `postMessage` with strict origin validation.

### SDK → Iframe (commands)

```
applyStyles   — Send CSS styles to the field input
setPlaceholder — Set the input placeholder text
tokenize      — Request card data tokenization
```

### Iframe → SDK (events)

```
ready         — Iframe JS fully initialized, ready for interaction
focus / blur  — User focused/blurred the input
change        — Input value changed (includes empty/complete flags)
validation    — Validation state changed (valid + error message)
tokenizeResult — Tokenization succeeded or failed
error         — Unexpected error inside the iframe
```

### Tokenization Sequence

```
Merchant calls card.tokenize()
       │
       ▼
SDK sends { action: 'tokenize', sessionId, saveCard, customerId }
  to the cardNumber iframe via postMessage
       │
       ▼
Iframe collects data from all 3 fields (via shared session),
  sends it to the payment backend server-side
       │
       ▼
Iframe sends { type: 'tokenizeResult', success, data/error }
  back to the SDK via postMessage
       │
       ▼
SDK resolves the Promise with TokenizeResponse
       │
       ▼
Merchant receives { success: true, data: { token, lastFourDigits, ... } }
  or { success: false, error: { code, message, field? } }
```

### Event Flow (e.g. user types in card number)

```
User types "4111..." in cardNumber iframe
       │
       ▼
Iframe detects change → sends postMessage({ type: 'change', field: 'cardNumber', empty: false, complete: false })
       │
       ▼
SDK Messenger receives message, validates origin
       │
       ▼
CreditCard.#handleMessage() dispatches to EventEmitter
       │
       ▼
Merchant's callback fires: card.on('change', ({ field, complete }) => { ... })
```

## Installation

```bash
npm install @orkestralpay/payment-sdk
```

Or via CDN:

```html
<script src="https://unpkg.com/@orkestralpay/payment-sdk/dist/umd/payment-sdk.min.js"></script>
```

## Quick Start

```ts
import { PaymentSDK } from '@orkestralpay/payment-sdk';

// 1. Initialize the SDK
const sdk = PaymentSDK.init({
  publicKey: 'pk_live_your_public_key',
  hostedFieldsUrl: 'https://fields.yourprovider.com',
  fieldPaths: {
    cardNumber: '/card-number',
    expiry: '/expiry',
    cvv: '/cvv',
  },
});

// 2. Create credit card fields
const card = sdk.createCreditCard({
  cardNumber: { selector: '#card-number', placeholder: '4111 1111 1111 1111' },
  expiry: { selector: '#card-expiry', placeholder: 'MM/YY' },
  cvv: { selector: '#card-cvv', placeholder: '123' },
  styles: {
    fontSize: '16px',
    color: '#333',
    fontFamily: 'Inter, sans-serif',
  },
});

// 3. Listen to events
card.on('ready', ({ field }) => {
  console.log(`${field} is ready`);
});

card.on('change', ({ field, complete }) => {
  // Enable pay button when all fields are complete
});

card.on('validation', ({ field, valid, error }) => {
  // Show/hide error messages below the field container
});

// 4. Tokenize on form submit
document.getElementById('pay-btn').addEventListener('click', async () => {
  const result = await card.tokenize({
    saveCard: true,
    customerId: 'cust_abc123',
    customerName: 'João Silva',
    customerDocument: '123.456.789-00',
    billingAddress: {
      postalCode: '01310-100',
      country: 'BR',
    },
  });

  if (result.success) {
    console.log('Token:', result.data.token);
    console.log('Vault ID:', result.data.vaultId);
    // Send token to your backend for payment processing
  } else {
    console.error('Error:', result.error.code, result.error.message);
  }
});
```

## Configuration

### `PaymentSDK.init(config)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `publicKey` | `string` | ✅ | Your public API key for authentication |
| `hostedFieldsUrl` | `string` | ✅ | Base URL of the Hosted Fields server |
| `fieldPaths` | `FieldPaths` | ✅ | Route paths for each iframe (see below) |
| `sessionId` | `string` | ❌ | Custom session ID (auto-generated 32-char hex if omitted) |

#### `FieldPaths`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cardNumber` | `string` | ✅ | Route path for the card number iframe |
| `expiry` | `string` | ✅ | Route path for the expiry iframe |
| `cvv` | `string` | ✅ | Route path for the CVV iframe |

### `sdk.createCreditCard(options)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cardNumber` | `FieldConfig` | ✅ | Card number field configuration |
| `expiry` | `FieldConfig` | ✅ | Expiry date field configuration |
| `cvv` | `FieldConfig` | ✅ | CVV field configuration |
| `styles` | `FieldStyles` | ❌ | Global styles applied to all fields |

#### `FieldConfig`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `selector` | `string` | ✅ | CSS selector for the container element |
| `placeholder` | `string` | ❌ | Placeholder text for the input |
| `styles` | `FieldStyles` | ❌ | Per-field style overrides |

### `card.tokenize(options?)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `saveCard` | `boolean` | ❌ | Whether to vault the card (default: `false`) |
| `customerId` | `string` | ❌* | Customer ID. **Required if `saveCard: true`** |
| `customerName` | `string` | ❌ | Cardholder's full name |
| `customerDocument` | `string` | ❌ | Tax ID / national document (CPF, DNI, RUT) |
| `billingAddress` | `BillingAddress` | ❌ | Billing address for AVS checks |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | `{ field }` | Field iframe loaded and ready for interaction |
| `focus` | `{ field }` | Field gained focus |
| `blur` | `{ field }` | Field lost focus |
| `change` | `{ field, empty, complete }` | Field value changed |
| `validation` | `{ field, valid, error? }` | Field validation state changed |
| `error` | `{ field?, code, message }` | An error occurred |

## Styling

Styles are applied inside the secure iframes via the SDK's style API. Only a controlled subset of CSS properties is supported:

```ts
const styles: FieldStyles = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontFamily: 'Inter, sans-serif',
  fontWeight: '400',
  letterSpacing: '0.5px',
  textAlign: 'left',
  padding: '12px',
  backgroundColor: 'transparent',
};
```

## API Reference

### `PaymentSDK`

| Method | Returns | Description |
|--------|---------|-------------|
| `PaymentSDK.init(config)` | `PaymentSDK` | Creates a new SDK instance |
| `sdk.createCreditCard(options)` | `CreditCard` | Creates hosted credit card fields |
| `sdk.getSessionId()` | `string` | Returns the current session ID |
| `sdk.destroy()` | `void` | Destroys the SDK and all resources |

### `CreditCard`

| Method | Returns | Description |
|--------|---------|-------------|
| `card.on(event, callback)` | `this` | Registers an event listener (chainable) |
| `card.off(event, callback)` | `this` | Removes an event listener |
| `card.tokenize(options?)` | `Promise<TokenizeResponse>` | Tokenizes the card data |
| `card.destroy()` | `void` | Removes fields and cleans up |

## Security

- Card data is captured inside cross-origin iframes — the merchant's JavaScript cannot access it
- Communication between SDK and iframes uses `postMessage` with strict origin validation
- Only a disposable token is returned to the merchant — never raw card data
- Iframes are sandboxed with `allow-scripts allow-same-origin allow-forms`

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## License

MIT
