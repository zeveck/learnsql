#!/usr/bin/env bash
set -e

# Node-side logic tests.
node tests/run-node.mjs

# Defensively ensure the Chromium browser is present (no-op if already cached).
npx playwright install chromium >/dev/null 2>&1 || true

# End-to-end (Chromium only — the only installed browser).
npx playwright test
