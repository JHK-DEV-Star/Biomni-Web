"""Tool execution endpoints — 3 endpoints (Phase A4)."""

from fastapi import APIRouter

from models.schemas import ExecuteCodeRequest, NodeManifest, ToolCallRequest
from services.tool_service import ToolService

router = APIRouter(prefix="/api", tags=["tools"])


def _get_tool_service() -> ToolService:
    return ToolService.get_instance()


@router.post("/tool_call")
async def tool_call(request: ToolCallRequest):
    """Execute a single tool by name."""
    svc = _get_tool_service()
    result = await svc.execute_tool(request.tool_name, request.arguments)
    return result


@router.post("/execute_code")
async def execute_code(request: ExecuteCodeRequest):
    """Direct code execution (debugging/testing)."""
    svc = _get_tool_service()
    result = await svc.execute_code(
        request.code,
        request.language,
        conv_id="__direct__",
        step_id="0",
    )
    return result


@router.get("/node-manifest", response_model=NodeManifest)
async def get_node_manifest():
    """Return tool schemas for frontend node manifest."""
    svc = _get_tool_service()
    schemas = svc.get_schemas(exclude_internal=True)
    return NodeManifest(tools=schemas)
