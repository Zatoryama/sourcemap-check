import type { TarballContents } from "../core/tarball.js";
import type { Rule, RuleResult } from "./types.js";

const SENSITIVE_FILE_PATTERNS = [".env", ".npmrc", ".netrc", "id_rsa", "id_ed25519"];

const SENSITIVE_EXTENSIONS = [".pem", ".key", ".p12", ".pfx", ".jks"];

const CONTENT_PATTERNS: RegExp[] = [
	/AWS_ACCESS_KEY_ID/,
	/AWS_SECRET_ACCESS_KEY/,
	/PRIVATE_KEY/,
	/-----BEGIN.*PRIVATE KEY-----/,
	/sk-[a-zA-Z0-9]{20,}/,
	/ghp_[a-zA-Z0-9]{36}/,
	/npm_[a-zA-Z0-9]{36}/,
];

function isSensitiveFilename(filePath: string): boolean {
	const basename = filePath.split("/").pop() ?? "";

	// Exact match or .env.* pattern
	if (basename === ".env" || basename.startsWith(".env.")) return true;

	for (const pattern of SENSITIVE_FILE_PATTERNS) {
		if (basename === pattern) return true;
	}

	for (const ext of SENSITIVE_EXTENSIONS) {
		if (basename.endsWith(ext)) return true;
	}

	return false;
}

function hasSensitiveContent(content: Buffer): boolean {
	let text: string;
	try {
		text = content.toString("utf-8");
	} catch {
		return false;
	}

	for (const pattern of CONTENT_PATTERNS) {
		if (pattern.test(text)) return true;
	}

	return false;
}

export const rule: Rule = {
	name: "no-secrets",
	description: "Flag sensitive files and content patterns that may leak secrets",
	defaultSeverity: "error",
	run(contents: TarballContents): RuleResult[] {
		const results: RuleResult[] = [];
		const flaggedByName: string[] = [];
		const flaggedByContent: string[] = [];

		for (const entry of contents.entries) {
			if (isSensitiveFilename(entry.path)) {
				flaggedByName.push(entry.path);
			} else if (hasSensitiveContent(entry.content)) {
				flaggedByContent.push(entry.path);
			}
		}

		if (flaggedByName.length > 0) {
			results.push({
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Found ${flaggedByName.length} potentially sensitive file(s)`,
				files: flaggedByName,
			});
		}

		if (flaggedByContent.length > 0) {
			results.push({
				rule: this.name,
				severity: this.defaultSeverity,
				message: `Found ${flaggedByContent.length} file(s) with sensitive content patterns`,
				files: flaggedByContent,
			});
		}

		return results;
	},
};

export default rule;
