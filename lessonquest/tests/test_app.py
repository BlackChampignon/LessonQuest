"""API, template validation, HTML safety, and real-process SQLite persistence."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile

import pytest

TEST_DATA = tempfile.TemporaryDirectory(prefix="lessonquest-tests-")
os.environ["DATA_DIR"] = TEST_DATA.name

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine
from sqlalchemy import text


@pytest.fixture
def client():
    with TestClient(app) as client:
        for activity in client.get("/api/activities").json():
            client.delete(f"/api/activities/{activity['id']}")
        yield client


CASES = [
    ("quiz", {"prompt": "Planet?", "options": ["Earth", "Mars"], "correct": 1}, "choice"),
    ("gameshow", {"prompt": "2+2?", "options": ["3", "4"], "correct": 1, "bonus": True}, "choice"),
    ("open_box", {"prompt": "Name an ocean", "answer": "Pacific"}, "choice"),
    ("flashcards", {"prompt": "Front", "back": "Back"}, "cards"),
    ("type_answer", {"prompt": "Ocean?", "answer": "Pacific", "aliases": ["Pacific Ocean"]}, "choice"),
    ("unjumble", {"sentence": "The Sun is a star"}, "choice"),
    ("cloze", {"sentence": "The [Sun] is a [star]."}, "choice"),
    ("maths", {"prompt": r"\frac{1}{2}+\frac{1}{2}", "options": ["1", "2"], "correct": 0}, "choice"),
    ("maths", {"prompt": r"\sqrt{16}", "back": "4"}, "cards"),
]


@pytest.mark.parametrize("kind,item,mode", CASES)
def test_every_template_crud(client, kind, item, mode):
    payload = {"title": "Classroom adventure", "template_type": kind, "content_json": {"items": [item], "mode": mode}}
    response = client.post("/api/activities", json=payload)
    assert response.status_code == 201, response.text
    saved = response.json()
    activity_id = saved["id"]
    assert client.get(f"/api/activities/{activity_id}").json() == saved
    assert client.get("/").status_code == 200
    assert client.get(f"/editor?id={activity_id}").status_code == 200
    assert client.get(f"/play/{activity_id}").status_code == 200
    payload["title"] = "Edited adventure"
    updated = client.put(f"/api/activities/{activity_id}", json=payload).json()
    assert updated["title"] == "Edited adventure"
    assert updated["created_at"] == saved["created_at"]
    assert updated["updated_at"] >= saved["updated_at"]
    duplicate = client.post(f"/api/activities/{activity_id}/duplicate").json()
    assert duplicate["id"] != activity_id
    assert duplicate["content_json"] == updated["content_json"]
    assert duplicate["title"] == "Edited adventure (copy)"
    assert client.delete(f"/api/activities/{activity_id}").status_code == 204
    assert client.get(f"/api/activities/{activity_id}").status_code == 404
    assert client.get(f"/api/activities/{duplicate['id']}").status_code == 200


@pytest.mark.parametrize("kind,item", [
    ("quiz", {"prompt": "Question", "options": ["one"], "correct": 0}),
    ("quiz", {"prompt": "Question", "options": ["one", "two"], "correct": 3}),
    ("quiz", {"prompt": "Question", "options": ["one", "ONE"], "correct": 0}),
    ("open_box", {"prompt": " "}),
    ("flashcards", {"prompt": "Front", "back": ""}),
    ("type_answer", {"prompt": "Question", "answer": " "}),
    ("unjumble", {"sentence": "one"}),
    ("cloze", {"sentence": "No missing words"}),
    ("cloze", {"sentence": "An [ ] empty blank"}),
    ("cloze", {"sentence": "A [valid] then [broken"}),
])
def test_invalid_content_rejected(client, kind, item):
    response = client.post("/api/activities", json={"title": "Test", "template_type": kind, "content_json": {"items": [item]}})
    assert response.status_code == 422
    assert client.get("/api/activities").json() == []


def test_limits_missing_routes_and_safe_html(client):
    payload = {"title": "<script>alert('title')</script>", "template_type": "open_box", "content_json": {"items": [{"prompt": "</script><script>alert('prompt')</script>"}]}}
    saved = client.post("/api/activities", json=payload).json()
    assert "&lt;script&gt;" in client.get("/").text
    player = client.get(f"/play/{saved['id']}").text
    assert "</script><script>alert('prompt')</script>" not in player
    assert "\\u003c" in player
    assert client.get("/editor?template=unknown").status_code == 400
    for url in ["/play/999999", "/editor?id=999999", "/api/activities/999999"]:
        assert client.get(url).status_code == 404
    payload["title"] = " "
    assert client.post("/api/activities", json=payload).status_code == 422
    payload["title"] = "Test"
    payload["content_json"]["items"] *= 101
    assert client.post("/api/activities", json=payload).status_code == 422
    assert client.get("/health").json() == {"status": "ok"}


def test_database_survives_process_restart(tmp_path):
    env = dict(os.environ, DATA_DIR=str(tmp_path))
    create = """
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as c:
    r=c.post('/api/activities',json={'title':'Survives restart','template_type':'open_box','content_json':{'items':[{'prompt':'Still here','answer':'Yes'}]}})
    assert r.status_code==201,r.text
"""
    read = """
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as c:
    items=c.get('/api/activities').json()
    assert len(items)==1 and items[0]['title']=='Survives restart'
    assert items[0]['content_json']['items'][0]['answer']=='Yes'
"""
    for script in [create, read]:
        result = subprocess.run([sys.executable, "-c", script], env=env, capture_output=True, text=True, cwd=Path(__file__).resolve().parents[1])
        assert result.returncode == 0, result.stderr
    assert (tmp_path / "app.db").exists()


def test_bind_mount_uses_rollback_journaling(client):
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA journal_mode")).scalar() == "delete"
        assert connection.execute(text("PRAGMA synchronous")).scalar() == 2
        assert connection.execute(text("PRAGMA foreign_keys")).scalar() == 1
