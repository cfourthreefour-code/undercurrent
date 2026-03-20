"""Data models for graph nodes and edges."""

from datetime import datetime

from pydantic import BaseModel


class PersonNode(BaseModel):
    email: str
    id: str  # normalized email (same as email, kept for compatibility)
    name: str  # display name
    total_sent: int = 0
    total_received: int = 0
    department: str | None = None


class CommunicationEdge(BaseModel):
    source: str  # sender
    target: str  # recipient
    email_count: int = 0
    weight: float = 0.0  # composite score
    first_email: datetime | None = None
    last_email: datetime | None = None
    avg_response_time: float | None = None  # hours
    subjects: list[str] = []
