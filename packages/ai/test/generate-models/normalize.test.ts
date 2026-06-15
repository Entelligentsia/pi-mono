import { describe, expect, it } from "vitest";
import { CATALOG_DESCRIPTORS, getBedrockBaseUrl } from "../../scripts/generate-models/descriptors.ts";
import {
	type ModelsDevModel,
	normalizeCatalogModel,
	pushCatalogModels,
} from "../../scripts/generate-models/normalize.ts";

const anthropic = CATALOG_DESCRIPTORS.find((d) => d.provider === "anthropic")!;
const bedrock = CATALOG_DESCRIPTORS.find((d) => d.provider === "amazon-bedrock")!;

function raw(overrides: Partial<ModelsDevModel> = {}): ModelsDevModel {
	return { id: "m", name: "M", tool_call: true, ...overrides };
}

describe("normalizeCatalogModel", () => {
	it("maps a canonical entry onto a Model", () => {
		const model = normalizeCatalogModel(
			"claude-x",
			raw({
				name: "Claude X",
				reasoning: true,
				modalities: { input: ["text", "image"] },
				cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
				limit: { context: 200000, output: 64000 },
			}),
			anthropic,
		);
		expect(model).toEqual({
			id: "claude-x",
			name: "Claude X",
			api: "anthropic-messages",
			provider: "anthropic",
			baseUrl: "https://api.anthropic.com",
			reasoning: true,
			input: ["text", "image"],
			cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
			contextWindow: 200000,
			maxTokens: 64000,
		});
	});

	it("returns null when the model does not support tool use", () => {
		expect(normalizeCatalogModel("m", raw({ tool_call: false }), anthropic)).toBeNull();
		expect(normalizeCatalogModel("m", raw({ tool_call: undefined }), anthropic)).toBeNull();
	});

	it("applies the descriptor skip rule (bedrock unsupported models)", () => {
		expect(normalizeCatalogModel("ai21.jamba-1-5", raw(), bedrock)).toBeNull();
		expect(normalizeCatalogModel("mistral.mistral-7b-instruct-v0", raw(), bedrock)).toBeNull();
		expect(normalizeCatalogModel("anthropic.claude-x", raw(), bedrock)).not.toBeNull();
	});

	it("resolves a function baseUrl per model id (bedrock region)", () => {
		expect(normalizeCatalogModel("eu.anthropic.x", raw(), bedrock)?.baseUrl).toBe(
			getBedrockBaseUrl("eu.anthropic.x"),
		);
		expect(normalizeCatalogModel("anthropic.x", raw(), bedrock)?.baseUrl).toContain("us-east-1");
		expect(normalizeCatalogModel("eu.anthropic.x", raw(), bedrock)?.baseUrl).toContain("eu-central-1");
	});

	it("defaults missing cost/limit fields and text-only modality", () => {
		const model = normalizeCatalogModel("m", raw(), anthropic)!;
		expect(model.cost).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
		expect(model.contextWindow).toBe(4096);
		expect(model.maxTokens).toBe(4096);
		expect(model.input).toEqual(["text"]);
	});

	it("falls back to the model id when name is absent", () => {
		expect(normalizeCatalogModel("only-id", { id: "only-id", name: "", tool_call: true }, anthropic)?.name).toBe(
			"only-id",
		);
	});
});

describe("pushCatalogModels", () => {
	it("appends only tool-capable, non-skipped models across descriptors", () => {
		const data = {
			anthropic: { models: { a: raw(), b: raw({ tool_call: false }) } },
			"amazon-bedrock": { models: { "ai21.jamba-1": raw(), "anthropic.ok": raw() } },
		};
		const out: any[] = [];
		pushCatalogModels(out, data, CATALOG_DESCRIPTORS);
		const ids = out.map((m) => `${m.provider}/${m.id}`).sort();
		expect(ids).toEqual(["amazon-bedrock/anthropic.ok", "anthropic/a"]);
	});
});
