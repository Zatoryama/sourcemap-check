# publishguard

Checks npm packages for source maps that expose your original source code. One job, zero config, CI-ready.

```
publishguard v0.1.0 — checking my-package@1.0.0

FAIL Found 3 source map file(s) exposing original source code:

  dist/index.js.map
  dist/utils.js.map
  dist/helpers.js.map
```

## Why

Source maps (`.js.map`, `.css.map`) contain mappings back to your original source code — variable names, comments, file structure, and often the full source text via `sourcesContent`. When you publish an npm package with source maps, anyone who installs it gets access to your unminified code.

No existing npm publishing tool checks for this. `publint` validates exports. `arethetypeswrong` checks types. `gitleaks` catches secrets. **Nobody catches source maps.** publishguard fills that gap.

## Install

```bash
npm install -D publishguard
```

## Usage

```bash
# Check current project (runs npm pack, inspects, cleans up)
npx publishguard

# Check an existing tarball
npx publishguard ./my-package-1.0.0.tgz

# JSON output for CI
npx publishguard --json
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No source maps found |
| `1` | Source maps detected |
| `2` | Tool error |

## Add to CI

### npm scripts

```json
{
  "scripts": {
    "prepublishOnly": "publishguard"
  }
}
```

### GitHub Actions

```yaml
- name: Check for source maps
  run: npx publishguard
```

### JSON output

```bash
npx publishguard --json
```

```json
{
  "package": "my-package",
  "version": "1.0.0",
  "files": 47,
  "sourceMaps": [
    "dist/index.js.map",
    "dist/utils.js.map"
  ],
  "passed": false
}
```

## Programmatic API

```typescript
import { readTarball, findSourceMaps, packProject } from "publishguard";

const tgzPath = await packProject(process.cwd());
const { entries } = await readTarball(tgzPath);
const sourceMaps = findSourceMaps(entries);

if (sourceMaps.length > 0) {
  console.log("Source maps found:", sourceMaps);
}
```

## What it checks

File extensions: `.js.map`, `.css.map`, `.mjs.map`, `.cjs.map`

That's it. One job, done well.

## Requirements

Node.js >= 20

## License

MIT
