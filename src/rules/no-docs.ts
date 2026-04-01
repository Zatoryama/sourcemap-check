import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

const ALLOWED_MD_PREFIXES = ["readme", "license", "licence", "changelog", "changes", "history"];

const DOC_DIR_PREFIXES = ["docs/", "doc/", ".github/"];

function isAllowedMarkdown(filePath: string): boolean {
	const basename = (filePath.split("/").pop() ?? "").toLowerCase();
	if (!basename.endsWith(".md")) return false;

	const nameWithoutExt = basename.slice(0, -3);
	for (const prefix of ALLOWED_MD_PREFIXES) {
		if (nameWithoutExt.startsWith(prefix)) return true;
	}

	return false;
}

function isInternalDoc(filePath: string): boolean {
	// Check doc directory prefixes
	for (const prefix of DOC_DIR_PREFIXES) {
		if (filePath.startsWith(prefix) || filePath.includes(`/${prefix}`)) {
			return true;
		}
	}

	// Check for .md files that are NOT in the allowed list
	const basename = (filePath.split("/").pop() ?? "").toLowerCase();
	if (basename.endsWith(".md") && !isAllowedMarkdown(filePath)) {
		return true;
	}

	return false;
}

export const rule: Rule = {
	name: "no-docs",
	description: "Flag internal documentation files (not README, LICENSE, CHANGELOG)",
	defaultSeverity: "warn",
	run(contents: TarballContents): RuleResult[] {
		const flagged: string[] = [];

		for (const entry of contents.entries) {
			if (isInternalDoc(entry.path)) {
				flagged.push(entry.path);
			}
		}

		if (flagged.length === 0) return [];

		return [
			{
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Found ${flagged.length} internal documentation file(s)`,
				files: flagged,
			},
		];
	},
};

export default rule;
