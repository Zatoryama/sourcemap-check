import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

const DEFAULT_THRESHOLD = 1_048_576; // 1 MB

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

export const rule: Rule = {
	name: "size-limit",
	description: "Warn if total tarball size exceeds threshold",
	defaultSeverity: "warn",
	run(contents: TarballContents): RuleResult[] {
		if (contents.totalSize <= DEFAULT_THRESHOLD) return [];

		// Get top 5 largest files
		const sorted = [...contents.entries].sort((a, b) => b.size - a.size).slice(0, 5);

		const topFiles = sorted.map((e) => `${e.path} (${formatBytes(e.size)})`);

		return [
			{
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Total size ${formatBytes(contents.totalSize)} exceeds ${formatBytes(DEFAULT_THRESHOLD)} threshold. Top 5 largest files:`,
				files: topFiles,
			},
		];
	},
};

export default rule;
