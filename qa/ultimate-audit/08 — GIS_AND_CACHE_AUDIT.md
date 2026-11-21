# 08 — GIS AND CACHE AUDIT: SPATIAL QUERIES, CLUSTERING & HMAC

## 1. Geospatial Integrity & Boundary Rules

- **Territorial Bounding Polygon**:
  - Uzbekistan national boundary is strictly clamped to:
    $$\text{Latitude: } 37.0^\circ \text{ to } 45.8^\circ \text{ N}, \quad \text{Longitude: } 55.9^\circ \text{ to } 73.5^\circ \text{ E}$$
  - Handled by `isInsideUzbekistan(lat, lng)`. Coordinates outside these boundaries are discarded or flagged as foreign jobs.
- **District GeoJSON & Regional Fallback**:
  - High-resolution polygon boundaries for all 14 regions and 208 districts are loaded from `uzbekistan_districts.json` and `uzbekistan_regions.json`.
  - When exact GPS coordinates are omitted from job creation, the server/frontend calculates centroid placement based on parsed district and city names (`KNOWN_CITIES`).

---

## 2. Server-Side Viewport Clustering

- **Clustering Algorithm**:
  - Nationwide views (zoom levels below 10) switch to server-side clustering (`clustered=true`).
  - Clusters group neighboring jobs into single cluster objects containing `count`, `coordinates`, `pinIds`, and `isCluster: true`.
  - Scalability test: `test_map_clustering_accounts_for_over_1200_jobs_without_limit_cutoff` verified that clusters accurately aggregate over 1,200 active jobs without truncation or starving non-clustered markers.

---

## 3. Cryptographic Cache Envelopes & HMAC-SHA-256 Signatures

### Cryptographic Security Model
In Baito Stage 3C, caching was hardened against tampering, replay, and unauthorized visibility attacks:

1. **Per-Pin Canonical Signing**:
   - `_canonical_pin_data(pin)` extracts all emitted fields: `id`, `title`, `company`, `salary`, `salaryCurrency`, `location`, `rawLocation`, `workDate`, `workTime`, `status`, `applied`, `bookmarked`, `latitude`, `longitude`, `category`, `neededWorkers`.
   - Generates HMAC-SHA-256 signature using `settings.SECRET_KEY` and appends `geo_sig: <hex>` and `geo_verified: true`.
   - Modifying any single field (e.g. changing title to scam text or salary from 1M to 10M) invalidates the signature.
2. **Whole-Response Envelope Signing**:
   - `make_response_envelope(cache_key, items, ...)` seals the entire ordered list of pins/clusters, the request parameters, the clustered mode, and the authenticated user identity.
   - Prevents cache splicing (deleting pins from a list) or replaying a signed cache from one user to another.
3. **Public vs Personalized Cache Isolation**:
   - Anonymous requests use public cache keys: `baito:map:pins:vX:...:public`.
   - Authenticated requests use user-scoped keys derived from verified JWT UID: `baito:map:pins:vX:...:u:{worker_id}`.
   - Prevents Worker A from seeing Worker B's personalized `applied` or `bookmarked` statuses.
4. **Zero-DB Query Cache Hits**:
   - Verified by `test_clean_cache_hit_preserves_zero_db_queries_on_non_empty_dataset`: On a valid cached response with authentic envelope and pin signatures, the endpoint returns immediately from Redis with exactly 0 database queries.
