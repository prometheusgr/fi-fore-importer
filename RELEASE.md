# Release Process

This project uses automated semantic versioning for releases. When changes are merged to the `main` branch, they trigger automatic version bumps and NPM publication.

## Importer Release Flow

1. **Develop and merge changes** to `main` branch of `fi-fore-importer`
2. **Automated workflow** (`.github/workflows/release.yml`):
   - Runs tests and builds
   - Bumps patch version (e.g., 0.1.0 → 0.1.1)
   - Publishes to NPM as `@fi-fore/importer@0.1.1`
   - Creates a GitHub release with the tag `v0.1.1`

## fi-fore Release Flow

The fi-fore app depends on published importer versions. After importer is released:

1. **Trigger manual release** via GitHub Actions `auto-release.yaml` workflow
   - Input the new importer version (e.g., 0.1.1)
2. **Automated workflow**:
   - Verifies importer version is published on NPM
   - Updates importer dependency in package.json
   - Bumps fi-fore's patch version
   - Commits, tags, and pushes to main
   - Triggers the main release workflow (`release.yaml`) which builds Electron apps

## NPM Authentication

The importer publish workflow requires an `NPM_TOKEN` secret:

1. Generate a token at https://www.npmjs.com/settings/tokens
2. Add it as a GitHub secret: `NPM_TOKEN` in the fi-fore-importer repository

## Manual Testing

To test the release workflows locally:

```bash
# Simulate version bump
npm version patch --no-git-tag-version

# Verify build
npm run build

# Verify publish will work
npm publish --dry-run
```

## Dependency Chain

```
fi-fore-importer → NPM (@fi-fore/importer) → fi-fore
     ↓                                            ↓
  Auto-publish                              Auto-release
  on main push                              (manual trigger)
```

## Troubleshooting

**Error: "@fi-fore/importer@X.X.X is not published on NPM"**
- The importer workflow may still be running
- Check the fi-fore-importer releases page: https://github.com/prometheusgr/fi-fore-importer/releases
- Wait for the release to complete before triggering fi-fore's auto-release

**Error: "Cannot find package version"**
- NPM might have cached an older version
- Wait 5 minutes for NPM registry to update
- Test manually: `npm view @fi-fore/importer@X.X.X`
