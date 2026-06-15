import { describe, expect, it } from "vitest";
import {
	MIN_TOTAL_MODELS,
	REQUIRED_PROVIDER_FLOORS,
	RegistryValidationError,
	validateRegistry,
} from "../../scripts/generate-models/validate.ts";
import type { Model } from "../../src/types.ts";

function model(id: string, provider: string): Model<any> {
	return {
		id,
		name: id,
		api: "anthropic-messages",
		provider,
		baseUrl: "https://example.test",
		reasoning: false,
		input: ["text"],
		cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1000,
		maxTokens: 1000,
	} as Model<any>;
}

/** A registry that comfortably satisfies every floor. */
function healthyRegistry(): Record<string, Record<string, Model<any>>> {
	const registry: Record<string, Record<string, Model<any>>> = {};
	for (const provider of Object.keys(REQUIRED_PROVIDER_FLOORS)) {
		registry[provider] = {};
		for (let i = 0; i < 10; i++) registry[provider][`${provider}-${i}`] = model(`${provider}-${i}`, provider);
	}
	// Pad to clear the total floor.
	registry.filler = {};
	for (let i = 0; i < MIN_TOTAL_MODELS; i++) registry.filler[`f-${i}`] = model(`f-${i}`, "filler");
	return registry;
}

describe("validateRegistry", () => {
	it("passes a healthy registry", () => {
		expect(() => validateRegistry(healthyRegistry())).not.toThrow();
	});

	it("throws when a required provider is missing", () => {
		const registry = healthyRegistry();
		delete registry.anthropic;
		expect(() => validateRegistry(registry)).toThrow(RegistryValidationError);
		expect(() => validateRegistry(registry)).toThrow(/anthropic/);
	});

	it("throws when a required provider craters below its floor", () => {
		const registry = healthyRegistry();
		registry.openai = { only: model("only", "openai") }; // 1 < floor
		expect(() => validateRegistry(registry)).toThrow(/openai/);
	});

	it("throws when the total model count is below the floor", () => {
		const registry: Record<string, Record<string, Model<any>>> = {};
		for (const provider of Object.keys(REQUIRED_PROVIDER_FLOORS)) {
			registry[provider] = {};
			for (let i = 0; i < 3; i++) registry[provider][`${provider}-${i}`] = model(`${provider}-${i}`, provider);
		}
		expect(() => validateRegistry(registry)).toThrow(/only \d+ models total/);
	});

	it("throws on a malformed model (invalid cost)", () => {
		const registry = healthyRegistry();
		const bad = model("bad", "anthropic");
		bad.cost.input = Number.NaN;
		registry.anthropic.bad = bad;
		expect(() => validateRegistry(registry)).toThrow(/cost\.input/);
	});

	it("throws on a malformed model (non-positive contextWindow)", () => {
		const registry = healthyRegistry();
		const bad = model("bad", "anthropic");
		bad.contextWindow = 0;
		registry.anthropic.bad = bad;
		expect(() => validateRegistry(registry)).toThrow(/contextWindow/);
	});
});
