OUTPUT_DIR=.eval-results/u0-rerun-4
mkdir -p $OUTPUT_DIR

pnpm eval:openai --suite canonical --mode end-to-end --allow-failures --output $OUTPUT_DIR/canonical.json
pnpm eval:openai --suite followups --mode end-to-end --allow-failures --output $OUTPUT_DIR/followups.json

for category in trust_real cost_real urgent_real binding_request price_question time_nonurgent documentation_request trust_false_friend; do
  pnpm eval:openai --dataset f01 --split development --category "$category" \
    --sample 2 --seed 42 --mode end-to-end --allow-failures \
    --output "$OUTPUT_DIR/$category.json"
done

for category in amount_correction basis_correction; do
  pnpm eval:openai --dataset f01 --split development --category "$category" \
    --sample 1 --seed 42 --mode end-to-end --allow-failures \
    --output "$OUTPUT_DIR/$category.json"
done