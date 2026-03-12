"""Custom tool definitions for aigen_server.

Provides BaseTool ABC and concrete tools:
  - CreatePlanTool  (ported from tools/plan/plan_tools.py)
  - CodeGenTool     (ported from tools/code/code_tools.py)
"""

import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger("aigen.tools")

MAX_CODE_FIX_ATTEMPTS = 3


# ═══════════════════════════════════════════
# Base classes
# ═══════════════════════════════════════════


@dataclass
class ToolParameter:
    """Tool parameter definition (mirrors tools/base.py ToolParameter)."""

    name: str
    type: str  # "string" | "number" | "boolean" | "array" | "object"
    description: str
    required: bool = True
    enum: Optional[List[str]] = None
    default: Any = None


class BaseTool(ABC):
    """Abstract base for all tools."""

    name: str = ""
    description: str = ""
    parameters: List[ToolParameter] = []

    def get_schema(self) -> Dict[str, Any]:
        """Return OpenAI function-calling compatible schema."""
        properties: Dict[str, Any] = {}
        required: List[str] = []

        for param in self.parameters:
            prop: Dict[str, Any] = {
                "type": param.type,
                "description": param.description,
            }
            if param.enum:
                prop["enum"] = param.enum
            properties[param.name] = prop

            if param.required:
                required.append(param.name)

        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                },
            },
        }

    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool (async)."""
        ...


# Internal tools excluded from user-facing prompts
INTERNAL_TOOLS = {"create_plan", "execute_step"}


# ═══════════════════════════════════════════
# Utility helpers (from code/code_tools.py)
# ═══════════════════════════════════════════


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _extract_file_paths(text: str) -> List[str]:
    """Extract /uploads/... file paths from text."""
    return list(set(re.findall(r"/uploads/[^\s,'\"\)\]]+", text)))


def _extract_missing_modules(stderr: str) -> List[str]:
    """Parse ModuleNotFoundError/ImportError to get module names."""
    patterns = [
        r"ModuleNotFoundError: No module named '([^']+)'",
        r"ImportError: No module named '([^']+)'",
    ]
    modules: set[str] = set()
    for pattern in patterns:
        for match in re.finditer(pattern, stderr):
            modules.add(match.group(1).split(".")[0])
    return sorted(modules)


# ═══════════════════════════════════════════
# CreatePlanTool
# ═══════════════════════════════════════════


class CreatePlanTool(BaseTool):
    """Create a structured plan (ported from plan/plan_tools.py)."""

    name = "create_plan"
    description = (
        "Creates a structured plan for research or analysis. "
        "Use when breaking down complex tasks into steps."
    )
    parameters = [
        ToolParameter(
            name="goal",
            type="string",
            description=(
                "Plan title as a concise noun phrase "
                "(e.g. 'CRISPR 스크린 실험 계획'). "
                "Do NOT use sentence endings like '합니다', '입니다'."
            ),
            required=True,
        ),
        ToolParameter(
            name="steps",
            type="array",
            description=(
                "Plan steps. Each step should have {name, description} format "
                "(tool is auto-selected at execution)"
            ),
            required=True,
        ),
    ]

    async def execute(
        self, goal: str = "", steps: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        steps = steps or []
        validated: List[Dict[str, Any]] = []
        for i, step in enumerate(steps):
            name = (step.get("name") or "").strip() or f"Step {i + 1}"
            description = step.get("description", "") or step.get("task", "")
            validated.append(
                {
                    "id": i + 1,
                    "name": name,
                    "description": description,
                    "status": "pending",
                }
            )

        return {
            "success": True,
            "tool": self.name,
            "result": {
                "goal": goal,
                "total_steps": len(validated),
                "steps": validated,
                "current_step": 0,
            },
        }


# ═══════════════════════════════════════════
# CodeGenTool
# ═══════════════════════════════════════════


class CodeGenTool(BaseTool):
    """Generate and execute code via LLM (ported from code/code_tools.py).

    Differences from original:
    - async execute()
    - Uses LLMService.get_llm_instance() instead of generate_with_llm()
    - Uses CodeExecutor instead of direct _execute_code_subprocess()
    """

    name = "code_gen"
    description = "Generate code based on task description. Supports Python and R."
    parameters = [
        ToolParameter(
            name="task",
            type="string",
            description="What the code should do (detailed description)",
            required=True,
        ),
        ToolParameter(
            name="language",
            type="string",
            description="Programming language (python or r)",
            required=False,
            default="python",
            enum=["python", "r"],
        ),
        ToolParameter(
            name="context",
            type="string",
            description="Additional context, requirements, or constraints",
            required=False,
            default="",
        ),
    ]

    def __init__(self, llm_service=None, code_executor=None):
        self._llm_service = llm_service
        self._code_executor = code_executor

    async def execute(
        self,
        task: str = "",
        language: str = "python",
        context: str = "",
        **kwargs,
    ) -> Dict[str, Any]:
        """Generate code, execute, and auto-fix up to MAX_CODE_FIX_ATTEMPTS times."""
        language = language.lower()
        if language not in ("python", "r"):
            return {
                "success": False,
                "error": f"Unsupported language: {language}. Only 'python' and 'r'.",
                "result": None,
            }

        if not task:
            task = kwargs.get("step_description", "") or kwargs.get("description", "")
            if not task:
                task = "Generate data analysis and visualization code."

        conv_id = kwargs.get("conv_id")
        step_id = kwargs.get("step_id", "0")

        # --- Build prompt and generate code ---
        system_prompt = await self._load_code_gen_system_prompt()

        prompt = f"Write {language} code to accomplish the following task:\n\n{task}"
        if context:
            prompt += f"\n\nAdditional context/requirements:\n{context}"
        prompt += (
            "\n\nOutput ONLY the code. No explanations, no markdown code blocks, "
            "just the raw code."
        )

        logger.info(f"[code_gen] Generating {language} code, prompt={len(prompt)}c")
        code = await self._generate_code(prompt, system_prompt)

        if not code:
            return {
                "success": False,
                "error": "LLM returned empty output",
                "result": None,
            }

        code = _strip_markdown_fences(code)
        if not code:
            return {
                "success": False,
                "error": "Generated output contained no usable code",
                "result": None,
            }

        logger.info(f"[code_gen] Generated {len(code)}c of {language}")

        # If no conv_id, just return code without executing
        if conv_id is None:
            return {
                "success": True,
                "result": {"language": language, "code": code, "task": task},
            }

        # --- Execute with auto-fix loop ---
        file_context = ""
        exec_result = None
        fix_attempts = 0

        for attempt in range(MAX_CODE_FIX_ATTEMPTS + 1):
            logger.info(
                f"[code_gen] Executing (attempt {attempt + 1}/"
                f"{MAX_CODE_FIX_ATTEMPTS + 1})"
            )
            exec_result = await self._code_executor.execute(
                code, language, conv_id, step_id
            )

            if exec_result.success or not exec_result.stderr.strip():
                fix_attempts = attempt
                logger.info(f"[code_gen] Success after {attempt} fix(es)")
                break

            logger.info(f"[code_gen] Error: {exec_result.stderr[:200]}")

            # On first failure: read file structures for better context
            if attempt == 0 and not file_context:
                file_paths = _extract_file_paths(task + " " + context)
                if file_paths:
                    file_context = await self._read_file_structure(
                        file_paths, conv_id, step_id
                    )
                    if file_context:
                        enhanced_prompt = (
                            f"Write {language} code to accomplish:\n\n{task}"
                        )
                        if context:
                            enhanced_prompt += f"\n\nAdditional context:\n{context}"
                        enhanced_prompt += (
                            f"\n\nACTUAL DATA STRUCTURE (read from files):"
                            f"\n{file_context}"
                            "\n\nUse these exact column names and data types."
                            "\n\nOutput ONLY the code."
                        )
                        new_code = await self._generate_code(
                            enhanced_prompt, system_prompt
                        )
                        if new_code:
                            new_code = _strip_markdown_fences(new_code)
                            if new_code:
                                code = new_code
                                logger.info(
                                    f"[code_gen] Regenerated with file context "
                                    f"({len(code)}c)"
                                )
                                continue

            # Request LLM fix
            if attempt < MAX_CODE_FIX_ATTEMPTS:
                fix_prompt = (
                    f"The following {language} code produced an error.\n\n"
                    f"--- CODE ---\n{code}\n--- END CODE ---\n\n"
                    f"--- ERROR ---\n{exec_result.stderr}\n--- END ERROR ---\n\n"
                )
                if file_context:
                    fix_prompt += (
                        f"--- ACTUAL DATA STRUCTURE ---\n{file_context}\n"
                        f"--- END ---\n\n"
                    )
                fix_prompt += (
                    "Fix the code so it runs without errors. "
                    "Output ONLY the corrected code. No explanations."
                )
                logger.info(
                    f"[code_gen] Requesting fix "
                    f"({attempt + 1}/{MAX_CODE_FIX_ATTEMPTS})"
                )
                fixed_code = await self._generate_code(fix_prompt, system_prompt)
                if fixed_code:
                    fixed_code = _strip_markdown_fences(fixed_code)
                    if fixed_code:
                        code = fixed_code
                        continue

                logger.info("[code_gen] Empty fix, stopping retry")
                fix_attempts = attempt + 1
                break
            else:
                fix_attempts = MAX_CODE_FIX_ATTEMPTS

        # --- Build result ---
        final_success = exec_result.success if exec_result else False
        result_dict: Dict[str, Any] = {
            "success": final_success,
            "result": {
                "language": language,
                "code": code,
                "task": task,
                "execution": {
                    "success": exec_result.success if exec_result else False,
                    "stdout": exec_result.stdout if exec_result else "",
                    "stderr": exec_result.stderr if exec_result else "",
                    "figures": exec_result.figures if exec_result else [],
                    "tables": exec_result.tables if exec_result else [],
                },
                "fix_attempts": fix_attempts,
            },
        }
        if not final_success and exec_result:
            missing = _extract_missing_modules(exec_result.stderr)
            if missing:
                result_dict["error"] = (
                    f"Missing module(s): {', '.join(missing)}. "
                    f"Please install: pip install {' '.join(missing)}"
                )
            else:
                result_dict["error"] = exec_result.stderr[:500]

        return result_dict

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _generate_code(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Invoke LLM via LLMService to generate code."""
        try:
            llm = await self._llm_service.get_llm_instance()
            messages = []
            if system_prompt:
                from langchain_core.messages import SystemMessage

                messages.append(SystemMessage(content=system_prompt))
            from langchain_core.messages import HumanMessage

            messages.append(HumanMessage(content=prompt))
            response = await llm.ainvoke(messages)
            return response.content if response else ""
        except Exception as e:
            logger.error(f"[code_gen] LLM generation failed: {e}")
            return ""

    async def _load_code_gen_system_prompt(self) -> Optional[str]:
        """Load CODE_GEN system prompt via prompt_builder."""
        try:
            from services.prompt_builder import PromptMode, build_prompt

            # Resolve token format from model registry for correct special tokens
            token_format = None
            if self._llm_service:
                try:
                    token_format = await self._llm_service.resolve_model_behavior()
                except Exception:
                    pass
            return build_prompt(PromptMode.CODE_GEN, token_format=token_format)
        except Exception:
            return None

    async def _read_file_structure(
        self, file_paths: List[str], conv_id: str, step_id: str
    ) -> str:
        """Execute code to read file headers/structure and return stdout.

        Ported from code/code_tools.py _read_file_structure().
        """
        snippets: List[str] = []
        for path in file_paths:
            ext = os.path.splitext(path)[1].lower()
            if ext in (".csv", ".tsv"):
                sep = repr("\t") if ext == ".tsv" else repr(",")
                snippets.append(
                    f"try:\n"
                    f"    import pandas as _pd\n"
                    f"    _df = _pd.read_csv({repr(path)}, sep={sep})\n"
                    f"    print(f'=== {path} ===')\n"
                    f"    print(f'Shape: {{_df.shape}}')\n"
                    f"    print(f'Columns: {{list(_df.columns)}}')\n"
                    f"    print(f'Dtypes:\\n{{_df.dtypes}}')\n"
                    f"    print(f'Head:\\n{{_df.head(3).to_string()}}')\n"
                    f"except Exception as _e:\n"
                    f"    print(f'Error reading {path}: {{_e}}')\n"
                )
            elif ext in (".xls", ".xlsx"):
                snippets.append(
                    f"try:\n"
                    f"    import pandas as _pd\n"
                    f"    _df = _pd.read_excel({repr(path)})\n"
                    f"    print(f'=== {path} ===')\n"
                    f"    print(f'Shape: {{_df.shape}}')\n"
                    f"    print(f'Columns: {{list(_df.columns)}}')\n"
                    f"    print(f'Dtypes:\\n{{_df.dtypes}}')\n"
                    f"    print(f'Head:\\n{{_df.head(3).to_string()}}')\n"
                    f"except Exception as _e:\n"
                    f"    print(f'Error reading {path}: {{_e}}')\n"
                )
            elif ext == ".json":
                snippets.append(
                    f"try:\n"
                    f"    import json as _json\n"
                    f"    with open({repr(path)}, 'r', encoding='utf-8') as _f:\n"
                    f"        _data = _json.load(_f)\n"
                    f"    print(f'=== {path} ===')\n"
                    f"    print(f'Type: {{type(_data).__name__}}')\n"
                    f"    if isinstance(_data, list):\n"
                    f"        print(f'Length: {{len(_data)}}')\n"
                    f"        if _data and isinstance(_data[0], dict):\n"
                    f"            print(f'Keys: {{list(_data[0].keys())}}')\n"
                    f"            print(f'Sample: {{_data[0]}}')\n"
                    f"    elif isinstance(_data, dict):\n"
                    f"        print(f'Keys: {{list(_data.keys())}}')\n"
                    f"        _sample = {{k: (str(v)[:100] if not isinstance(v, (dict,list)) else type(v).__name__) for k, v in list(_data.items())[:10]}}\n"
                    f"        print(f'Sample: {{_sample}}')\n"
                    f"except Exception as _e:\n"
                    f"    print(f'Error reading {path}: {{_e}}')\n"
                )
            else:
                snippets.append(
                    f"try:\n"
                    f"    with open({repr(path)}, 'r', encoding='utf-8', errors='replace') as _f:\n"
                    f"        _content = _f.read(2000)\n"
                    f"    print(f'=== {path} ===')\n"
                    f"    print(_content)\n"
                    f"except Exception as _e:\n"
                    f"    print(f'Error reading {path}: {{_e}}')\n"
                )

        if not snippets:
            return ""

        read_code = "\n".join(snippets)
        logger.info(f"[code_gen] Reading file structure for {len(file_paths)} file(s)")
        result = await self._code_executor.execute(
            read_code, "python", conv_id, step_id
        )
        stdout = result.stdout.strip()
        if stdout:
            logger.info(f"[code_gen] File structure read: {len(stdout)}c")
        return stdout
