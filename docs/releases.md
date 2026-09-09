# Releases and rollback

Every push to `main` deploys. A release does not ship anything — it **names a
commit that is already live**, so that two questions have short answers:

- *What is in production?* → `v1.1.0`, not `873b91640df3f39…`
- *How do I get back?* → `bash scripts/rollback.sh v1.0.0`

## Cutting a release

From an up-to-date `main`, after the deploy for those commits has succeeded:

```bash
bash scripts/release.sh          # what would go out, and what has shipped since the last one
bash scripts/release.sh minor    # opens the bump PR: 1.0.0 -> 1.1.0
#   ... merge it, and let the deploy finish ...
bash scripts/release.sh tag      # tags the bump commit and publishes the release
```

**Two steps, and the split is deliberate.** The first opens a pull request for
the version bump; the second tags it once it has merged and deployed.

The bump does not go straight to `main` because `.githooks/pre-push` refuses
that — "main is where deploys come from" — and reserves its `--no-verify`
escape for a revert or a hotfix. A version bump is neither.

The tag waits because a release names a commit that is **already live**.
Tagging before the bump has deployed produces a version pointing at nothing
shipped; the release workflow's own "commit is on main" check rejects it.

The tag triggers `.github/workflows/release.yml`, which publishes the release
with notes generated from the commits since the previous tag.

The bump commit deploys like any other, which is what makes the version the app
displays become true. The drawer and the settings screen read `package.json`
through `__APP_VERSION__`.

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

## Merging

GitHub's branch protection would hold a merge until its checks pass. It is
unavailable here — the repository is private on a free account, and both the
protection and rulesets APIs answer:

> Upgrade to GitHub Pro or make this repository public

so **nothing server-side stops a merge**, and `gh pr merge --auto` does not help:
with no protection to wait on, it merges immediately. A pull request has already
landed here with its backend suite still running because of exactly that.

Until protection is available, merge through:

```bash
bash scripts/merge-pr.sh 24            # waits for the checks, then squash-merges
bash scripts/merge-pr.sh 24 --no-wait  # fails instead of waiting
```

It refuses outright on a failing check, waits on a pending one, and treats
`skipping` as fine — the deploy job is gated to `main`, so on a pull request it
skips and never resolves. Waiting on it would hang forever.

This is a convenience, not a control: the web UI can still merge anything. The
real fix is GitHub Pro or a public repository.
