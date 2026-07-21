import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTenantUpdatePayload, updateTenantSchema } from "./tenants";

test("normalizeTenantUpdatePayload fills missing regional values with defaults", () => {
  const payload = {
    description: "",
    website: "",
    currency: undefined,
    timezone: undefined,
    default_locale: undefined
  };

  const normalized = normalizeTenantUpdatePayload(payload);

  assert.equal(normalized.description, null);
  assert.equal(normalized.website, null);
  assert.equal(normalized.currency, "IDR");
  assert.equal(normalized.timezone, "UTC");
  assert.equal(normalized.default_locale, "en");

  const parsed = updateTenantSchema.safeParse(normalized);
  assert.equal(parsed.success, true);
});

test("partial tenant updates do not require name", () => {
  const parsed = updateTenantSchema.safeParse({
    currency: "USD",
    timezone: "UTC"
  });

  assert.equal(parsed.success, true);
});
