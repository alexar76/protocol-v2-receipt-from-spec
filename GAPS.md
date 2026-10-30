# Holes found while implementing from the specification

The seven receipt vectors pass. Four places in the text did not say what the bytes were. They are now written into the specification. The signed bytes did not change, and this verifier did not need a code change.

| Hole | Where it is fixed |
|---|---|
| The signature block did not name `version` | `spec.md` §7.3.1 and `schemas/receipt.json` |
| "Carries a rejection" did not say which keys force v2 | `spec.md` §7.3.4: any of the nine keys, present and not JSON null |
| `0.0` and `0` were not distinguished | `spec.md` §7.3.3 and `test-vectors/README.md` |
| A missing `success` had no default | `spec.md` §7.3.3: serialize it as `0` |

Noted in §7.3 on 2026-09-27.
