---
name: credential-autofill
description: Bulletproof form input autofill for React, Vue, Angular, and shadow DOM with native descriptor bypass and password isolation
triggers:
  - form
  - fill
  - autofill
  - input
  - login
  - password
  - credentials
version: 1.0.0
---

# Credential Autofill — High-Reliability Form Automation

Engineered to bypass virtual DOM state interception in React, Vue, and Angular applications, where direct property mutations (`element.value = '...'`) are ignored by framework internal listeners.

## Core Procedural Principles

### 1. Prototype Descriptor Bypass (The React Pattern)
React overrides the native HTMLInputElement value setter. To trigger React's internal state machine, you must invoke the native prototype setter directly on the DOM element:
```javascript
function setNativeInputValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value') 
    || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}
```

### 2. Synthetic Event Dispatch
Frameworks listen for synthetic `input` and `change` events bubbling up the DOM tree:
```javascript
element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
```

### 3. Verification & Password Sanitization
- Read back `element.value` to verify that text matches the intended value.
- For `type="password"`, never echo raw plaintext in conversational LLM outputs.
- Store sensitive login tokens or passwords only in the curated [MEMORY.md](file:///c:/Users/Aditya/Downloads/automated%20browser/second%20brain/memory/MEMORY.md) [PINNED] tier and 90-day raw logs.
