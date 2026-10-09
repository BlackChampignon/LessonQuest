from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_session
from .models import Activity
from .schemas import ActivityRead, ActivityWrite

ROOT = Path(__file__).resolve().parent
TEMPLATES = {
    "quiz": {"name": "Quiz", "icon": "circle-help", "color": "violet", "description": "Big questions. Brilliant discoveries."},
    "gameshow": {"name": "Gameshow Quiz", "icon": "trophy", "color": "amber", "description": "Beat the clock and steal the spotlight."},
    "open_box": {"name": "Open the Box", "icon": "package-open", "color": "coral", "description": "A little mystery behind every box."},
    "flashcards": {"name": "Flash Cards", "icon": "layers", "color": "sky", "description": "Flip it. Learn it. Remember it."},
    "type_answer": {"name": "Type the Answer", "icon": "keyboard", "color": "mint", "description": "Put your knowledge into words."},
    "unjumble": {"name": "Unjumble", "icon": "shuffle", "color": "pink", "description": "Piece together the perfect sentence."},
    "cloze": {"name": "Complete the Sentence", "icon": "text-cursor-input", "color": "indigo", "description": "Find the missing pieces."},
    "maths": {"name": "Maths Generator", "icon": "sigma", "color": "teal", "description": "Make numbers your superpower."},
    "match_up": {"name": "Match Up", "icon": "git-compare-arrows", "color": "sky", "description": "Connect questions to their perfect answers."},
}


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(title="LessonQuest", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
templates = Jinja2Templates(directory=ROOT / "templates")
templates.env.globals["activity_templates"] = TEMPLATES


def find_activity(session, activity_id):
    activity = session.get(Activity, activity_id)
    if activity is None:
        raise HTTPException(404, "Activity not found")
    return activity


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "same-origin"
    return response


@app.get("/health")
def health(session: Session = Depends(get_session)):
    session.execute(select(Activity.id).limit(1))
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, session: Session = Depends(get_session)):
    activities = session.scalars(select(Activity).order_by(Activity.updated_at.desc())).all()
    return templates.TemplateResponse(request=request, name="dashboard.html", context={"activities": activities})


@app.get("/editor", response_class=HTMLResponse)
def editor(request: Request, template: str = "quiz", id: int | None = None, session: Session = Depends(get_session)):
    activity = find_activity(session, id) if id is not None else None
    kind = activity.template_type if activity else template
    if kind not in TEMPLATES:
        raise HTTPException(400, "Unknown activity template")
    saved = ActivityRead.model_validate(activity).model_dump(mode="json") if activity else None
    return templates.TemplateResponse(request=request, name="editor.html", context={"kind": kind, "activity": saved})


@app.get("/play/{activity_id}", response_class=HTMLResponse)
def player(request: Request, activity_id: int, session: Session = Depends(get_session)):
    activity = ActivityRead.model_validate(find_activity(session, activity_id)).model_dump(mode="json")
    return templates.TemplateResponse(request=request, name="player.html", context={"activity": activity})


@app.get("/api/activities", response_model=list[ActivityRead])
def list_activities(session: Session = Depends(get_session)):
    return session.scalars(select(Activity).order_by(Activity.updated_at.desc())).all()


@app.get("/api/activities/{activity_id}", response_model=ActivityRead)
def get_activity(activity_id: int, session: Session = Depends(get_session)):
    return find_activity(session, activity_id)


@app.post("/api/activities", response_model=ActivityRead, status_code=201)
def create_activity(payload: ActivityWrite, session: Session = Depends(get_session)):
    activity = Activity(**payload.model_dump())
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@app.put("/api/activities/{activity_id}", response_model=ActivityRead)
def update_activity(activity_id: int, payload: ActivityWrite, session: Session = Depends(get_session)):
    activity = find_activity(session, activity_id)
    for key, value in payload.model_dump().items():
        setattr(activity, key, value)
    session.commit()
    session.refresh(activity)
    return activity


@app.post("/api/activities/{activity_id}/duplicate", response_model=ActivityRead, status_code=201)
def duplicate_activity(activity_id: int, session: Session = Depends(get_session)):
    original = find_activity(session, activity_id)
    copy = Activity(title=original.title[:153] + " (copy)", template_type=original.template_type, content_json=original.content_json)
    session.add(copy)
    session.commit()
    session.refresh(copy)
    return copy


@app.delete("/api/activities/{activity_id}", status_code=204)
def delete_activity(activity_id: int, session: Session = Depends(get_session)):
    session.delete(find_activity(session, activity_id))
    session.commit()
    return Response(status_code=204)
