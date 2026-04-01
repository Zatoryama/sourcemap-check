export interface ManifestIssue {
	field: string;
	message: string;
}

export function parseManifest(raw: Buffer): Record<string, unknown> {
	const text = raw.toString("utf-8");

	try {
		return JSON.parse(text) as Record<string, unknown>;
	} catch (cause) {
		throw new Error("Invalid JSON in package.json", { cause });
	}
}

const RISKY_LIFECYCLE_SCRIPTS = [
	"prepublish",
	"prepare",
	"preinstall",
	"install",
	"postinstall",
] as const;

export function checkManifest(manifest: Record<string, unknown>): ManifestIssue[] {
	const issues: ManifestIssue[] = [];

	if (!manifest.name || typeof manifest.name !== "string") {
		issues.push({
			field: "name",
			message: "Missing or invalid `name` field",
		});
	}

	if (!manifest.version || typeof manifest.version !== "string") {
		issues.push({
			field: "version",
			message: "Missing or invalid `version` field",
		});
	}

	if (!manifest.main && !manifest.exports) {
		issues.push({
			field: "main/exports",
			message:
				"Missing both `main` and `exports` — consumers may not be able to import this package",
		});
	}

	if (!manifest.types && !manifest.typings) {
		issues.push({
			field: "types",
			message:
				"Missing `types` or `typings` field — TypeScript consumers will lack type definitions",
		});
	}

	if (manifest.scripts && typeof manifest.scripts === "object" && manifest.scripts !== null) {
		const scripts = manifest.scripts as Record<string, unknown>;

		for (const scriptName of RISKY_LIFECYCLE_SCRIPTS) {
			if (scripts[scriptName] && typeof scripts[scriptName] === "string") {
				issues.push({
					field: `scripts.${scriptName}`,
					message: `Lifecycle script \`${scriptName}\` will run on consumer install — ensure it cannot fail in a clean environment`,
				});
			}
		}
	}

	return issues;
}
