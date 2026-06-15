/**
 * Fetch-failure policy for the generator.
 *
 * Historically every source fetcher swallowed errors and returned an empty
 * result, so a transient outage produced a silently-degraded registry. By
 * default a failed fetch is now fatal. Set `ALLOW_PARTIAL=1` to opt back into
 * best-effort behaviour (e.g. for local experimentation against one source).
 */
export function onFetchFailure(source: string, error: unknown): void {
	console.error(`Failed to fetch ${source}:`, error);
	if (!process.env.ALLOW_PARTIAL) {
		throw new Error(
			`Aborting model generation: "${source}" fetch failed and ALLOW_PARTIAL is not set.\n` +
				`Re-run with ALLOW_PARTIAL=1 to emit a best-effort registry from the sources that did load.`,
			{ cause: error },
		);
	}
}
