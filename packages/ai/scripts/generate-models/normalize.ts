import type { Api, Model, Provider } from "../../src/types.ts";
import { DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS } from "./constants.ts";

/** Shape of a single model entry in the models.dev `api.json` catalog. */
export interface ModelsDevModel {
	id: string;
	name: string;
	tool_call?: boolean;
	reasoning?: boolean;
	limit?: {
		context?: number;
		output?: number;
	};
	cost?: {
		input?: number;
		output?: number;
		cache_read?: number;
		cache_write?: number;
	};
	modalities?: {
		input?: string[];
		output?: string[];
	};
	provider?: {
		npm?: string;
	};
}

/**
 * Declarative description of how one models.dev catalog provider maps onto a
 * `Model`. This is the single place to add a provider whose models follow the
 * common shape — add a row to `CATALOG_DESCRIPTORS` in `descriptors.ts`.
 *
 * Providers with genuinely bespoke logic (id rewriting, npm-field dispatch,
 * per-model compat) keep their hand-written block; this covers the long tail
 * of near-identical copy-paste.
 */
export interface ProviderDescriptor {
	/** Key under which the provider's models live in models.dev `api.json`. */
	catalogKey: string;
	/** Provider id stamped onto every emitted model. */
	provider: Provider;
	/** API the provider speaks. */
	api: Api;
	/** Base URL — a constant, or a function of the model id for region-aware providers. */
	baseUrl: string | ((modelId: string) => string);
	/** Optional per-model skip predicate (e.g. models that don't support tool use). */
	skip?: (modelId: string, model: ModelsDevModel) => boolean;
}

/** Map a models.dev cost block onto the Model cost shape, preserving the legacy `|| 0` defaults. */
function mapCost(cost: ModelsDevModel["cost"]): Model<Api>["cost"] {
	return {
		input: cost?.input || 0,
		output: cost?.output || 0,
		cacheRead: cost?.cache_read || 0,
		cacheWrite: cost?.cache_write || 0,
	};
}

/**
 * Build a `Model` from a models.dev catalog entry, or return `null` when the
 * model should be skipped (no tool support, or a descriptor skip rule).
 *
 * Byte-for-byte equivalent to the hand-written provider blocks it replaces.
 */
export function normalizeCatalogModel(
	modelId: string,
	model: ModelsDevModel,
	descriptor: ProviderDescriptor,
): Model<Api> | null {
	if (model.tool_call !== true) return null;
	if (descriptor.skip?.(modelId, model)) return null;

	return {
		id: modelId,
		name: model.name || modelId,
		api: descriptor.api,
		provider: descriptor.provider,
		baseUrl: typeof descriptor.baseUrl === "function" ? descriptor.baseUrl(modelId) : descriptor.baseUrl,
		reasoning: model.reasoning === true,
		input: model.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
		cost: mapCost(model.cost),
		contextWindow: model.limit?.context || DEFAULT_CONTEXT_WINDOW,
		maxTokens: model.limit?.output || DEFAULT_MAX_TOKENS,
	};
}

/** Append every catalog model for the given descriptors that survives normalization. */
export function pushCatalogModels(
	target: Model<any>[],
	data: Record<string, { models?: Record<string, unknown> }>,
	descriptors: ProviderDescriptor[],
): void {
	for (const descriptor of descriptors) {
		const catalog = data[descriptor.catalogKey]?.models;
		if (!catalog) continue;
		for (const [modelId, raw] of Object.entries(catalog)) {
			const model = normalizeCatalogModel(modelId, raw as ModelsDevModel, descriptor);
			if (model) target.push(model);
		}
	}
}
