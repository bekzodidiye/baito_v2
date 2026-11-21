---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ for codebase and architecture questions.
---

## ⚡ Graphify-First Scoped Code Analysis Policy

This project maintains a persistent graphify knowledge graph in `graphify-out/`.

### Mandatory Rules:
1. **Graphify-First on Codebase Questions**:
   - Whenever `graphify-out/graph.json` exists, NEVER begin with raw repo-wide grep, find, or bulk file reading.
   - Run `graphify query "<question>"` to obtain a scoped subgraph.
   - Use `graphify path "<nodeA>" "<nodeB>"` (add `--undirected` if needed) to trace connections between architectural boundaries.
   - Use `graphify explain "<concept>"` (or `<path>::<symbol>`) to inspect specific functions, classes, or modules.
2. **Targeted File Reading**:
   - Only open and read the exact `file:line` locations returned by the graph analysis.
   - Repositories should not be read in their entirety for localized tasks.
3. **Broad Scanning Boundary**:
   - Repo-wide `grep` or file tree scanning is strictly restricted to cases where the graph does not surface enough context, or when the user explicitly requests a full manual search.
4. **Security, Migration, and Release Verification**:
   - Graph results provide structural guidance; for security-critical paths, database migrations, and release checks, always verify the targeted lines directly against the source code and run the relevant automated tests.
5. **Graph Integrity Maintenance**:
   - After modifying or creating source files, run `graphify update .` locally to keep the graph up to date (deterministic AST extraction, zero LLM/API cost).
