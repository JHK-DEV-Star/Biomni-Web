"""Tool Service — central tool registration, execution, and parsing.

Singleton that owns:
  - Tool registry (BaseTool instances)
  - CodeExecutor instance
  - Parsing delegation (tool_parser module)
"""

import json
import logging
from typing import Any, Dict, List, Optional

from tools.code_executor import CodeExecutor
from tools.custom_tools import (
    BaseTool,
    CodeGenTool,
    CreatePlanTool,
    INTERNAL_TOOLS,
)
from tools.tool_parser import (
    ParseResult,
    detect_tool_call,
    format_tool_result_for_model,
    parse_tool_calls,
)

logger = logging.getLogger("aigen.tool_service")


class ToolService:
    """Singleton. Manages tool registration, schema generation, execution, parsing."""

    _instance: Optional["ToolService"] = None

    def __init__(self) -> None:
        self._tools: Dict[str, BaseTool] = {}
        self._code_executor = CodeExecutor()
        self._initialized = False

    @classmethod
    def get_instance(cls) -> "ToolService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ─── Initialization ───

    def initialize(self, llm_service: Any) -> None:
        """Register default tools. Called once at server startup."""
        if self._initialized:
            return

        # 1. CreatePlanTool (always registered)
        self.register_tool(CreatePlanTool())

        # 2. CodeGenTool (needs LLMService + CodeExecutor)
        self.register_tool(
            CodeGenTool(
                llm_service=llm_service,
                code_executor=self._code_executor,
            )
        )

        # 3. Future: register Biomni bio_tools here
        # self.register_tool(PubmedSearchTool(llm_service=llm_service))

        self._initialized = True
        logger.info(
            f"ToolService initialized with {len(self._tools)} tools: "
            f"{list(self._tools.keys())}"
        )

    # ─── Registration ───

    def register_tool(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        self._tools[tool.name] = tool
        logger.debug(f"Registered tool: {tool.name}")

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tools.get(name)

    # ─── Schema Generation ───

    def get_schemas(self, exclude_internal: bool = True) -> List[Dict[str, Any]]:
        """Return OpenAI function-calling schemas for registered tools."""
        return [
            t.get_schema()
            for t in self._tools.values()
            if not (exclude_internal and t.name in INTERNAL_TOOLS)
        ]

    def get_plan_schema(self) -> List[Dict[str, Any]]:
        """Return schema for create_plan only (plan creation mode)."""
        cp = self._tools.get("create_plan")
        return [cp.get_schema()] if cp else []

    def generate_tools_format(self) -> str:
        """Generate tool format documentation for prompt injection.

        Ported from tools/base.py generate_tools_format().
        """
        sections: List[str] = []
        for name, tool in self._tools.items():
            if name in INTERNAL_TOOLS:
                continue
            args: Dict[str, Any] = {}
            for p in tool.parameters:
                if p.default is not None:
                    args[p.name] = p.default
                elif p.type == "string":
                    args[p.name] = "..."
                elif p.type == "array":
                    args[p.name] = ["..."]
                elif p.type == "number":
                    args[p.name] = 0
                elif p.type == "object":
                    args[p.name] = {}
                elif p.type == "boolean":
                    args[p.name] = True
            section = (
                f"## {name}\n{tool.description}\n"
                f"[TOOL_CALLS]{name}[ARGS]"
                f"{json.dumps(args, ensure_ascii=False)}"
            )
            sections.append(section)
        return "\n\n".join(sections)

    def get_tool_schema(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Return OpenAI function-calling schema for a single tool."""
        tool = self._tools.get(tool_name)
        return tool.get_schema() if tool else None

    def list_tool_names(self, exclude_internal: bool = True) -> List[str]:
        """Return list of registered tool names."""
        return [
            name for name in self._tools
            if not (exclude_internal and name in INTERNAL_TOOLS)
        ]

    def generate_tools_brief(self) -> str:
        """Brief tool listing for tool selection phase: '- name: description'."""
        return "\n".join(
            f"- {n}: {t.description}"
            for n, t in self._tools.items()
            if n not in INTERNAL_TOOLS
        )

    def generate_tool_format(self, tool_name: str) -> str:
        """Generate format documentation for a single tool."""
        tool = self._tools.get(tool_name)
        if not tool:
            return ""
        args: Dict[str, Any] = {}
        for p in tool.parameters:
            if p.default is not None:
                args[p.name] = p.default
            elif p.type == "string":
                args[p.name] = "..."
            elif p.type == "array":
                args[p.name] = ["..."]
            elif p.type == "number":
                args[p.name] = 0
            elif p.type == "object":
                args[p.name] = {}
            elif p.type == "boolean":
                args[p.name] = True
        return (
            f"## {tool_name}\n{tool.description}\n"
            f"[TOOL_CALLS]{tool_name}[ARGS]"
            f"{json.dumps(args, ensure_ascii=False)}"
        )

    def generate_tools_description(self) -> str:
        """Simple tool listing: '- name: description' per tool."""
        return "\n".join(
            f"- {n}: {t.description}"
            for n, t in self._tools.items()
            if n not in INTERNAL_TOOLS
        )

    # ─── Execution ───

    async def execute_tool(
        self, tool_name: str, arguments: Dict[str, Any], **context: Any
    ) -> Dict[str, Any]:
        """Execute a registered tool.

        Args:
            tool_name: Name of the tool.
            arguments: Tool arguments from LLM output.
            **context: Additional context (conv_id, step_id, etc.)

        Returns:
            Tool result dict with at least 'success' key.
        """
        tool = self._tools.get(tool_name)
        if not tool:
            logger.warning(f"Unknown tool requested: {tool_name}")
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

        # Handle raw JSON fallback (when JSON parsing failed during extraction)
        if "raw" in arguments and len(arguments) == 1:
            raw_str = arguments["raw"]
            logger.debug(f"Tool {tool_name}: raw arg, attempting JSON extraction")
            try:
                start = raw_str.find("{")
                if start != -1:
                    depth = 0
                    for i, c in enumerate(raw_str[start:], start):
                        if c == "{":
                            depth += 1
                        elif c == "}":
                            depth -= 1
                        if depth == 0:
                            arguments = json.loads(raw_str[start : i + 1])
                            break
            except Exception:
                pass
            if "raw" in arguments and len(arguments) == 1:
                return {
                    "success": False,
                    "error": f"Failed to parse arguments for '{tool_name}'",
                }

        try:
            merged = {**arguments, **context}
            result = await tool.execute(**merged)
            return result
        except Exception as e:
            logger.exception(f"Tool execution error: {tool_name}")
            return {"success": False, "error": str(e)}

    async def execute_code(
        self, code: str, language: str, conv_id: str, step_id: str
    ) -> Dict[str, Any]:
        """Direct code execution (for native_execute mode, bypasses code_gen)."""
        result = await self._code_executor.execute(code, language, conv_id, step_id)
        return {
            "success": result.success,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "figures": result.figures,
            "tables": result.tables,
        }

    # ─── Parsing (delegated to tool_parser module) ───

    def parse_llm_output(
        self, text: str, token_format: Optional[Dict[str, Any]] = None
    ) -> ParseResult:
        """Parse LLM output for tool calls."""
        return parse_tool_calls(text, token_format)

    def has_tool_call(
        self, text: str, token_format: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Quick check: does text contain a tool call?"""
        return detect_tool_call(text, token_format)

    def format_result(
        self,
        tool_name: str,
        result: Dict[str, Any],
        token_format: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Format tool result for LLM context injection."""
        return format_tool_result_for_model(tool_name, result, token_format)

    # ─── Properties ───

    @property
    def code_executor(self) -> CodeExecutor:
        """Expose CodeExecutor for direct use (e.g., by ChatHandler)."""
        return self._code_executor
