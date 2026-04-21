import "@testing-library/jest-dom/vitest";
// Polyfill for Next.js Request/Response in node test environment. jsdom
// doesn't include TextEncoder/TextDecoder by default in some older versions —
// vitest needs them for route handler tests that parse Request bodies.
import { TextDecoder, TextEncoder } from "node:util";

const globalAny = globalThis as unknown as {
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof TextDecoder;
};

if (typeof globalAny.TextEncoder === "undefined") {
  globalAny.TextEncoder = TextEncoder;
}
if (typeof globalAny.TextDecoder === "undefined") {
  globalAny.TextDecoder = TextDecoder;
}
