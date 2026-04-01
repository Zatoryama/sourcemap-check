import type { TarballEntry } from "../core/tarball.js";

const SOURCEMAP_EXTENSIONS = [".js.map", ".css.map", ".mjs.map", ".cjs.map"];

export function findSourceMaps(entries: TarballEntry[]): string[] {
	const found: string[] = [];
	for (const entry of entries) {
		for (const ext of SOURCEMAP_EXTENSIONS) {
			if (entry.path.endsWith(ext)) {
				found.push(entry.path);
				break;
			}
		}
	}
	return found;
}
