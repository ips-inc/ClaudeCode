#!/usr/bin/env bash
#
# higgsfield-clone.sh — build your likeness with Higgsfield in one pass.
# Upload reference photos -> train a Soul ID -> generate an on-model still.
#
# RUN THIS LOCALLY (not in the Claude-Code web session — that environment blocks
# Higgsfield's servers). Requires: `npm i -g @higgsfield/cli` and `hf auth login`.
#
# Usage:
#   1. Edit NAME, SOUL_MODEL, PHOTOS, and PROMPT below.
#   2. hf auth login
#   3. ./scripts/higgsfield-clone.sh
#
set -euo pipefail

# ---- edit these ----------------------------------------------------------
NAME="ISAAC_P"                 # your identity tag (no spaces)
SOUL_MODEL="--soul-2"          # or "--soul-cinematic" for the professional look
PHOTOS=(                       # 5–20 curated photos (see docs/photo-generation.md)
  "./refs/me1.jpg"
  "./refs/me2.jpg"
  "./refs/me3.jpg"
  "./refs/me4.jpg"
  "./refs/me5.jpg"
)
IMAGE_MODEL="nano_banana_2"    # run `hf model list` to see current image models
PROMPT="photo of ${NAME}, walking a Williamsburg sidewalk at golden hour, shot on iPhone, deep depth of field, natural skin texture with visible pores, candid, not retouched"
# --------------------------------------------------------------------------

command -v hf >/dev/null 2>&1 || { echo "❌ hf CLI not found. Run: npm i -g @higgsfield/cli"; exit 1; }
hf auth token >/dev/null 2>&1 || { echo "❌ Not authenticated. Run: hf auth login"; exit 1; }

echo "▶ Training Soul ID '${NAME}' (${SOUL_MODEL}) from ${#PHOTOS[@]} photos…"
IMG_ARGS=()
for p in "${PHOTOS[@]}"; do
  [[ -f "$p" ]] || { echo "❌ Missing photo: $p"; exit 1; }
  IMG_ARGS+=(--image "$p")
done

# soul-id create auto-uploads local image paths; capture the JSON to grab the id
SOUL_JSON="$(hf soul-id create --name "$NAME" $SOUL_MODEL "${IMG_ARGS[@]}" --json)"
SOUL_ID="$(printf '%s' "$SOUL_JSON" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | grep -oE '[^"]+$' || true)"
[[ -n "$SOUL_ID" ]] || { echo "❌ Could not parse soul_id from response:"; echo "$SOUL_JSON"; exit 1; }
echo "   soul_id = $SOUL_ID"

echo "▶ Waiting for Soul training to finish…"
hf soul-id wait "$SOUL_ID"

echo "▶ Estimating cost…"
hf generate cost "$IMAGE_MODEL" --prompt "$PROMPT" || true

echo "▶ Generating an on-model still…"
hf generate create "$IMAGE_MODEL" --prompt "$PROMPT" --image-references "$SOUL_ID" --wait

echo "✅ Done. Reuse soul_id '$SOUL_ID' for every future render to stay on-model."
echo "   Pull prompts from prompt-builder.html (Higgsfield tool + look toggle)."
