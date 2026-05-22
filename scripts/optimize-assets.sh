#!/usr/bin/env bash
set -euo pipefail

source_dir="assets/hamster"
output_dir="assets/hamster-optimized"
max_size="${HAMSTER_ASSET_MAX_SIZE:-512}"

if ! command -v sips >/dev/null 2>&1; then
  echo "sips is required to optimize hamster assets on macOS." >&2
  exit 1
fi

find "$source_dir" -type f -name '*.png' -print0 |
  while IFS= read -r -d '' source_file; do
    relative_path="${source_file#"$source_dir"/}"
    output_file="$output_dir/$relative_path"
    mkdir -p "$(dirname "$output_file")"
    sips -Z "$max_size" "$source_file" --out "$output_file" >/dev/null
  done
