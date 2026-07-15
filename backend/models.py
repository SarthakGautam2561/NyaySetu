"""Pydantic models for NyaySetu API request/response schemas."""

from pydantic import BaseModel, Field
from typing import Optional


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    language: str = Field(default="en")
    session_id: Optional[str] = None


class DocumentAnalysisRequest(BaseModel):
    language: str = Field(default="en")


class DraftRequest(BaseModel):
    draft_type: str = Field(..., description="Type: complaint, rti, consumer, notice, application")
    details: str = Field(..., min_length=10)
    language: str = Field(default="en")
    session_id: Optional[str] = None


class PathwayRequest(BaseModel):
    situation: str = Field(..., min_length=10)
    language: str = Field(default="en")
    session_id: Optional[str] = None


class RightsRequest(BaseModel):
    category: str = Field(..., description="Category: tenant, consumer, worker, women, family, digital, criminal, property")
    scenario: str = Field(default="")
    language: str = Field(default="en")
    session_id: Optional[str] = None


class IntakeRequest(BaseModel):
    text: str = Field(..., min_length=10)
    language: str = Field(default="en")
    session_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    model: str = ""
    version: str = "1.0.0"


class SessionCreateRequest(BaseModel):
    language: str = Field(default="en")


class SessionUpdateRequest(BaseModel):
    title: str = Field(default="", max_length=60)
    pinned: Optional[bool] = None
