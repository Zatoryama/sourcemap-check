import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

const SOURCEMAP_EXTENSIONS = [".js.map", ".css.map", ".mjs.map", ".cjs.map"];

export const rule: Rule = {
	name: "no-exposed-source",
	description: "Flag source map files that expose original source code",
	defaultSeverity: "error",
	run(contents: TarballContents): RuleResult[] {
		const flagged: string[] = [];

		for (const entry of contents.entries) {
			for (const ext of SOURCEMAP_EXTENSIONS) {
				if (entry.path.endsWith(ext)) {
					flagged.push(entry.path);
					break;
				}
			}
		}

		if (flagged.length === 0) return [];

		return [
			{
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Found ${flagged.length} source map file(s) that expose original source code`,
				files: flagged,
			},
		];
	},
};

export default rule;
