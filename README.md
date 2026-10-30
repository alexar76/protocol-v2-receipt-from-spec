# Protocol v2 receipt verifier, written from the specification

<!-- aicom-mirror-notice -->
> 🔄 Synced from the [AI-Factory monorepo](https://github.com/alexar76/aicom) (append-only history). **Pull requests are welcome** — merged PRs are imported back and re-synced here. [Issues](https://github.com/alexar76/protocol-v2-receipt-from-spec/issues) · [Pull requests](https://github.com/alexar76/protocol-v2-receipt-from-spec/pulls)

This tree checks AIMarket Protocol v2 receipts against `../aimarket-protocol/test-vectors/`.

It was written from `spec.md` §7.3 and the vectors. The reference hub sources were not opened. It does not count toward the three outside implementations in `GOVERNANCE.md`: the author is the protocol editor, and this folder is not published.

```bash
node verify.test.mjs
```

Holes found while implementing are in `GAPS.md`.
