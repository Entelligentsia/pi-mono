import type { Model } from "../../src/types.ts";

/**
 * Minimum model count expected for each provider that is sourced from the
 * stable first-party `models.dev` catalog. If `models.dev` fails to load (the
 * fetcher historically swallowed the error and returned `[]`), every one of
 * these craters to zero and the gate throws instead of emitting a registry
 * that silently dropped every first-party model.
 *
 * This is the lever to adjust when a provider is added/removed from the
 * always-present set — keep the floors conservative (well below the real
 * count) so normal week-to-week catalog churn never trips the gate.
 */
export const REQUIRED_PROVIDER_FLOORS: Record<string, number> = {
	anthropic: 3,
	google: 3,
	openai: 3,
	"amazon-bedrock": 3,
};

/** Absolute floor on the total number of emitted models. */
export const MIN_TOTAL_MODELS = 150;

export class RegistryValidationError extends Error {}

type ProviderRegistry = Record<string, Record<string, Model<any>>>;

function assertModelShape(model: Model<any>): string | null {
	if (!model.id) return "missing id";
	if (!model.name) return `${model.id}: missing name`;
	if (!model.api) return `${model.id}: missing api`;
	if (!model.provider) return `${model.id}: missing provider`;
	if (!Array.isArray(model.input) || model.input.length === 0) return `${model.id}: empty input modalities`;
	for (const field of ["input", "output", "cacheRead", "cacheWrite"] as const) {
		const value = model.cost?.[field];
		// Negative values are tolerated: OpenRouter uses -1 as a "cost varies" sentinel
		// (e.g. openrouter/auto). Only non-numbers / NaN / Infinity are malformed.
		if (typeof value !== "number" || !Number.isFinite(value)) {
			return `${model.id}: invalid cost.${field}`;
		}
	}
	if (!(model.contextWindow > 0)) return `${model.id}: invalid contextWindow`;
	if (!(model.maxTokens > 0)) return `${model.id}: invalid maxTokens`;
	return null;
}

/**
 * Fail-fast gate run before the registry is emitted. Throws
 * `RegistryValidationError` on coverage shortfalls or malformed models so a
 * degraded regeneration can never be written to disk.
 */
export function validateRegistry(providers: ProviderRegistry): void {
	const errors: string[] = [];

	let total = 0;
	for (const models of Object.values(providers)) {
		for (const model of Object.values(models)) {
			total += 1;
			const shapeError = assertModelShape(model);
			if (shapeError) errors.push(`schema: ${shapeError}`);
		}
	}

	if (total < MIN_TOTAL_MODELS) {
		errors.push(`coverage: only ${total} models total (floor ${MIN_TOTAL_MODELS}) — a source likely failed to load`);
	}

	for (const [provider, floor] of Object.entries(REQUIRED_PROVIDER_FLOORS)) {
		const count = providers[provider] ? Object.keys(providers[provider]).length : 0;
		if (count < floor) {
			errors.push(`coverage: provider "${provider}" has ${count} models (floor ${floor})`);
		}
	}

	if (errors.length > 0) {
		throw new RegistryValidationError(
			`Model registry validation failed (${errors.length}):\n  ${errors.slice(0, 20).join("\n  ")}`,
		);
	}
}
