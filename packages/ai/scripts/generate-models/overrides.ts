import type { Api, Model } from "../../src/types.ts";

/**
 * A single post-normalization metadata override expressed as data.
 *
 * `match` decides whether the rule applies to a model; `patch` mutates the
 * model in place (e.g. merge a thinking-level map, set a compat flag). Rules
 * are applied in array order, so a later rule can refine an earlier one — keep
 * that in mind when ordering the table.
 *
 * Adding a new model/provider quirk is one row, reviewed and tested in
 * isolation, rather than another branch in a growing if-cascade.
 */
export interface OverrideRule {
	/** Human note explaining why the quirk exists (kept next to the rule). */
	note?: string;
	match: (model: Model<Api>) => boolean;
	patch: (model: Model<Api>) => void;
}

/** Apply each matching rule, in order, mutating the model in place. */
export function applyOverrides(model: Model<Api>, rules: OverrideRule[]): void {
	for (const rule of rules) {
		if (rule.match(model)) rule.patch(model);
	}
}
