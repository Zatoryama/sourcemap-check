import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

const TEST_DIR_PREFIXES = [
	"__tests__/",
	"test/",
	"tests/",
	"cypress/",
	"__mocks__/",
	"__snapshots__/",
];

const TEST_FILE_PATTERNS = [".test.", ".spec."];

const TEST_CONFIG_PATTERNS = [
	"jest.config.",
	"vitest.config.",
	".mocharc.",
	"karma.conf.",
	"cypress.config.",
];

function isTestFile(filePath: string): boolean {
	// Check directory prefixes
	for (const prefix of TEST_DIR_PREFIXES) {
		if (filePath.startsWith(prefix) || filePath.includes(`/${prefix}`)) {
			return true;
		}
	}

	const basename = filePath.split("/").pop() ?? "";

	// Check test file patterns
	for (const pattern of TEST_FILE_PATTERNS) {
		if (basename.includes(pattern)) return true;
	}

	// Check test config patterns
	for (const pattern of TEST_CONFIG_PATTERNS) {
		if (basename.startsWith(pattern)) return true;
	}

	return false;
}

export const rule: Rule = {
	name: "no-tests",
	description: "Flag test files and directories that should not be published",
	defaultSeverity: "warn",
	run(contents: TarballContents): RuleResult[] {
		const flagged: string[] = [];

		for (const entry of contents.entries) {
			if (isTestFile(entry.path)) {
				flagged.push(entry.path);
			}
		}

		if (flagged.length === 0) return [];

		return [
			{
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Found ${flagged.length} test file(s)`,
				files: flagged,
			},
		];
	},
};

export default rule;
