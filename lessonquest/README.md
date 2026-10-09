# LessonQuest

A self-hosted classroom activity studio for ages 8–14, built with FastAPI, SQLite, Jinja2, and browser-native games. One teacher, nine templates, no accounts. Activities start empty; use **Try an example** in any editor to get started quickly.

## Build and run

Install Docker Desktop (Windows/macOS) or Docker Engine with Compose (Linux). Start the Docker engine, then run from this directory:

```sh
docker-compose up --build
```

Modern Docker installations also support:

```sh
docker compose up --build -d
```

Open **http://localhost:8000**. Check readiness with `docker compose ps` or visit `/health`. The app creates `data/app.db` and its tables on startup. Compose binds **`./data:/app/data`**; the database stays on your host across container replacement, restart, rebuild, and `docker compose down`. Do not delete `data` if you want to retain your work.

The container entrypoint prepares the bind-mounted storage for UID 10001, then drops privileges before launching the server. This keeps the single-command startup working on Linux as well as Docker Desktop. If your host uses a filesystem that forbids changing ownership, grant UID 10001 write access to `data`; do not move the database into the container's ephemeral filesystem.

## Create and run an activity

1. Select **Create new activity**, then one of the nine templates.
2. Give it a title. Fill the dedicated fields or select **Try an example**.
3. Add and reorder items. The sidebar previews the selected item and renders formulas.
4. Select **Save activity** or **Save & play**. Saving validates every item on the server.
5. From **My activities**, select **Play**, **Edit**, **Duplicate**, or **Delete**. Edit restores all saved fields. Delete asks for confirmation.
6. In the player, select **Let’s play!** to enable audio. Use the fullscreen and sound controls in the top right. The restart button starts a fresh session.

### Template guide

| Template | Authoring and classroom controls |
|---|---|
| Quiz | Prompt, 2–4 distinct choices, correct-answer radio button. Click a choice or press 1–4; Enter advances after feedback. |
| Gameshow Quiz | Quiz fields, optional double-points bonus, 10–120-second question timer. One 50:50 and one double-chance lifeline per session. The countdown continues during the second chance. |
| Open the Box | Challenge and optional answer per box. Pick any box, reveal its answer, return to the grid. Opened boxes can be revisited. Finish after exploring all boxes. |
| Flash Cards | Front and back. Click, tap, Space, or Enter on a focused card to flip. Previous/Next and Shuffle controls; arrow keys work when no control has focus. |
| Type the Answer | Question, answer, and optional alternatives separated by `|`. Physical keyboard or virtual keypad. Matching ignores case and whitespace. Checking records one scored attempt; Reveal records a missed item. |
| Unjumble | A correct sentence or expression split by spaces. Tap tiles in order or drag to the answer area; tap selected tiles to return them. Start over resets the arrangement. |
| Complete the Sentence | Surround missing words with `[brackets]`. Select a blank and tap a word, or drag a word onto a blank. Duplicate words are supported. Tap a filled blank to clear it. |
| Maths Generator | Manually authored LaTeX drills in multiple-choice or flip-card mode. No automatic equation generation or algebra solving. Use `\frac{a}{b}`, `\sqrt{x}`, or `2x + 5 = 15`. |
| Match Up | Enter distinct question–answer pairs. Both columns shuffle. Drag in either direction to draw a line, or tap/keyboard-select one card from each column. Tap a linked card to disconnect it; reconnecting replaces any previous partner. Submit activates when every pair is linked. Results show correct/incorrect lines, percentage, chosen answers, and corrections. |

Maths Generator renders bare LaTeX; other templates render math between `$…$`, `$$…$$`, `\(…\)`, or `\[…\]`. Use spaces between Unjumble tokens, e.g. `2 + 3 = 5`. KaTeX displays formulas; it does not validate their mathematical correctness. All templates support 1–100 items.

Quiz-style games award 100 points for a correct item and Gameshow bonus rounds award 200. Unjumble, Cloze, and Type the Answer record one scored attempt per item and show the solution after an incorrect answer. The final review lists the answers. Player progress and scores are session-only; activity content is persisted immediately upon a successful save.

Match Up awards 100 points per correct pair after submitting the entire test. Connections remain editable without correctness hints until submission. **Try again** clears results and reshuffles both columns. Questions and answers must each be distinct (ignoring case and repeated whitespace) to keep one-to-one matching unambiguous.

## Verify persistence

1. Create an activity, edit its title, and save it.
2. Run `docker compose restart`. Refresh the dashboard; the edited activity should remain.
3. Run `docker compose down`, then `docker compose up --build -d`. Refresh again; the title, content, and duplicates should remain.
4. Confirm `data/app.db` exists on the host. This is the same file mounted at `/app/data/app.db` inside the container.

To back up, stop the app with `docker compose down`, copy the entire `data` directory to a safe location, then start it again. Stopping before copying avoids an inconsistent SQLite/WAL snapshot. Restore while stopped by replacing the contents of `data` with the backup and preserving writable permissions.

All durable storage belongs in `data`, which is excluded from Git and Docker image builds. This implementation authors text and formulas and uses synthetic sounds; it needs no uploaded or external audio assets and provides no asset-upload form.

SQLite uses rollback (`DELETE`) journaling with full synchronization for compatibility with Docker Desktop bind mounts. Run one deployment against a given data directory: stop a local development server before launching Docker against the same database. For a separate local preview, set `DATA_DIR` to a different directory. Do not manually delete `app.db-wal` from an older WAL database; it may contain saved activities that have not yet reached `app.db`.

## Local development and tests

Python 3.12 is recommended. From this directory:

```sh
python -m venv .venv
```

Activate with `.venv\Scripts\Activate.ps1` on Windows or `source .venv/bin/activate` on Linux/macOS, then:

```sh
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload --port 8000
python -m pytest -q
node tests/matching_state.test.mjs
```

Tests use isolated temporary databases and verify CRUD for all nine templates plus both maths modes, invalid input, HTML escaping, missing records, and persistence across separate Python processes. Set `DATA_DIR` to override the local `data` directory; Docker sets it to `/app/data`.

## API

Interactive API documentation is available at `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Dashboard |
| GET | `/editor?template=quiz` | New activity (`gameshow`, `open_box`, `flashcards`, `type_answer`, `unjumble`, `cloze`, `maths`, `match_up` also supported) |
| GET | `/editor?id=1` | Edit saved activity |
| GET | `/play/1` | Classroom player |
| GET | `/api/activities` | List saved activities |
| GET | `/api/activities/1` | Read one activity |
| POST | `/api/activities` | Create; returns 201 |
| PUT | `/api/activities/1` | Replace validated fields |
| POST | `/api/activities/1/duplicate` | Clone; returns 201 |
| DELETE | `/api/activities/1` | Delete; returns 204 |

Example create payload:

```json
{"title":"Planet explorers","template_type":"quiz","content_json":{"items":[{"prompt":"Which planet is red?","options":["Earth","Mars"],"correct":1}]}}
```

## Deployment notes

The application runs as a non-root container user. It deliberately has no authentication, so run it on a trusted teacher computer or classroom network. Port 8000 is exposed by Compose; use host firewall rules to control access. For internet-facing deployment, add authentication and TLS at a reverse proxy.

The app and database are self-hosted. As requested, Tailwind, fonts, Lucide, KaTeX, and confetti load from public CDNs and need internet access for the full visual experience. Custom CSS and game logic are local; sound effects use the Web Audio API with no audio downloads. For an air-gapped classroom, vendor those pinned browser libraries/fonts into `app/static` and update `base.html` before deployment. Audio and fullscreen are subject to browser gesture policies. Touch, keyboard, and pointer input are supported, with reduced-motion styles for users who request them.
