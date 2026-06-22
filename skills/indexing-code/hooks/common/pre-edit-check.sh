#!/usr/bin/env bash
# Pre-Edit Hook: thin wrapper around `abyss hook pre-edit`.
# All logic (stdin JSON parsing across agent platforms, incremental index
# refresh, caller/ambiguity/hotspot warnings) lives in the abyss binary —
# one process, no python3 dependency. Requires abyss >= 0.3.0.

ABYSS="$(command -v abyss 2>/dev/null || echo "")"
# --with-abyss 安装的二进制不进 PATH，落点固定 ~/.code-abyss/bin/
[ -z "$ABYSS" ] && [ -x "${HOME}/.code-abyss/bin/abyss" ] && ABYSS="${HOME}/.code-abyss/bin/abyss"
[ -z "$ABYSS" ] && exit 0

PAYLOAD="$(cat)"

if command -v node >/dev/null 2>&1; then
  NORMALIZED="$(
    PAYLOAD="$PAYLOAD" node - <<'NODE' || true
const payload = process.env.PAYLOAD || "";

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstPatchPath(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/m);
  return match ? match[1].trim() : null;
}

function findPath(value, depth = 0) {
  if (!value || depth > 4) return null;
  if (typeof value === "string") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPath(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  return firstString(value.file_path, value.filePath, value.path, value.file, value.filename)
    || firstPatchPath(firstString(value.patch, value.diff, value.command, value.cmd))
    || findPath(value.tool_input, depth + 1)
    || findPath(value.input, depth + 1)
    || findPath(value.arguments, depth + 1)
    || findPath(value.params, depth + 1);
}

try {
  const parsed = JSON.parse(payload);
  const filePath = findPath(parsed);
  if (filePath) {
    process.stdout.write(JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: filePath },
    }));
  }
} catch (_) {
  const filePath = firstPatchPath(payload);
  if (filePath) {
    process.stdout.write(JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: filePath },
    }));
  }
}
NODE
  )"
  if [ -n "$NORMALIZED" ]; then
    printf '%s' "$NORMALIZED" | "$ABYSS" hook pre-edit
    exit $?
  fi
fi

printf '%s' "$PAYLOAD" | "$ABYSS" hook pre-edit
exit $?
