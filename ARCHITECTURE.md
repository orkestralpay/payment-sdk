# Payment SDK Architecture

## Overview

The `@orkestralpay/payment-sdk` implements the **Hosted Fields** pattern for secure card data capture. The core principle is: **sensitive data never touches the merchant's code**.

```
┌──────────────────────────────────────────────────────────────┐
│  Merchant's Page (domain: store.example.com)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  PaymentSDK (JavaScript on the merchant's page)        │  │
│  │                                                        │  │
│  │  ┌──────────────┐ ┌───────────┐ ┌──────────────────┐  │  │
│  │  │IframeManager │ │ Messenger │ │  EventEmitter    │  │  │
│  │  │              │ │           │ │                  │  │  │
│  │  │ Creates and  │ │postMessage│ │ Typed on/off/   │  │  │
│  │  │ destroys     │ │with origin│ │ emit            │  │  │
│  │  │ iframes      │ │validation │ │                  │  │  │
│  │  └──────┬───────┘ └─────┬─────┘ └────────┬────────┘  │  │
│  └─────────┼───────────────┼────────────────┼───────────┘  │
│            │               │                │               │
│ ═══════════╪═══════════════╪════════════════╪════════════   │
│  SECURITY BARRIER (cross-origin iframe boundary)            │
│ ═══════════╪═══════════════╪════════════════╪════════════   │
│            │               │                │               │
│  ┌─────────▼───────────────▼────────────────▼───────────┐  │
│  │  Hosted Fields Server (domain: fields.provider.com)   │  │
│  │                                                       │  │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐    │  │
│  │  │ cardNumber │   │   expiry   │   │    cvv     │    │  │
│  │  │   <input>  │   │   <input>  │   │   <input>  │    │  │
│  │  └────────────┘   └────────────┘   └────────────┘    │  │
│  │             hidden same-origin aggregator             │  │
│  │                                                       │  │
│  │  Each iframe is an independent mini-app that:         │  │
│  │  • Renders a styled input                             │  │
│  │  • Validates data locally                             │  │
│  │  • Sends only field state to the SDK via postMessage  │  │
│  │  • Aggregator sends card data directly to backend     │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Why Hosted Fields?

| Approach | PCI Scope | Risk |
|----------|-----------|------|
| Merchant collects data and sends to backend | **SAQ-D** (most strict) | Card data in merchant's JS |
| Redirect to PSP page | SAQ-A | Merchant loses UX control |
| **Hosted Fields (iframes)** | **SAQ-A** | Data isolated, customizable UX |

The merchant never has access to the card number, CVV, or expiry. It receives only sanitized tokenization or payment results.

---

## Internal Components

### 1. `PaymentSDK` (entry point)

```
PaymentSDK.init(config)
     │
     ├── validateConfig() → validates and normalizes (generates sessionId if needed)
     │
     └── returns SDK instance
            │
            └── sdk.createCreditCard(options) → creates CreditCard instance
```

Responsibilities:
- Validate configuration
- Manage `CreditCard` lifecycle
- Expose `getSessionId()` and `destroy()`

### 2. `CreditCard` (orchestrator)

The heart of the SDK. Coordinates the other components:

```typescript
class CreditCard {
  #config       // Validated configuration
  #messenger    // Communication with iframes
  #events       // Event emission for the merchant
  #iframeManager // Iframe creation/removal
  #destroyed    // Protection flag
}
```

Responsibilities:
- Instantiate `Messenger`, `EventEmitter`, `IframeManager`
- Listen to iframe messages and re-emit them as typed events
- Execute tokenization and payment operations (send command + await response)

### 3. `IframeManager` (DOM)

```
create(options)
  │
  ├── For each field (cardNumber, expiry, cvv):
  │     │
  │     ├── Finds container via CSS selector
  │     ├── Creates <iframe> with src = hostedFieldsUrl + fieldPath + query params
  │     ├── Sets security attributes (sandbox)
  │     ├── On load: sends styles and placeholder via Messenger
  │     └── Appends to DOM
  │
   ├── Creates a hidden aggregator iframe on the Hosted Fields origin
   └── Tracks readiness for all four iframes
```

Iframe URL format:
```
https://fields.provider.com/card-number?session=abc123&key=pk_live_xxx&instance=...&origin=...
```

Sandbox attribute:
```
allow-scripts allow-same-origin allow-forms
```

### 4. `Messenger` (communication)

Wraps `window.postMessage` with origin validation:

```typescript
// Send command to iframe
messenger.send(aggregator, { action: 'tokenize', correlationId, paymentIntentId })

// Listen for messages from iframes
messenger.listen((message) => {
  // Only executes if event.origin === allowedOrigin
  // Only executes if message has a "type" property
})
```

**Security:** any message from an origin other than `hostedFieldsUrl` is silently discarded.

### 5. `EventEmitter` (typed pub/sub)

```typescript
// Internally uses Map<string, Set<Function>>
events.on('change', callback)   // register
events.emit('change', payload)  // fire
events.off('change', callback)  // remove
events.removeAllListeners()     // clear all (used on destroy)
```

---

## Communication Flow

### Direction: SDK → Iframe (commands)

| Message | When | Payload |
|---------|------|---------|
| `applyStyles` | After iframe loads | `{ action, styles }` |
| `setPlaceholder` | After iframe loads | `{ action, placeholder }` |
| `tokenize` | Merchant calls `card.tokenize()` | `{ action, correlationId, paymentIntentId }` |
| `pay` | Merchant calls `card.pay()` | `{ action, correlationId, paymentIntentId }` |
| `payWithSavedCard` | Merchant calls `card.payWithSavedCard()` | `{ action, correlationId, paymentIntentId, token }` |

### Direction: Iframe → SDK (events)

| Message | When | Payload |
|---------|------|---------|
| `ready` | Iframe internal JS initialized | `{ type, field }` |
| `focus` | User clicked the input | `{ type, field }` |
| `blur` | User left the input | `{ type, field }` |
| `change` | Input value changed | `{ type, field, empty, complete }` |
| `validation` | Validation state changed | `{ type, field, valid, error? }` |
| Operation result | Aggregator completed | `{ type, correlationId, data }` |
| `error` | Unexpected error | `{ type, correlationId?, field?, code, message }` |

### Why `ready` comes from the iframe (not the SDK)

The SDK creates the `<iframe>` DOM element, but doesn't control what happens **inside** it. The flow is:

1. SDK creates `<iframe src="https://fields.provider.com/card-number?...">`
2. Browser loads the HTML/JS from the Hosted Fields Server
3. The iframe's internal JS initializes (sets up the input, registers listeners, etc.)
4. The iframe sends `postMessage({ type: 'ready', field: 'cardNumber' })` back to the SDK

The `load` event on the iframe indicates the **HTML document** loaded, but does not guarantee the **internal JavaScript** finished initializing. The `ready` message via postMessage is the definitive confirmation: "I am ready to receive commands and user input."

---

## Detailed Flows

### Initialization

```
 1. Merchant calls PaymentSDK.init(config)
 2. SDK validates config (publicKey, hostedFieldsUrl, fieldPaths)
 3. SDK generates sessionId (32-char hex) if not provided
 4. Merchant calls sdk.createCreditCard(options)
 5. CreditCard instantiates Messenger and IframeManager
 6. IframeManager creates 3 visible fields and 1 hidden aggregator iframe
 7. Browser loads each iframe from the Hosted Fields Server
 8. Each iframe executes its internal JS and sends { type: 'ready', field: '...' }
 9. SDK receives it, marks field as ready, emits 'ready' event to the merchant
10. When all 4 iframes send 'ready', card operations are available
```

### User Interaction

```
1. User clicks the card number field
   └─ Iframe detects focus on <input>
   └─ Iframe sends: { type: 'focus', field: 'cardNumber' }
   └─ SDK Messenger receives (validates origin ✓)
   └─ CreditCard.#handleMessage() → events.emit('focus', { field: 'cardNumber' })
   └─ Merchant's callback fires: card.on('focus', callback)

2. User types "4111 1111 1111 1111"
   └─ On each keystroke, iframe sends:
      { type: 'change', field: 'cardNumber', empty: false, complete: false }
   └─ On the last valid digit:
      { type: 'change', field: 'cardNumber', empty: false, complete: true }
   └─ Merchant uses `complete` to enable/disable the payment button

3. User leaves the field (tab)
   └─ Iframe sends: { type: 'blur', field: 'cardNumber' }
   └─ Iframe validates the complete value
   └─ Iframe sends: { type: 'validation', field: 'cardNumber', valid: true }
   └─ Merchant can show a green ✓ indicator on the container
```

### Card operation

1. The merchant calls `tokenize`, `pay`, or `payWithSavedCard` with a PaymentIntent ID.
2. The SDK sends the command and an internal `correlationId` to the hidden aggregator.
3. The aggregator reads the required same-origin field APIs. Saved-card payment reads only CVV.
4. The aggregator posts directly to the corresponding PaymentIntent endpoint.
5. The aggregator returns a sanitized result carrying the same `correlationId`.

**Timeout:** If the aggregator does not respond within 30 seconds, the Promise rejects with `TOKENIZE_TIMEOUT`.

**Protection:** If `card.destroy()` has already been called, it returns immediately with an `SDK_DESTROYED` error.

---

## Security

### Isolation via cross-origin iframe

The merchant's JavaScript **cannot**:
- Access `iframe.contentDocument` (blocked by same-origin policy)
- Read input values inside the iframe
- Intercept the tokenization POST to the backend

### Origin Validation

```typescript
// Messenger discards any message from an unexpected origin
if (event.origin !== this.#allowedOrigin) return;
```

This prevents attacks where a malicious script tries to inject fake messages via `postMessage`.

### Sandbox

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms">
```

- `allow-scripts` — required for internal JS to work
- `allow-same-origin` — required for postMessage with origin
- `allow-forms` — required for data submission to the backend
- **Does not have** `allow-top-navigation` — iframe cannot redirect the page

### Disposable Token

The merchant only receives:
```json
{
  "token": "tok_abc123",
  "lastFourDigits": "4242",
  "expiryMonth": "12",
  "expiryYear": "2028",
  "cardBrand": "visa"
}
```

Never the full card number, CVV, or raw data.

---

## File Structure

```
src/
├── index.ts                          # Entry point: PaymentSDK class
├── core/
│   ├── config.ts                     # Config validation and normalization
│   ├── events.ts                     # Generic typed EventEmitter
│   ├── messaging.ts                  # postMessage wrapper with origin check
│   └── types.ts                      # All public and internal types
└── methods/
    └── credit-card/
        ├── index.ts                  # CreditCard class (orchestrator)
        └── iframe-manager.ts         # Iframe creation/management in the DOM
```

---

## Lifecycle

```
init() ──► createCreditCard() ──► [user interacts] ──► card operation ──► destroy()
  │              │                                           │              │
  │              ├─ creates Messenger                        │              ├─ removes iframes
  │              ├─ creates EventEmitter                     │              ├─ removes listeners
  │              ├─ creates IframeManager                    │              └─ clears references
   │              └─ injects 4 iframes                        │
  │                                                          │
  └─ validates config                                        └─ resolves Promise
   generates sessionId                                        with sanitized result
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `#` private fields (not TS `private`) | Runtime encapsulation — not accessible via reflection |
| Same-origin field API | Keeps raw card values out of merchant `postMessage` traffic |
| `postMessage` with origin and source checks | Restricts SDK/aggregator commands and results |
| Promise with operation timeout | Prevents infinite hang if the aggregator freezes |
| Custom EventEmitter (not EventTarget) | Smaller bundle, simpler API, strong typing |
| Style merging (global + per-field) | Flexibility: base style + per-field override |
| instanceId as query param | Lets the aggregator select only fields from its SDK instance |
| Runtime config validation | SDK is consumed as a lib — no guarantee of TS on the merchant side |
