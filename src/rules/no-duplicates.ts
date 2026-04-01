import { createHash } from "node:crypto";
import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

function hashContent(content: Buffer): string {
	return createHash("sha256").update(content).digest("hex");
}

function formatSize(bytes: number): string {
	if (bytes >= 1_048_576) {
		return `${(bytes / 1_048_576).toFixed(1)} MB`;
	}
	return `${(bytes / 1024).toFixed(1)} KB`;
}

export const rule: Rule = {
	name: "no-duplicates",
	description: "Flag duplicate files with identical content",
	defaultSeverity: "warn",
	run(contents: TarballContents): RuleResult[] {
		const hashToFiles = new Map<string, { path: string; size: number }[]>();

		for (const entry of contents.entries) {
			if (entry.size === 0) continue;
			const hash = hashContent(entry.content);
			const existing = hashToFiles.get(hash);
			if (existing) {
				existing.push({ path: entry.path, size: entry.size });
			} else {
				hashToFiles.set(hash, [{ path: entry.path, size: entry.size }]);
			}
		}

		const duplicateGroups = [...hashToFiles.values()].filter((group) => group.length > 1);

		if (duplicateGroups.length === 0) return [];

		// Sort by wasted bytes (descending)
		duplicateGroups.sort((a, b) => {
			const wastedA = a[0].size * (a.length - 1);
			const wastedB = b[0].size * (b.length - 1);
			return wastedB - wastedA;
		});

		let totalWasted = 0;
		const filesList: string[] = [];

		for (const group of duplicateGroups) {
			const wasted = group[0].size * (group.length - 1);
			totalWasted += wasted;
			filesList.push(
				`${group.length}x identical (${formatSize(group[0].size)} each, ${formatSize(wasted)} wasted):`,
			);
			for (const f of group) {
				filesList.push(`  ${f.path}`);
			}
		}

		return [
			{
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Found ${duplicateGroups.length} duplicate group(s), ${formatSize(totalWasted)} wasted`,
				files: filesList,
			},
		];
	},
};

export default rule;
