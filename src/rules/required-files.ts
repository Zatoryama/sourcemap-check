import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

export const rule: Rule = {
	name: "required-files",
	description: "Ensure essential files are present in the package",
	defaultSeverity: "error",
	run(contents: TarballContents): RuleResult[] {
		const results: RuleResult[] = [];
		const paths = contents.entries.map((e) => e.path.toLowerCase());

		// package.json — error severity
		const hasPackageJson = paths.includes("package.json");
		if (!hasPackageJson) {
			results.push({
				rule: this.name,
				severity: "error",
				message: "Missing required file: package.json",
			});
		}

		// README — warn severity
		const hasReadme = paths.some((p) => {
			const basename = p.split("/").pop() ?? "";
			return basename.startsWith("readme");
		});
		if (!hasReadme) {
			results.push({
				rule: this.name,
				severity: "warn",
				message: "Missing recommended file: README",
			});
		}

		// LICENSE — warn severity
		const hasLicense = paths.some((p) => {
			const basename = p.split("/").pop() ?? "";
			return basename.startsWith("license") || basename.startsWith("licence");
		});
		if (!hasLicense) {
			results.push({
				rule: this.name,
				severity: "warn",
				message: "Missing recommended file: LICENSE",
			});
		}

		return results;
	},
};

export default rule;
