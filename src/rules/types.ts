import type { TarballContents } from "../core/tarball.js";

export type Severity = "error" | "warn" | "info";

export interface RuleResult {
	rule: string;
	severity: Severity;
	message: string;
	files?: string[];
}

export interface Rule {
	name: string;
	description: string;
	defaultSeverity: Severity;
	run(contents: TarballContents): RuleResult[];
}
