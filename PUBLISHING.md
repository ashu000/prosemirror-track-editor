# Publishing Guide

Steps to publish a new version of `@ashu000/prosemirror-track-editor` to NPM.

---

## Before you start

Make sure you are logged in:
```bash
npm whoami
# should print: ashu000
```

If not logged in:
```bash
npm login
```

---

## 1. Make your changes

Edit files in `src/`. Run tests to confirm nothing is broken:
```bash
npm test
```

---

## 2. Bump the version

Choose the right bump type:

| Change type | Command | Example: `0.1.1` → |
|---|---|---|
| Bug fix | `npm version patch` | `0.1.2` |
| New feature (backwards-compatible) | `npm version minor` | `0.2.0` |
| Breaking change | `npm version major` | `1.0.0` |

```bash
npm version patch   # or minor / major
```

This automatically:
- Updates `version` in `package.json`
- Creates a git commit
- Creates a git tag (e.g. `v0.1.2`)

---

## 3. Update CHANGELOG.md

Open `CHANGELOG.md` and add a new section at the top for the new version:

```md
## [0.1.2] - 2026-08-20

### Fixed
- Describe what you fixed

### Added
- Describe what you added

### Changed
- Describe what you changed
```

Commit it:
```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v0.1.2"
```

---

## 4. Publish

```bash
npm publish --access public
```

`prepublishOnly` runs `npm run build` automatically before publishing — no need to build manually.

---

## 5. Push to GitHub

```bash
git push origin main --tags
```

`--tags` pushes the version tag created in step 2.

---

## Verify

Check the published package on NPM:
```
https://www.npmjs.com/package/@ashu000/prosemirror-track-editor
```

Install and smoke-test in a fresh project:
```bash
npm i @ashu000/prosemirror-track-editor
```

---

## Rollback a bad publish

NPM allows unpublishing within 72 hours:
```bash
npm unpublish @ashu000/prosemirror-track-editor@0.1.2
```

After 72 hours you can only deprecate:
```bash
npm deprecate @ashu000/prosemirror-track-editor@0.1.2 "critical bug, use 0.1.3"
```
