import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAuthCallbackAbsoluteUrl, sanitizeInternalNextPath } from "./redirect-urls";
import { getSiteUrlFromRequest } from "./site-url";

describe("sanitizeInternalNextPath", () => {
  it("keeps simple paths", () => {
    assert.equal(sanitizeInternalNextPath("/assistant"), "/assistant");
    assert.equal(sanitizeInternalNextPath("/dashboard"), "/dashboard");
  });

  it("allows query strings", () => {
    assert.equal(sanitizeInternalNextPath("/assistant?x=1"), "/assistant?x=1");
  });

  it("rejects open redirects", () => {
    assert.equal(sanitizeInternalNextPath("//evil.com"), "/assistant");
    assert.equal(sanitizeInternalNextPath("https://evil.com"), "/assistant");
    assert.equal(sanitizeInternalNextPath("javascript:alert(1)"), "/assistant");
  });

  it("uses fallback", () => {
    assert.equal(sanitizeInternalNextPath(null), "/assistant");
    assert.equal(sanitizeInternalNextPath(null, "/login"), "/login");
    assert.equal(sanitizeInternalNextPath(undefined, "/x"), "/x");
  });
});

describe("getSiteUrlFromRequest", () => {
  it("prefers x-forwarded-host", () => {
    const req = new Request("http://internal:3000/auth/callback", {
      headers: new Headers({
        "x-forwarded-host": "psyassist.example",
        "x-forwarded-proto": "https",
      }),
    });
    assert.equal(getSiteUrlFromRequest(req), "https://psyassist.example");
  });

  it("falls back to request URL origin", () => {
    const req = new Request("http://localhost:3001/login");
    assert.equal(getSiteUrlFromRequest(req), "http://localhost:3001");
  });
});

describe("buildAuthCallbackAbsoluteUrl", () => {
  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    try {
      assert.equal(
        buildAuthCallbackAbsoluteUrl("/assistant"),
        "https://app.example.com/auth/callback?next=%2Fassistant"
      );
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});
