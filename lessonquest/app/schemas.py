import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TemplateType = Literal["quiz", "gameshow", "open_box", "flashcards", "type_answer", "unjumble", "cloze", "maths"]


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    prompt: str = Field(default="", max_length=4000)
    options: list[str] = Field(default_factory=list, max_length=4)
    correct: int = Field(default=0, ge=0, le=3)
    answer: str = Field(default="", max_length=2000)
    aliases: list[str] = Field(default_factory=list, max_length=20)
    back: str = Field(default="", max_length=4000)
    sentence: str = Field(default="", max_length=4000)
    bonus: bool = False

    @field_validator("options", "aliases")
    @classmethod
    def clean_strings(cls, values):
        if any(not value.strip() or len(value) > 1000 for value in values):
            raise ValueError("Answers must be nonempty and at most 1000 characters.")
        return [value.strip() for value in values]


class Content(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[Item] = Field(min_length=1, max_length=100)
    mode: Literal["choice", "cards"] = "choice"
    time_limit: int = Field(default=30, ge=10, le=120)


class ActivityWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=160)
    template_type: TemplateType
    content_json: Content

    @model_validator(mode="after")
    def check_template_content(self):
        kind = self.template_type
        for i, item in enumerate(self.content_json.items, 1):
            error = None
            if kind in ("quiz", "gameshow") or (kind == "maths" and self.content_json.mode == "choice"):
                if not item.prompt or not 2 <= len(item.options) <= 4 or item.correct >= len(item.options):
                    error = "A question needs a prompt, 2–4 choices, and a valid correct choice."
                elif len({option.casefold() for option in item.options}) != len(item.options):
                    error = "Choices must be distinct."
            elif kind in ("flashcards", "maths"):
                if not item.prompt or not item.back:
                    error = "A card needs a front and a back."
            elif kind == "open_box":
                if not item.prompt:
                    error = "A box needs a challenge."
            elif kind == "type_answer":
                if not item.prompt or not item.answer:
                    error = "Enter a question and its answer."
            elif kind == "unjumble":
                if len(item.sentence.split()) < 2:
                    error = "Enter at least two words or space-separated maths tokens."
            elif kind == "cloze":
                blanks = re.findall(r"\[([^\[\]]+)\]", item.sentence)
                if not blanks or any(not word.strip() for word in blanks):
                    error = "Mark at least one nonempty blank using [word]."
                elif "[" in re.sub(r"\[([^\[\]]+)\]", "", item.sentence) or "]" in re.sub(r"\[([^\[\]]+)\]", "", item.sentence):
                    error = "Every blank must use matching square brackets."
            if error:
                raise ValueError(f"Item {i}: {error}")
        return self


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    template_type: str
    content_json: dict
    created_at: datetime
    updated_at: datetime
