import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

const CONFIG_DIR_PREFIXES = [".vscode/", ".idea/", ".github/", ".husky/", ".circleci/"];

const CONFIG_EXACT_FILES = [
	".editorconfig",
	".eslintignore",
	".prettierignore",
	"biome.json",
	"turbo.json",
	".travis.yml",
	"Makefile",
	"Dockerfile",
	".dockerignore",
];

const CONFIG_BASENAME_PREFIXES = [
	".eslintrc",
	".prettierrc",
	".lintstagedrc",
	".babelrc",
	"tsconfig",
	"babel.config.",
	"webpack.config.",
	"rollup.config.",
	"docker-compose",
];

function isDevConfig(filePath: string): boolean {
	// Check directory prefixes
	for (const prefix of CONFIG_DIR_PREFIXES) {
		if (filePath.startsWith(prefix) || filePath.includes(`/${prefix}`)) {
			return true;
		}
	}

	const basename = filePath.split("/").pop() ?? "";

	// Check exact file matches
	for (const file of CONFIG_EXACT_FILES) {
		if (basename === file) return true;
	}

	// Check basename prefixes (handles .eslintrc.json, tsconfig.build.json, etc.)
	for (const prefix of CONFIG_BASENAME_PREFIXES) {
		if (basename.startsWith(prefix)) return true;
	}

	return false;
}

export const rule: Rule = {
	name: "no-config",
	description: "Flag dev config files that should not be published",
	defaultSeverity: "warn",
	run(contents: TarballContents): RuleResult[] {
		const flagged: string[] = [];

		for (const entry of contents.entries) {
			if (isDevConfig(entry.path)) {
				flagged.push(entry.path);
			}
		}

		if (flagged.length === 0) return [];

		return [
			{
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Found ${flagged.length} dev config file(s)`,
				files: flagged,
			},
		];
	},
};

export default rule;
