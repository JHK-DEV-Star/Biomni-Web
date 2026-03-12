"""WebSocket event types and message schema."""

from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any, Optional


class EventType(str, Enum):
    TOKEN = "token"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    STEP_START = "step_start"
    PLAN_COMPLETE = "plan_complete"
    DONE = "done"
    ERROR = "error"
    REFUSAL_EVENT = "refusal_event"


@dataclass
class WSMessage:
    type: str
    data: Any = None

    def to_dict(self) -> dict:
        return asdict(self)
