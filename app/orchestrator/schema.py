from typing import List, Dict, Optional, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class RequestContext(BaseModel):
    """Encapsulates all context required for a request."""
    user_id: str
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    user_message: str
    context_data: Dict[str, Any] = Field(default_factory=dict)

    # Academic Context
    academic_level: Literal["S1", "S2", "S3"] = "S1"
    field_of_study: Optional[str] = None
    tone_preference: Literal["academic", "casual", "instructive", "persuasive", "didactic"] = "academic"


class Step(BaseModel):
    """A single step in the execution plan."""
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    tool: Optional[str] = None
    params: Dict[str, Any] = Field(default_factory=dict)
    status: Literal["pending", "running", "completed", "failed"] = "pending"
    result: Optional[Any] = None
    error: Optional[str] = None


class ExecutionPlan(BaseModel):
    """Structured plan for handling a user request."""
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    mode: str
    intent: str = "academic_assistance"
    requires_rag: bool = False
    requires_validation: bool = False
    degree_level: Literal["S1", "S2", "S3"] = "S1"
    tone_profile: str = "academic"
    max_tokens: int = 1200
    steps: List[Step] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["planned", "executing", "completed", "failed"] = "planned"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModeConfig(BaseModel):
    """Configuration for a specific mode."""
    mode_name: str
    description: str
    required_tools: List[str] = Field(default_factory=list)
    system_prompt_template: str
    validation_required: bool = False
    retrieval_required: bool = False
