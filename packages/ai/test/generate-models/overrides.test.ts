import { describe, expect, it } from "vitest";
import { applyOverrides, type OverrideRule } from "../../scripts/generate-models/overrides.ts";
import type { Model } from "../../src/types.ts";

function model(id: string): Model<any> {
	return {
		id,
		name: id,
		api: "openai-completions",
		provider: "p",
		baseUrl: "",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1,
		maxTokens: 1,
	} as Model<any>;
}

describe("applyOverrides", () => {
	it("applies only matching rules", () => {
		const hits: string[] = [];
		const rules: OverrideRule[] = [
			{ match: (m) => m.id === "a", patch: () => hits.push("a") },
			{ match: (m) => m.id === "b", patch: () => hits.push("b") },
		];
		applyOverrides(model("b"), rules);
		expect(hits).toEqual(["b"]);
	});

	it("applies matching rules in array order, so a later rule refines an earlier one", () => {
		const order: string[] = [];
		const rules: OverrideRule[] = [
			{ match: () => true, patch: () => order.push("first") },
			{ match: () => true, patch: () => order.push("second") },
		];
		applyOverrides(model("x"), rules);
		expect(order).toEqual(["first", "second"]);
	});

	it("is a no-op when no rule matches", () => {
		const m = model("z");
		const before = JSON.stringify(m);
		applyOverrides(m, [{ match: () => false, patch: (x) => mergeName(x) }]);
		expect(JSON.stringify(m)).toBe(before);
	});
});

function mergeName(m: Model<any>): void {
	m.name = "mutated";
}
