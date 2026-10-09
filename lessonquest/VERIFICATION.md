# Verification record

Verified on 3 October 2026 using Python 3.12 and the Codex in-app Chromium browser.

- **22 passing pytest cases**: create/read/update/duplicate/delete for all eight templates and both maths modes; template validation failures; title/item limits; unknown templates and missing activities; safe HTML/JSON serialization; health route; saved content surviving two separate Python processes; rollback journaling, full synchronization, and foreign-key enforcement.
- **All JavaScript files pass `node --check`.**
- **`docker compose config --quiet` passes** and resolves the `./data:/app/data` bind mount and port 8000.
- **Browser checks**: create/save/play all eight templates; correct quiz scoring and results; Gameshow double chance after a wrong answer, 50:50, and 200-point bonus; opening boxes and revealing saved answers; 3D flashcard front/back; virtual keys and mixed-case/whitespace answer validation; sentence assembly; cloze with repeated words; KaTeX editor preview, multiple-choice gameplay, feedback, results, and maths flip cards; dashboard duplicate and edit prefill.
- **Visual review**: teacher dashboard, live maths editor, flashcard back, and maths feedback. Screenshot: `dashboard-preview.jpg`.

Docker Desktop image rebuild and startup now verified. An initial startup failure occurred with WAL files shared between the Windows local preview and the Linux container. Both processes were stopped and the full data directory backed up; the database was checkpointed and migrated to `DELETE` rollback journaling. Integrity checks passed before and after migration; all nine saved activities survived the rebuild. The container reports healthy and the `/health` and activities API endpoints respond successfully. Local development must use a separate `DATA_DIR` when Docker is running.

Browser checks used example activities in the local ignored `data/app.db`; deployment to a new host starts with an empty collection. Scores and activity progress are intentionally session-only.

## Match Up — 8 October 2026

- 28 backend tests pass, including Match Up CRUD, empty/ambiguous-pair validation, and pair relationships surviving edits and duplication.
- Five Node matching-state tests pass: submission gating, one-to-one reassignment and disconnection, partial and perfect scoring, and invalid endpoints.
- Browser verification: pair editor and example content save correctly; both columns shuffle; pointer dragging works in either direction; tap and keyboard controls draw connections; all pairs are required before submission; a mixed test reports 2/4 and 50% with two green and two pink lines plus corrections; retry clears and reshuffles, then a perfect test reports 4/4, 100%, and 400 points.
- Docker rebuilt with the new activity. Existing saved quizzes remained available.
