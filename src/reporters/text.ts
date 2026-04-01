import pc from "picocolors";
import type { TarballContents } from "../core/tarball.js";
import type { RuleResult, Severity } from "../rules/types.js";

const VERSION = "0.1.0";

function formatSize(bytes: number): string {
	if (bytes >= 1_048_576) {
		return `${(bytes / 1_048_576).toFixed(1)} MB`;
	}
	return `${Math.round(bytes / 1024)} KB`;
}

function severityTag(severity: Severity): string {
	switch (severity) {
		case "error":
			return pc.red(pc.bold(" FAIL "));
		case "warn":
			return pc.yellow(pc.bold(" WARN "));
		case "info":
			return pc.blue(pc.bold(" INFO "));
	}
}

export function formatTextReport(
	results: RuleResult[],
	contents: TarballContents,
	ruleNames?: string[],
): string {
	const name = (contents.manifest.name as string) ?? "unknown";
	const version = (contents.manifest.version as string) ?? "0.0.0";
	const lines: string[] = [];

	lines.push(`publishguard v${VERSION} — checking ${name}@${version}`);
	lines.push("");
	lines.push(`  ${contents.entries.length} files, ${formatSize(contents.totalSize)} (unpacked)`);
	lines.push("");

	// Group results by rule name
	const resultsByRule = new Map<string, RuleResult[]>();
	for (const r of results) {
		const existing = resultsByRule.get(r.rule);
		if (existing) {
			existing.push(r);
		} else {
			resultsByRule.set(r.rule, [r]);
		}
	}

	const rulesWithIssues = new Set(resultsByRule.keys());

	// Print failing/warning rules
	for (const [ruleName, ruleResults] of resultsByRule) {
		const worstSeverity = ruleResults.some((r) => r.severity === "error")
			? ("error" as const)
			: ruleResults.some((r) => r.severity === "warn")
				? ("warn" as const)
				: ("info" as const);

		const totalFiles = ruleResults.reduce((sum, r) => sum + (r.files?.length ?? 0), 0);
		const countSuffix = totalFiles > 0 ? pc.dim(` (${totalFiles} files)`) : "";
		lines.push(`${severityTag(worstSeverity)} ${ruleName}${countSuffix}`);

		for (const r of ruleResults) {
			lines.push(`       ${r.message}`);
			if (r.files) {
				for (const f of r.files) {
					lines.push(`       ${pc.dim(f)}`);
				}
			}
		}

		lines.push("");
	}

	// Print passing rules
	if (ruleNames) {
		for (const name of ruleNames) {
			if (!rulesWithIssues.has(name)) {
				lines.push(`${pc.green(pc.bold(" PASS "))} ${name}`);
			}
		}
		if (ruleNames.some((n) => !rulesWithIssues.has(n))) {
			lines.push("");
		}
	}

	// Summary
	let errorCount = 0;
	let warnCount = 0;

	for (const r of results) {
		if (r.severity === "error") errorCount++;
		if (r.severity === "warn") warnCount++;
	}

	const parts: string[] = [];
	if (errorCount > 0) parts.push(`${errorCount} error${errorCount !== 1 ? "s" : ""}`);
	if (warnCount > 0) parts.push(`${warnCount} warning${warnCount !== 1 ? "s" : ""}`);

	if (errorCount > 0) {
		lines.push(`${parts.join(", ")} — ${pc.red(pc.bold("FAILED"))}`);
	} else if (warnCount > 0) {
		lines.push(`${parts.join(", ")} — ${pc.green(pc.bold("PASSED"))}`);
	} else {
		lines.push(pc.green(pc.bold("All checks passed — PASSED")));
	}

	return lines.join("\n");
}
