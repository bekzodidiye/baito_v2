# ADR-001: Baito V3 Architecture and Optimization Decisions

## 1. Context
Baito is a full-stack employment and job listing platform. The project has undergone a significant UI/UX and architectural audit by an 11-member virtual engineering team. To address the identified bottlenecks, improve performance, and enhance security, several architectural decisions have been made.

## 2. Status
Accepted

## 3. Decisions Made

### 3.1. Frontend Architecture
- **Framework:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS with a mobile-first, high-density "Card-based" component design.
- **Performance (Lazy Loading):** Implemented `IntersectionObserver` in list components (e.g., `EmployerJobs.tsx`) to chunk the rendering of job cards (12 at a time). This prevents DOM overload and keeps scrolling buttery smooth on mobile devices.
- **Build Optimization:** Manual chunking is configured in `vite.config.ts` to split vendor libraries (React, Motion, Mapbox, Lucide) and application state, reducing the initial bundle load time.

### 3.2. Backend Architecture
- **Framework:** FastAPI (Python).
- **Security:**
  - Integrated `slowapi` for Rate Limiting to prevent brute-force and DDoS attacks on endpoints.
  - Implemented strong `Content-Security-Policy` and `Strict-Transport-Security` headers in `main.py`.
- **Performance:** Added `GZipMiddleware` to automatically compress API responses, drastically reducing payload sizes for large lists of jobs and applicants.

### 3.3. Database and Storage
- **Current DB:** SQLite (`baito_new.db`) via SQLAlchemy.
- **Optimization:** Added `index=True` to highly queried fields in the `Job` model (`employerId`, `location`, `status`, `workDate`, `category`) to speed up read and filter operations without yet migrating to a heavier RDBMS like PostgreSQL.
- **Future DB:** Migration to PostgreSQL is recommended when the platform scales beyond a single-node deployment.

## 4. Consequences
- **Positive:** Significant reduction in frontend render lag and backend bandwidth usage. The database is now more resilient to complex filtering.
- **Negative/Trade-offs:** CPU usage on the backend will slightly increase due to GZIP compression. Developers must remember to add indexes when introducing new queried fields.

## 5. Next Steps (Future Sprints)
- Implement Semantic AI Matching for candidates and jobs (using Pinecone/Qdrant or basic cosine similarity with embeddings).
- Introduce comprehensive Cypress E2E tests and PyTest unit tests.
