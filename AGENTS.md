# Project architecture rules

- Memorial URLs accept either a UUID or a unique Latin slug so existing links remain valid while new links are readable.
- Guest candle writes go only through Edge Functions; client database access is read-only except owner hide controls.
- Memorial milestone emails use a dedicated idempotent delivery ledger because recurring date notifications must never duplicate.