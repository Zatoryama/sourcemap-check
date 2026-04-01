import type { TarballContents } from "../core/tarball.js";
import type { RuleResult } from "../rules/types.js";

interface JsonReport {
	package: string;
	version: string;
	files: number;
	totalSize: number;
	passed: boolean;
	errors: number;
	warnings: number;
	results: RuleResult[];
}

export function formatJsonReport(results: RuleResult[], contents: TarballContents): string {
	const name = (contents.manifest.name as string) ?? "unknown";
	const version = (contents.manifest.version as string) ?? "0.0.0";

	let errors = 0;
	let warnings = 0;

	for (const r of results) {
		if (r.severity === "error") errors++;
		if (r.severity === "warn") warnings++;
	}

	const report: JsonReport = {
		package: name,
		version,
		files: contents.entries.length,
		totalSize: contents.totalSize,
		passed: errors === 0,
		errors,
		warnings,
		results,
	};

	return JSON.stringify(report, null, 2);
}
