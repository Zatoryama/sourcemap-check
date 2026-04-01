import { resolve } from "node:path";
import * as tar from "tar";

export interface TarballEntry {
	path: string;
	size: number;
	content: Buffer;
}

export interface TarballContents {
	entries: TarballEntry[];
	manifest: Record<string, unknown>;
	totalSize: number;
	filePath: string;
}

const PACKAGE_PREFIX = "package/";

function stripPackagePrefix(entryPath: string): string {
	if (entryPath.startsWith(PACKAGE_PREFIX)) {
		return entryPath.slice(PACKAGE_PREFIX.length);
	}
	return entryPath;
}

function collectStream(stream: tar.ReadEntry): Promise<Buffer> {
	return new Promise<Buffer>((res, rej) => {
		const chunks: Buffer[] = [];
		stream.on("data", (chunk: Buffer) => chunks.push(chunk));
		stream.on("end", () => res(Buffer.concat(chunks)));
		stream.on("error", rej);
	});
}

export async function readTarball(tgzPath: string): Promise<TarballContents> {
	const absolutePath = resolve(tgzPath);
	const entries: TarballEntry[] = [];
	const entryPromises: Promise<void>[] = [];

	await tar.list({
		file: absolutePath,
		onReadEntry(entry) {
			// Skip directories — only collect files
			if (entry.type !== "File") {
				entry.resume();
				return;
			}

			const promise = collectStream(entry).then((content) => {
				entries.push({
					path: stripPackagePrefix(entry.path),
					size: content.length,
					content,
				});
			});

			entryPromises.push(promise);
		},
	});

	await Promise.all(entryPromises);

	const manifestEntry = entries.find((e) => e.path === "package.json");
	if (!manifestEntry) {
		throw new Error(`No package.json found in tarball: ${absolutePath}`);
	}

	let manifest: Record<string, unknown>;
	try {
		manifest = JSON.parse(manifestEntry.content.toString("utf-8")) as Record<string, unknown>;
	} catch {
		throw new Error("Failed to parse package.json from tarball");
	}

	const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

	return {
		entries,
		manifest,
		totalSize,
		filePath: absolutePath,
	};
}
