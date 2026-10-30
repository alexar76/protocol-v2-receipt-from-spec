// Receipt verifier written from AIMarket Protocol v2 spec.md §7.3 and test-vectors/.
// The reference hub sources were not consulted.
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";
import { emit } from "./jsontext.mjs";

// Fixed vector key from test-vectors/README.md. The key inside a receipt is a
// claim, not an identity (§7.3.1, negative vector receipt-wrong-signer).
export const PINNED_PUBLIC_KEY_B64 = "11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=";

const V2_KEYS = [
  "type",
  "channel_id",
  "category",
  "plugin",
  "reason",
  "verify_score",
  "delivery_reasons",
  "trace_id",
  "refunded",
];

const NULL = { t: "null" };

function pinnedKey() {
  const raw = Buffer.from(PINNED_PUBLIC_KEY_B64, "base64");
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]);
  return createPublicKey({ key: spki, format: "der", type: "spki" });
}

function str(node, fallback = "") {
  if (!node) return fallback;
  if (node.t !== "str") throw new Error("expected string");
  return node.v;
}

function v1Canonical(doc) {
  const success = doc.get("success");
  const successBit = success && success.t === "bool" && success.v ? "1" : "0";
  const latency = doc.get("latency_ms");
  const price = doc.get("price_usd");
  return [
    "nonce:" + str(doc.get("nonce")),
    "product_id:" + str(doc.get("product_id")),
    "capability_id:" + str(doc.get("capability_id")),
    "price_usd:" + (price && price.t === "num" ? price.v : "0"),
    "timestamp:" + str(doc.get("timestamp")),
    "success:" + successBit,
    "latency_ms:" + (latency && latency.t === "num" ? latency.v : "0"),
  ].join("|");
}

function fieldsDigest(doc) {
  const map = new Map();
  for (const key of V2_KEYS) {
    map.set(key, doc.has(key) ? doc.get(key) : NULL);
  }
  const encoded = emit({ t: "obj", v: map });
  return createHash("sha256").update(encoded).digest("hex");
}

function presentV2(doc) {
  return V2_KEYS.filter((key) => doc.has(key) && doc.get(key).t !== "null");
}

function signatureValid(canonical, sigB64) {
  const sig = Buffer.from(sigB64, "base64");
  return cryptoVerify(null, Buffer.from(canonical), pinnedKey(), sig);
}

// Verify one parsed receipt object (the parser's obj node).
export function verifyReceipt(root) {
  if (root.t !== "obj") return { ok: false, reason: "not-object", unsigned: [] };
  const doc = root.v;
  const sigNode = doc.get("signature");
  if (!sigNode || sigNode.t !== "obj") {
    return { ok: false, reason: "signature-missing", unsigned: [] };
  }
  const sig = sigNode.v;
  const algorithm = sig.get("algorithm");
  const value = sig.get("value");
  if (!algorithm || algorithm.v !== "ed25519" || !value || value.t !== "str") {
    return { ok: false, reason: "signature-malformed", unsigned: [] };
  }
  const version = sig.get("version");
  const signedV2 = version && version.t === "num" && Number(version.v) === 2;

  let canonical = v1Canonical(doc);
  if (signedV2) canonical += "|v:2|fields:" + fieldsDigest(doc);

  const unsigned = presentV2(doc);
  if (!signatureValid(canonical, value.v)) {
    return { ok: false, reason: "signature-invalid", unsigned, canonical };
  }
  if (!signedV2 && unsigned.length > 0) {
    // Not required to keep pre-v2 peers. §7.3.4: refuse, and name the uncovered fields.
    return { ok: false, reason: "version-under-covers-content", unsigned, canonical };
  }
  return { ok: true, reason: "", unsigned: [], canonical };
}
