#!/usr/bin/env bash
set -euo pipefail

dry_run=()
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=(--dry-run)
elif [[ $# -ne 0 ]]; then
  printf 'Usage: bash scripts/eval-24-multipass.sh [--dry-run]\n' >&2
  exit 2
fi

export OPENAI_MODEL="${OPENAI_MODEL:-gpt-5.4-mini}"
output_dir="${F02_24_OUTPUT_DIR:-.eval-results/f02-24-$(date -u +%Y%m%dT%H%M%SZ)}"
if [[ ${#dry_run[@]} -eq 0 ]]; then mkdir -p "$output_dir"; fi
pnpm dataset:validate
common=(--strategy multipass --mode end-to-end --max-requests 18 --allow-failures "${dry_run[@]}")

pnpm eval:openai --case laura "${common[@]}" --output "$output_dir/B01.json"
pnpm eval:openai --case javier "${common[@]}" --output "$output_dir/B05.json"
pnpm eval:openai --case rosa "${common[@]}" --output "$output_dir/B08.json"
pnpm eval:openai --case laura --scenario gross-correction "${common[@]}" --output "$output_dir/C01.json"
pnpm eval:openai --case javier --scenario trust-paraphrase "${common[@]}" --output "$output_dir/B06.json"
pnpm eval:openai --case javier --scenario opt-out "${common[@]}" --output "$output_dir/B10.json"

for category in amount_correction basis_correction; do
  pnpm eval:openai --dataset f01 --split development --category "$category" --sample 1 --seed 42 "${common[@]}" --output "$output_dir/$category.json"
done
for category in trust_real trust_false_friend cost_real price_question urgent_real binding_request time_nonurgent documentation_request; do
  pnpm eval:openai --dataset f01 --split development --category "$category" --sample 2 --seed 42 "${common[@]}" --output "$output_dir/$category.json"
done
printf 'Reports: %s\n' "$output_dir"
