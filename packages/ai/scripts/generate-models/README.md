# Maintaining the model registry

`generate-models.ts` is the single source that builds `src/models.generated.ts`, the
model registry the runtime loads. It fetches four upstream catalogs (models.dev,
OpenRouter, Vercel AI Gateway, NVIDIA NIM), normalizes them into `Model` records,
applies per-model overrides, validates the result, and emits the registry. The
committed `models.generated.ts` is generated output: never hand-edit it; change the
generator and regenerate. Every change is guarded by a golden snapshot test that pins
the generator's output against frozen fixtures — a refactor must leave the snapshot
byte-identical, an intentional metadata change updates it. Keep logic as data: add a
row to a table, not a branch to a function, and let the validation gate, not review,
catch a degraded registry.

## Where each change goes

| You want to… | Edit | Form |
|---|---|---|
| Tweak a model's thinking/reasoning levels | `THINKING_LEVEL_RULES` in `generate-models.ts` | add a `{ match, patch }` row |
| Add a standard, no-quirk provider | `CATALOG_DESCRIPTORS` in `descriptors.ts` | add a descriptor row |
| Add a provider needing compat/dispatch/custom URLs | a bespoke `// Process X models` block in `generate-models.ts` | copy the closest block |
| Set a per-provider/model compatibility flag | the provider's bespoke block (`compat: { … }`) | flag from `src/types.ts` |
| Correct a model's cost / context window / max tokens | the `// Temporary overrides …` block in `generateModels()` | guarded `if` mutation |
| Add a model models.dev does not list yet | the `// Add missing …` seed list in `generateModels()` | model literal + comment |
| Remove or hide a model | the provider's skip set / descriptor `skip` | predicate |
| Change an endpoint URL or default limit | `constants.ts` | edit the constant |

Most new models need no edit at all: if models.dev lists a tool-capable model under a
known provider, it is picked up automatically.

## Common tasks

### Tweak thinking levels

Add a row to `THINKING_LEVEL_RULES`. `match` selects the model; `patch` mutates it
using the existing helpers. Rows apply in order, so a later row refines an earlier one.

```ts
{
  note: "Provider X exposes thinking as on/off only",
  match: (m) => m.provider === "provider-x" && m.id === "model-y",
  patch: (m) => mergeThinkingLevelMap(m, { minimal: null, low: null, medium: null }),
},
```

Reuse `mergeThinkingLevelMap` / `mergeAnthropicMessagesCompat`. Do not write new merge
logic inline.

### Add a provider — standard shape

A provider is "standard" when it speaks one known API (`openai-completions`,
`anthropic-messages`, `openai-responses`, `mistral-conversations`, …) at one base URL
with no per-model special-casing. Add one row to `CATALOG_DESCRIPTORS`:

```ts
{ catalogKey: "models-dev-key", provider: "provider-x", api: "openai-completions", baseUrl: BASE_URLS.providerX },
```

Add the URL to `BASE_URLS` if it repeats. Add the provider id to the `KnownProvider`
union in `src/types.ts`.

### Add a provider — bespoke shape

Use a bespoke block if the provider needs **any** of: per-model compat flags, id
rewriting, npm-field dispatch, custom headers, or multiple endpoints. Copy the closest
existing block (e.g. `// Process Moonshot AI models` or `// Process Xiaomi MiMo models`)
and change only what differs. When unsure between row and block, use a block.

### Correct cost / context / max tokens

models.dev metadata is sometimes wrong. Add a guarded override in the
`// Temporary overrides until upstream model metadata is corrected.` loop:

```ts
if (candidate.provider === "provider-x" && candidate.id === "model-y") {
  candidate.contextWindow = 200000;
}
```

### Add a missing model

Only when models.dev has not listed it yet. Append a full model literal to the
`// Add missing …` section with a comment saying why, and remove it once models.dev
catches up.

## The workflow — do this for every change

Run from `packages/ai`.

1. Edit the generator (never `src/models.generated.ts`).
2. Run the golden test:
   `node ../../node_modules/vitest/dist/cli.js --run test/generate-models/golden.test.ts`
   - **Green** → your change did not alter fixtured output. Continue.
   - **Fails with a diff matching your intent** → update the snapshot, deliberately:
     `node ../../node_modules/vitest/dist/cli.js --run -u test/generate-models/golden.test.ts`
     and say in the PR that you updated it and why.
   - **Fails unexpectedly** → you changed behaviour you did not mean to. Fix the code.
     Never run `-u` to silence an unexpected diff.
3. If you added a testable seam (descriptor, rule, validation floor), add or extend its
   unit test under `test/generate-models/`.
4. Run the package's unit tests for this area, then `npm run check`. Fix everything.
5. Regenerate and review:
   `npm run generate-models` then `git diff src/models.generated.ts`.
   Confirm the diff is only what you intended (unrelated upstream metadata drift is OK to
   include). Commit `models.generated.ts` alongside your generator change.

The golden snapshot is pinned to frozen fixtures. A brand-new provider or model whose
data is not in the fixtures will not appear in the snapshot and is therefore **not**
covered by it — the regenerate-and-review step in (5) is your real check for those.

## Rules for agents

Binding. Follow in order; stop and ask if a step is ambiguous.

1. Never edit `src/models.generated.ts`. Edit the generator, then regenerate.
2. Identify the task in the table above and edit **only** that seam. Do not scatter
   changes across files for one tweak.
3. Provider additions: apply the standard-vs-bespoke test above. For a bespoke block,
   copy the nearest existing block and change only what differs.
4. Rule and override tables are append-and-order-sensitive. Add a row; do not reorder
   existing rows. Reuse the existing patch helpers; never inline new merge logic.
5. Run the golden test after every change. Update the snapshot only when the diff is
   intentional and matches your change; never to hide an unexpected diff.
6. If you add or remove a provider listed in `REQUIRED_PROVIDER_FLOORS` (`validate.ts`),
   update that map in the same change.
7. Run `npm run check` and fix all errors, warnings, and infos before finishing.
8. Regenerate and confirm the `models.generated.ts` diff is only what you intended.
9. If you cannot tell whether a change is behaviour-preserving, stop and ask. Do not
   guess and update the snapshot.

## Module reference

| File | Holds |
|---|---|
| `generate-models.ts` | Orchestrator, bespoke provider blocks, `THINKING_LEVEL_RULES`, seed models, metadata overrides, emit |
| `constants.ts` | `BASE_URLS`, default context/token limits |
| `descriptors.ts` | `CATALOG_DESCRIPTORS`, `getBedrockBaseUrl` |
| `normalize.ts` | `ProviderDescriptor`, `ModelsDevModel`, `normalizeCatalogModel`, `pushCatalogModels` |
| `overrides.ts` | `OverrideRule`, `applyOverrides` |
| `validate.ts` | `validateRegistry`, `REQUIRED_PROVIDER_FLOORS`, `MIN_TOTAL_MODELS` |
| `io.ts` | `onFetchFailure` (fail-fast policy; `ALLOW_PARTIAL=1` opts out) |

## Refreshing fixtures (maintainer)

Frozen fixtures drift from live data. Refresh them when adding a provider/model you want
the golden test to cover, or periodically. From `packages/ai`:

```bash
cd test/generate-models/fixtures
curl -s https://models.dev/api.json            | gzip -n > models-dev.json.gz
curl -s https://openrouter.ai/api/v1/models    | gzip -n > openrouter.json.gz
curl -s https://ai-gateway.vercel.sh/v1/models | gzip -n > ai-gateway.json.gz
curl -s https://integrate.api.nvidia.com/v1/models | gzip -n > nvidia-nim.json.gz
```

Then update the golden snapshot (`-u`) and review the diff: it should reflect only real
upstream catalog changes.
