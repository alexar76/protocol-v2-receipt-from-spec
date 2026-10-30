import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseJSON } from "./jsontext.mjs";
import { verifyReceipt } from "./verify.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "aimarket-protocol", "test-vectors");

const cases = [
  ["receipt-signed.json", true, ""],
  ["receipt-v2-signed.json", true, ""],
  ["negative/receipt-flipped-success.json", false, "signature-invalid"],
  ["negative/receipt-tampered-latency.json", false, "signature-invalid"],
  ["negative/receipt-stale-timestamp.json", false, "signature-invalid"],
  ["negative/receipt-wrong-signer.json", false, "signature-invalid"],
  ["negative/receipt-v2-downgraded-to-v1.json", false, "version-under-covers-content"],
];

let failed = 0;
for (const [file, accept, reason] of cases) {
  const doc = parseJSON(readFileSync(join(root, file), "utf8"));
  const got = verifyReceipt(doc);
  try {
    assert.equal(got.ok, accept, file);
    assert.equal(got.reason, reason, file);
    if (reason === "version-under-covers-content") assert.ok(got.unsigned.length > 0);
    console.log("ok", file);
  } catch (err) {
    failed++;
    console.error("FAIL", file, got, err.message);
  }
}
if (failed) process.exit(1);
