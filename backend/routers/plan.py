"""Plan management endpoints — 3 endpoints."""

import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.schemas import (
    AnalyzePlanRequest,
    ReplanRequest,
    StatusResponse,
    UpdatePlanAnalysisRequest,
)
from services.chat_handler import ChatHandler
from services.conversation_service import ConversationService
from services.llm_service import LLMService

logger = logging.getLogger("aigen.plan")
router = APIRouter(prefix="/api", tags=["plan"])

# ─── Analyze Plan System Prompt (ported from tools/analysis/analysis_tools.py) ───

ANALYZE_PLAN_SYSTEM_PROMPT = """You are a research plan analysis expert.
Provide detailed and clear explanations for the given research goal and each step.

Analysis considerations:
- Explain the purpose and importance of each step
- Include actual results for completed steps
- Describe current status for in-progress steps
- Explain expected results and methodology for pending steps
- Present overall research flow and direction

Output format (markdown):
## Research Goal
(Background and importance of the goal - 2-3 sentences)

## Overall Research Flow

### Step N: step_name (tool_name) [status]
(Purpose, method, and expected results for this step)
- If completed: Summary of actual results
- If in progress: Current work being performed
- If pending: Expected methodology

## Expected Results and Applications
(Final deliverables and application plans - 2-3 sentences)
"""


@router.post("/replan")
async def replan(request: ReplanRequest, db: AsyncSession = Depends(get_db)):
    """Replan — re-execute steps with modified plan (SSE streaming)."""
    handler = ChatHandler.get_instance()
    event_stream = handler.handle_replan(request, db)

    async def sse_generator():
        try:
            async for event in event_stream:
                payload = {"type": event.type, **event.data}
                yield f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"
        except Exception as e:
            logger.exception("Replan SSE error")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/update_plan_analysis", response_model=StatusResponse)
async def update_plan_analysis(
    request: UpdatePlanAnalysisRequest, db: AsyncSession = Depends(get_db)
):
    """Update analysis text for a plan step."""
    from uuid import UUID

    conv_svc = ConversationService(db)
    updated = await conv_svc.update_plan_analysis(
        UUID(request.conv_id), request.analysis
    )
    if updated:
        return StatusResponse(status="ok", message="Analysis updated")
    return StatusResponse(status="error", message="Could not update analysis")


@router.post("/analyze_plan")
async def analyze_plan(
    request: AnalyzePlanRequest, db: AsyncSession = Depends(get_db)
):
    """Generate LLM analysis for a completed plan.

    Ported from original tools/analysis/analysis_tools.py AnalyzePlanTool.
    """
    llm_service = LLMService.get_instance()

    # Build step info context (same format as original)
    steps_info = []
    for i, step in enumerate(request.steps):
        status = step.get("status", "pending")
        if i < request.current_step:
            status = "completed"
        elif i == request.current_step:
            status = "running"
        else:
            status = "pending"

        status_text = {
            "completed": "✓ Completed",
            "running": "● In Progress",
            "pending": "○ Pending",
        }.get(status, status)

        step_info = (
            f"Step {i + 1}: {step.get('name', 'Unknown')} "
            f"({step.get('tool', 'unknown')}) [{status_text}]"
        )
        step_info += f"\n  Description: {step.get('description', '')}"

        result = step.get("result")
        if result:
            if isinstance(result, dict):
                if result.get("title"):
                    step_info += f"\n  Result: {result['title']}"
                if result.get("details"):
                    details = result["details"][:3]
                    step_info += "\n  Details: " + ", ".join(
                        str(d) for d in details
                    )
            else:
                step_info += f"\n  Result: {str(result)[:200]}"

        steps_info.append(step_info)

    prompt = (
        f"Research Goal: {request.goal}\n\n"
        f"Research Steps:\n"
        + "\n".join(steps_info)
        + "\n\nPlease provide a detailed analysis and explanation of the above "
        "research plan. Include the purpose, method, and expected results of "
        "each step, and explain the overall research direction."
    )

    try:
        llm = await llm_service.get_llm_instance(db=db)
        messages = [
            SystemMessage(content=ANALYZE_PLAN_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]
        response = await llm.ainvoke(messages)
        analysis = response.content if response.content else ""
        return {"success": True, "analysis": analysis}
    except Exception as e:
        logger.exception("analyze_plan LLM call failed")
        return {"success": False, "error": str(e), "analysis": ""}
