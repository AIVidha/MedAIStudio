# Workflow: Verify Phase Implementation

1. Run backend unit & integration tests:
   `pytest backend/tests`
2. Run frontend type-checking and linting:
   `cd frontend && npm run type-check && npm run lint`
3. Verify Docker stack builds & boots cleanly:
   `docker compose up --build -d`
4. Use the browser agent to verify target UI routes and interaction flows.
5. Capture and save screenshots to `docs/screenshots/phase-N/`.
6. Write phase summary walkthrough report before requesting gate approval.
