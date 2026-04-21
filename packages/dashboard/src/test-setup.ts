import "@testing-library/jest-dom/vitest";
// Polyfill for Next.js Request/Response in node test environment. jsdom
// doesn't include TextEncoder/TextDecoder by default in some older versions —
// vitest needs them for route handler tests that parse Request bodies.
import { TextDecoder, TextEncoder } from "node:util";

if (typeof globalThis.TextEncoder === "undefined") {
  // @ts-expect-error polyfill
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  // @ts-expect-error polyfill
  globalThis.TextDecoder = TextDecoder;
}
