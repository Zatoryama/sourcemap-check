import type { TarballContents } from "../core/tarball.js";
import noConfig from "./no-config.js";
import noDocs from "./no-docs.js";
import noSecrets from "./no-secrets.js";
import noSourcemaps from "./no-sourcemaps.js";
import noTests from "./no-tests.js";
import requiredFiles from "./required-files.js";
import sizeLimit from "./size-limit.js";
import type { Rule, RuleResult } from "./types.js";

export function getDefaultRules(): Rule[] {
	return [noSecrets, noSourcemaps, noTests, noDocs, noConfig, sizeLimit, requiredFiles];
}

export function runRules(contents: TarballContents, rules: Rule[]): RuleResult[] {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		results.push(...rule.run(contents));
	}

	return results;
}

export function getExitCode(results: RuleResult[]): 0 | 1 {
	return results.some((r) => r.severity === "error") ? 1 : 0;
}
