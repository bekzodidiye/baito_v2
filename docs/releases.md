# Releases and rollback

Every push to `main` deploys. A release does not ship anything — it **names a
commit that is already live**, so that two questions have short answers:

- *What is in production?* → `v1.1.0`, not `873b91640df3f39…`
- *How do I get back?* → `bash scripts/rollback.sh v1.0.0`

## Cutting a release

From an up-to-date `main`, after the deploy for those commits has succeeded:

```bash
bash scripts/release.sh          # what would go out, and what has shipped since the last one
bash scripts/release.sh minor    # 1.0.0 -> 1.1.0
```

It bumps `package.json`, commits, tags, and pushes. The tag triggers
`.github/workflows/release.yml`, which publishes the release with notes
generated from the commits since the previous tag.

The bump commit is itself a push to `main`, so it deploys — which is what makes
the version the app displays become true. The drawer and the settings screen
read `package.json` through `__APP_VERSION__`.

### Which number to bump

There is no formal contract with an API consumer to break, so treat it from the
user's side:

| | |
|---|---|
| `patch` | fixes only; nothing looks or behaves differently on purpose |
| `minor` | new behaviour a user could notice — a screen, an action that now works |
| `major` | something a user has to relearn, or data they must migrate |

Guard rails, all of which stop the release rather than warn:

- refuses to run outside `main`
- refuses a dirty working tree
- refuses when `origin/main` is ahead, or when you hold unpushed commits — a
  release must name what is deployed
- refuses a tag that already exists
- the workflow refuses a tag that disagrees with `package.json`, and one that
  points at a commit not on `main`

## Rolling back

Images are tagged by commit SHA and the five most recent builds are kept on the
host, so a rollback is a container swap, not a rebuild.

```bash
bash scripts/rollback.sh              # list builds on the host, annotated with versions
bash scripts/rollback.sh v1.0.0       # roll back to that release
bash scripts/rollback.sh <sha>        # or to a specific build
bash scripts/rollback.sh --previous   # one release back
```

It asks for confirmation, swaps the containers, waits for the backend to report
healthy, and records the rollback in `.deploy-history`.

`--previous` needs at least two recorded deploys. Until a second one lands, pass
a version or SHA explicitly.

### The limit worth knowing

**Migrations are not reversed.** The code goes back; the database does not.

That is safe only while a schema change stays backward-compatible for one
release — adding a column is fine, because the old image ignores it. Dropping or
renaming one is not: the previous image would query something that no longer
exists, and rolling back would not save you.

So the rule is: **a migration must be survivable by the release before it.**
Split anything else across two releases — first add and start writing both, then
stop reading the old shape, and only then remove it.

Nothing enforces this automatically yet. It is the weakest point in the rollback
story and worth a CI check that flags `DROP COLUMN` and `RENAME` in new
migrations.
