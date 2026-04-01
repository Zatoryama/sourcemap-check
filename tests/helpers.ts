import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as tar from "tar";

export interface FixtureFile {
	path: string; // path INSIDE the tarball (under package/)
	content: string;
}

const tempDirs: string[] = [];

/**
 * Creates a temp .tgz tarball with the given files + a package.json.
 * Files are placed under a `package/` directory to mimic npm pack output.
 */
export async function createFixtureTarball(
	files: FixtureFile[],
	manifest?: Record<string, unknown>,
): Promise<string> {
	const tempDir = mkdtempSync(join(tmpdir(), "publishguard-test-"));
	tempDirs.push(tempDir);

	const packageDir = join(tempDir, "package");
	mkdirSync(packageDir, { recursive: true });

	// Write package.json
	const finalManifest = manifest ?? { name: "test-package", version: "1.0.0" };
	writeFileSync(join(packageDir, "package.json"), JSON.stringify(finalManifest, null, 2));

	// Write all fixture files
	for (const file of files) {
		const filePath = join(packageDir, file.path);
		mkdirSync(dirname(filePath), { recursive: true });
		writeFileSync(filePath, file.content);
	}

	const tgzPath = join(tempDir, "package.tgz");

	await tar.create(
		{
			gzip: true,
			file: tgzPath,
			cwd: tempDir,
		},
		["package"],
	);

	return tgzPath;
}

/**
 * Cleans up all temp directories created during tests.
 */
export function cleanupFixtures(): void {
	for (const dir of tempDirs) {
		try {
			rmSync(dir, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	}
	tempDirs.length = 0;
}
