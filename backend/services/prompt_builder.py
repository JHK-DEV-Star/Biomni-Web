"""Prompt builder — decomposes Biomni's monolithic _generate_system_prompt() into composable sections.

Biomni A1._generate_system_prompt() builds one giant prompt with everything mixed in.
Here we split it into labeled sections so each mode (full, plan, code_gen, tool_select)
can pick only the sections it needs.

Sections (from A1._generate_system_prompt):
  [A] ROLE        — "You are Aigen R0..." identity
  [B] PLAN        — plan checklist format, step tracking rules
  [C] CODE_EXEC   — execute/observation/solution tags, R/Bash markers, code quality rules
  [D] PROTOCOL    — protocol generation instructions
  [E] SELF_CRITIC — self-critic feedback handling
  [F] CUSTOM_RES  — custom tools/data/software/know-how (dynamic)
  [G] ENV_RES     — function dictionary, data lake, software library (dynamic)

Mode → Sections mapping:
  full        (step execution)  : A + B + C + D + E + F + G
  plan        (plan generation) : A + B + G(subset)
  code_gen    (code generation) : A + C + G
  analyze     (plan analysis)   : standalone (Korean)

Token parameterization:
  All special tokens (think, execute, observation, solution) are derived from
  the `token_format` dict (populated from model_registry.yaml via behavior).
  Defaults match biomni-r0-32b / cloud model format (<execute>, <think>, etc.).
"""

from enum import Enum
from typing import Any, Dict, List, Optional


class PromptMode(str, Enum):
    FULL = "full"              # Step execution: A + B + C + D + E + F + G
    AGENT = "agent"            # Direct chat (no plan): A + C + D + E + F + G
    PLAN = "plan"
    CODE_GEN = "code_gen"
    ANALYZE = "analyze"


# ═══════════════════════════════════════════
# Token helpers
# ═══════════════════════════════════════════

def _closing_tag(open_tag: str) -> str:
    """Derive closing tag from opening tag.

    Examples:
        <execute>  → </execute>
        [EXECUTE]  → [/EXECUTE]
        [THINK]    → [/THINK]
    """
    if not open_tag:
        return ""
    if open_tag.startswith("["):
        return open_tag.replace("[", "[/", 1)
    elif open_tag.startswith("<"):
        return open_tag.replace("<", "</", 1)
    return open_tag


# ═══════════════════════════════════════════
# Section builders (token-parameterized)
# ═══════════════════════════════════════════

# ─── Section [A]: Role ───

_ROLE_BASE = """\
You are Aigen R0, helpful biomedical assistant assigned with the task of problem-solving.
You follow these instructions in all languages, and always respond to the user in the language they use or request.
To achieve this, you will be using an interactive coding environment equipped with a variety of tool functions, data, and softwares to assist you throughout the process."""


def _build_role_section(token_format: Optional[Dict] = None) -> str:
    """Build SECTION_ROLE with optional think-tag support."""
    tf = token_format or {}
    think_fmt = tf.get("think_format")

    if think_fmt:
        think_close = _closing_tag(think_fmt)
        return _ROLE_BASE + f"""

You may use {think_fmt}...{think_close} to reason step by step before responding. After thinking, provide your response."""
    return _ROLE_BASE


# Keep legacy constant for backward compatibility (settings API, etc.)
SECTION_ROLE = _ROLE_BASE


# ─── Section [B]: Plan rules ───

SECTION_PLAN = """
Given a task, make a plan first. The plan should be a numbered list of steps that you will take to solve the task. Be specific and detailed.
Format your plan as a checklist with empty checkboxes like this:
1. [ ] First step
2. [ ] Second step
3. [ ] Third step

Follow the plan step by step. After completing each step, update the checklist by replacing the empty checkbox with a checkmark:
1. [✓] First step (completed)
2. [ ] Second step
3. [ ] Third step

If a step fails or needs modification, mark it with an X and explain why:
1. [✓] First step (completed)
2. [✗] Second step (failed because...)
3. [ ] Modified second step
4. [ ] Third step

Always show the updated plan after each step so the user can track progress.

At each turn, you should first provide your thinking and reasoning given the conversation history."""


# ─── Section [B2]: Plan creation system prompt (structured output) ───
# Forces LLM to output [TOOL_CALLS]create_plan[ARGS]{JSON} directly.
# Ported from original prompts/PLAN_SYSTEM_PROMPT.txt

SECTION_PLAN_SYSTEM = """You are a research planning assistant. Create a systematic research plan following the scientific method.

# OUTPUT FORMAT

[TOOL_CALLS]create_plan[ARGS]{"goal": "...", "steps": [{"name": "...", "description": "..."}]}

# RESEARCH METHODOLOGY

Every plan MUST follow this sequential framework:
1. Literature Review — collect and analyze existing research
2. Problem Definition — define specific research questions and hypotheses
3. Methodology Design — select appropriate methods, tools, and protocols
4. Data Collection — gather experimental data or samples
5. Data Analysis — process, analyze, and interpret results
6. Conclusion — draw conclusions and identify implications

Adapt these phases to the specific research topic. Each step must be DISTINCT with no overlap.
Write step names and descriptions in Korean.

# RULES

- goal: concise noun phrase (NOT a sentence)
- steps: array of {name, description} — no other fields
- 3-10 steps per plan (adjust based on task complexity)
- No final summary step (auto-generated)
- Output ONLY the [TOOL_CALLS] line, nothing else

# EXAMPLE

[TOOL_CALLS]create_plan[ARGS]{"goal": "CRISPR 스크린 기반 T세포 고갈 조절 유전자 식별", "steps": [{"name": "문헌 조사", "description": "T세포 고갈 메커니즘과 주요 조절 인자에 관한 최신 문헌을 조사하고 핵심 경로를 정리합니다"}, {"name": "후보 유전자 선정", "description": "문헌에서 도출된 T세포 고갈 관련 후보 유전자 목록을 작성하고 우선순위를 매깁니다"}, {"name": "gRNA 라이브러리 설계", "description": "선정된 후보 유전자를 타겟하는 gRNA 서열을 설계하고 CRISPR 라이브러리를 구성합니다"}, {"name": "실험 조건 최적화", "description": "사용할 세포주 선택, 형질전환 효율 검증, 선별 조건 등 실험 파라미터를 최적화합니다"}, {"name": "스크린 실행 및 시퀀싱", "description": "최적화된 조건으로 CRISPR 스크린을 실행하고 차세대 시퀀싱(NGS)을 수행합니다"}, {"name": "결과 분석 및 검증", "description": "시퀀싱 데이터에서 유전자별 enrichment/depletion을 통계 분석하고 후보 유전자를 검증합니다"}]}"""


# ─── Section [C]: Code execution rules ───

def _build_code_exec_section(token_format: Optional[Dict] = None) -> str:
    """Build SECTION_CODE_EXEC with model-specific tokens."""
    tf = token_format or {}
    exec_open = tf.get("code_execute_format", "<execute>")
    exec_close = _closing_tag(exec_open)
    obs_open = tf.get("code_result_format", "<observation>")
    obs_close = _closing_tag(obs_open)
    sol_fmt = tf.get("solution_format")

    # Build solution option if the model supports it
    sol_section = ""
    sol_tag_ref = ""
    if sol_fmt:
        sol_close = _closing_tag(sol_fmt)
        sol_section = f"""
2) When you think it is ready, directly provide a solution that adheres to the required format for the given task to the user. Your solution should be enclosed using "{sol_fmt}" tag, for example: The answer is {sol_fmt} A {sol_close}. IMPORTANT: You must end the solution block with {sol_close} tag."""
        sol_tag_ref = f" or {sol_fmt}"

    options_text = "two options" if sol_fmt else "one option"

    return f"""
After that, you have {options_text}:

1) Interact with a programming environment and receive the corresponding output within {obs_open}{obs_close}. Your code should be enclosed using "{exec_open}" tag, for example: {exec_open} print("Hello World!") {exec_close}. IMPORTANT: You must end the code block with {exec_close} tag.
   - For Python code (default): {exec_open} print("Hello World!") {exec_close}
   - For R code: {exec_open} #!R\\nlibrary(ggplot2)\\nprint("Hello from R") {exec_close}
   - For Bash scripts and commands: {exec_open} #!BASH\\necho "Hello from Bash"\\nls -la {exec_close}
   - For CLI softwares, use Bash scripts.
{sol_section}

You have many chances to interact with the environment to receive the observation. So you can decompose your code into multiple steps.
Don't overcomplicate the code. Keep it simple and easy to understand.
When writing the code, please print out the steps and results in a clear and concise manner, like a research log.
When calling the existing python functions in the function dictionary, YOU MUST SAVE THE OUTPUT and PRINT OUT the result.
For example, result = understand_scRNA(XXX) print(result)
Otherwise the system will not be able to know what has been done.

For R code, use the #!R marker at the beginning of your code block to indicate it's R code.
For Bash scripts and commands, use the #!BASH marker in your execute block for both simple commands and multi-line scripts with variables, loops, conditionals, loops, and other Bash features.

In each response, you must include EITHER {exec_open}{sol_tag_ref} tag. Not both at the same time. Do not respond with messages without any tags. No empty messages."""


# Keep legacy constant for backward compatibility
SECTION_CODE_EXEC = _build_code_exec_section()


# ─── Section [C-extra]: Code gen subprocess environment (for code_gen mode only) ───

SECTION_CODE_GEN_ENV = """
# EXECUTION ENVIRONMENT
- Your code runs in an **isolated subprocess** with NO shared memory.
- You cannot access variables from previous steps directly.
- A `results` dict is pre-loaded with previous step results, keyed by step number (int).
  Example: `results[1]` contains step 1's output (dict with keys like 'title', 'details', 'summary', etc.)
- A `_data_dir` variable contains the output directory path (string).
- matplotlib is pre-imported and `plt.show()` is patched to auto-save figures.
- The working directory is set to the output directory.

# RULES
- Only generate Python or R code
- Output ONLY executable code, no markdown blocks
- ALWAYS include top-level execution code. If you define functions, call them at the module level.
  Do NOT define a `main()` function without calling it. Do NOT use `if __name__ == '__main__':` guards.
  The code runs as a standalone script, so all functions must be explicitly invoked.
- ALWAYS call `plt.show()` after creating any matplotlib/seaborn figure (do NOT rely on plt.savefig alone)
- ALWAYS use `print()` to display important results, summaries, and computed values
- Use standard libraries: pandas, numpy, scipy, matplotlib, seaborn
- For bioinformatics: use biopython when appropriate

# ERROR HANDLING
- NEVER use bare `except:` or `except Exception: pass` to silence errors
- Only catch specific, expected exceptions (e.g., `except FileNotFoundError:`)
- Let unexpected errors propagate so they can be diagnosed and fixed
- Do NOT wrap entire scripts in try-except blocks

# DATA ACCESS
- Use the `results` dict to access data from previous plan steps
- If uploaded data files are referenced, read them with pandas (e.g., `pd.read_csv('/uploads/file.csv')`)
- If specific data is not available, generate realistic synthetic/sample data and clearly label it as such
- Print the data shape and column names when loading data files

# CODE QUALITY
- Add docstrings for functions
- Use meaningful variable names
- Print a summary of key findings at the end"""


# ─── Section [D]: Protocol generation ───

SECTION_PROTOCOL = """
PROTOCOL GENERATION:
If the user requests an experimental protocol, use search_protocols(), advanced_web_search_claude(), list_local_protocols(), and read_local_protocol() to generate an accurate protocol. Include details such as reagents (with catalog numbers if available), equipment specifications, replicate requirements, error handling, and troubleshooting - but ONLY include information found in these resources. Do not make up specifications, catalog numbers, or equipment details. Prioritize accuracy over completeness."""


# ─── Section [E]: Self-critic ───

SECTION_SELF_CRITIC = """
You may or may not receive feedbacks from human. If so, address the feedbacks by following the same procedure of multiple rounds of thinking, execution, and then coming up with a new solution."""


# ─── Section: code_gen tool guide (for use_code_gen models) ───

SECTION_CODE_GEN_GUIDE = """\

# HOW TO USE code_gen

code_gen generates and executes code in a sandboxed environment. You describe WHAT the code should do in the `task` argument — another LLM will write and run the actual code.

## TASK ARGUMENT GUIDELINES

Write a detailed, specific task description. Include:
- What data to load or generate
- What analysis/processing to perform
- What to print or visualize
- Expected output format

Good example:
[TOOL_CALLS]code_gen[ARGS]{{"task": "Load the CSV file from /uploads/gene_expression.csv using pandas. Calculate mean expression per gene. Create a bar plot of the top 10 genes by mean expression. Print the top 10 gene names and values.", "language": "python"}}

Bad example:
[TOOL_CALLS]code_gen[ARGS]{{"task": "analyze data", "language": "python"}}

## EXECUTION ENVIRONMENT

- Code runs in an isolated subprocess with matplotlib, pandas, numpy, scipy, seaborn pre-installed
- Previous step results are available via `results` dict (keyed by step number)
- `plt.show()` auto-saves figures
- Default language: python. Use "r" for R code.

## RULES

- Put ALL details in the `task` field — the code generator only sees your task description
- For multi-part analysis, describe all parts in one task
- Always request printing of key results and summaries"""


# ─── Section: Plan-only creation rules (structured tool call output) ───

def _build_plan_creation_section(token_format: Optional[Dict] = None) -> str:
    """Build SECTION_PLAN_CREATION with model-specific think tags."""
    tf = token_format or {}
    think_fmt = tf.get("think_format", "<think>")
    think_close = _closing_tag(think_fmt)

    return f"""
You create research plans. Think carefully, then output a create_plan tool call.

# OUTPUT FORMAT

[TOOL_CALLS]create_plan[ARGS]{{"goal": "...", "steps": [...]}}

# GOAL FORMAT

- Concise noun phrase (title style), NOT a full sentence
- Do NOT end with verb forms like "합니다", "입니다"
- Example: "T세포 고갈 조절 유전자 식별을 위한 CRISPR 스크린 실험 계획"

# STEP FORMAT

Each step has ONLY "name" and "description" fields:
- name: 한글 단계 이름 (예: "관련 논문 검색")
- description: 단계 설명

Do NOT include "tool", "args", or "step" fields.
Do NOT include a final summary/report step.

# COMPLETE EXAMPLE

{think_fmt}
사용자가 CRISPR 스크린 실험 계획을 요청했다. 연구 배경, 실험 설계, 유전자 목록, RNA 설계, 제어 구축, 데이터 수집, 분석 단계로 나눠야 한다.
{think_close}
[TOOL_CALLS]create_plan[ARGS]{{"goal": "T세포 고갈 관련 유전자 식별을 위한 CRISPR 스크린 실험 계획", "steps": [{{"name": "연구 배경 및 문제 정의", "description": "T세포 고갈 관련 문헌을 조사하고 연구 목표를 구체화합니다"}}, {{"name": "실험 설계 기본 설정", "description": "CRISPR 라이브러리 선택 및 스크리닝 전략을 수립합니다"}}, {{"name": "유전자 목록 구성", "description": "타겟 유전자 후보를 선별하고 목록을 작성합니다"}}]}}

# RULES

- Output ONLY the tool call (after optional {think_fmt} block)
- MUST start with [TOOL_CALLS], not [ARGS]
- Each step MUST have name and description in Korean"""


# Keep legacy constant for backward compatibility
SECTION_PLAN_CREATION = _build_plan_creation_section()


# ─── Section: Analyze plan ───

SECTION_ANALYZE = """\
당신은 연구 계획 분석 전문가입니다.
주어진 연구 목표와 각 단계에 대해 자세하고 명확한 설명을 제공하세요.

분석 시 고려사항:
- 각 단계의 목적과 중요성을 설명
- 완료된 단계는 실제 결과를 포함
- 진행 중인 단계는 현재 상태 설명
- 대기 중인 단계는 예상 결과와 방법론 설명
- 전체적인 연구 흐름과 방향성 제시

출력 형식 (마크다운):

## 연구 목표
(목표에 대한 배경과 중요성 설명 - 2-3문장)

## 전체 연구 흐름

### Step N: step_name (tool_name) [상태]
(이 단계의 목적, 방법, 기대 결과)
- 완료된 경우: 실제 결과 요약
- 진행 중: 현재 수행 중인 작업
- 대기: 예상 방법론

## 예상 결과 및 활용
(최종 결과물과 활용 방안 - 2-3문장)"""


# ─── Section [F]: Custom resources (dynamic) ───

def _build_custom_resources_section(
    custom_tools: Optional[List[str]] = None,
    custom_data: Optional[List[str]] = None,
    custom_software: Optional[List[str]] = None,
    know_how_docs: Optional[List[str]] = None,
) -> str:
    """Build the custom resources section if any custom resources are provided."""
    parts = []

    if not any([custom_tools, custom_data, custom_software, know_how_docs]):
        return ""

    parts.append("""
PRIORITY CUSTOM RESOURCES
===============================
IMPORTANT: The following custom resources have been specifically added for your use.
    PRIORITIZE using these resources as they are directly relevant to your task.
    Always consider these FIRST and in the meantime using default resources.
""")

    if know_how_docs:
        docs_text = "\n\n".join(know_how_docs)
        parts.append(f"""
📚 KNOW-HOW DOCUMENTS (BEST PRACTICES & PROTOCOLS - ALREADY LOADED):
{docs_text}

IMPORTANT: These documents are ALREADY AVAILABLE in your context. You do NOT need to
retrieve them or "review" them as a separate step. You can DIRECTLY reference and use
the information from these documents to answer questions, provide protocols, suggest
parameters, and offer troubleshooting guidance.
""")

    if custom_tools:
        parts.append(f"""
🔧 CUSTOM TOOLS (USE THESE FIRST):
{chr(10).join(custom_tools)}
""")

    if custom_data:
        parts.append(f"""
📊 CUSTOM DATA (PRIORITIZE THESE DATASETS):
{chr(10).join(custom_data)}
""")

    if custom_software:
        parts.append(f"""
⚙️ CUSTOM SOFTWARE (USE THESE LIBRARIES):
{chr(10).join(custom_software)}
""")

    parts.append("===============================\n")
    return "".join(parts)


# ─── Section [G]: Environment resources (dynamic) ───

def _build_env_resources_section(
    tool_desc: str = "",
    data_lake_path: str = "",
    data_lake_content: str = "",
    library_content: str = "",
    is_retrieval: bool = False,
) -> str:
    """Build the environment resources section with dynamic content."""
    if is_retrieval:
        function_intro = "Based on your query, I've identified the following most relevant functions that you can use in your code:"
        data_lake_intro = "Based on your query, I've identified the following most relevant datasets:"
        library_intro = "Based on your query, I've identified the following most relevant libraries that you can use:"
        import_instruction = ("IMPORTANT: When using any function, you MUST first import it from its exact module as listed in the dictionary.\n"
                              "DO NOT import functions from 'biomni_data'. 'biomni_data' is a directory for datasets, not a python module.\n"
                              "For example: from [module_name] import [function_name]")
    else:
        function_intro = "In your code, you will need to import the function location using the following dictionary of functions:"
        data_lake_intro = "You can write code to understand the data, process and utilize it for the task. Here is the list of datasets:"
        library_intro = "The environment supports a list of libraries that can be directly used. Do not forget the import statement:"
        import_instruction = "IMPORTANT: DO NOT import functions from 'biomni_data'. It is a local directory, not a python module."

    return f"""

Environment Resources:

- Function Dictionary:
{function_intro}
---
{tool_desc}
---

{import_instruction}

- Biological data lake
You can access a biological data lake at the following path: {data_lake_path}.
{data_lake_intro}
Each item is listed with its description to help you understand its contents.
----
{data_lake_content}
----

- Software Library:
{library_intro}
Each library is listed with its description to help you understand its functionality.
----
{library_content}
----

- Note on using R packages and Bash scripts:
  - R packages: Use subprocess.run(['Rscript', '-e', 'your R code here']) in Python, or use the #!R marker in your execute block.
  - Bash scripts and commands: Use the #!BASH marker in your execute block for both simple commands and complex shell scripts with variables, loops, conditionals, etc.
"""


# ═══════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════

def build_prompt(
    mode: PromptMode,
    *,
    # Token format (from model_registry.yaml via resolve_model_behavior())
    token_format: Optional[Dict[str, Any]] = None,
    # Dynamic content (from A1 instance at runtime)
    tool_desc: str = "",
    data_lake_path: str = "",
    data_lake_content: str = "",
    library_content: str = "",
    is_retrieval: bool = False,
    self_critic: bool = False,
    # Custom resources
    custom_tools: Optional[List[str]] = None,
    custom_data: Optional[List[str]] = None,
    custom_software: Optional[List[str]] = None,
    know_how_docs: Optional[List[str]] = None,
    # Code gen specific
    file_schemas: str = "",
) -> str:
    """Build a system prompt for the given mode.

    Args:
        mode: Which prompt variant to build.
        token_format: Model-specific token format dict from resolve_model_behavior().
            Contains keys like think_format, code_execute_format, code_result_format,
            solution_format, tool_calls_format. Used to parameterize special tokens
            in the prompt sections. Defaults produce biomni-r0-32b / cloud format.
        tool_desc: Formatted tool descriptions from A1.module2api.
        data_lake_path: Path to data lake directory.
        data_lake_content: Formatted data lake items.
        library_content: Formatted library items.
        is_retrieval: Whether this is post-retrieval (affects intro text).
        self_critic: Whether to include self-critic instructions.
        custom_tools/data/software/know_how_docs: Custom resources.
        file_schemas: Pre-read file schemas (for code_gen mode).

    Returns:
        Complete system prompt string.
    """
    if mode == PromptMode.FULL:
        # Full prompt = A + B + C + D + E(optional) + F + G  (step execution)
        parts = [
            _build_role_section(token_format),
            SECTION_PLAN,
            _build_code_exec_section(token_format),
        ]
        parts.append(SECTION_PROTOCOL)
        if self_critic:
            parts.append(SECTION_SELF_CRITIC)
        parts.append(_build_custom_resources_section(custom_tools, custom_data, custom_software, know_how_docs))
        parts.append(_build_env_resources_section(tool_desc, data_lake_path, data_lake_content, library_content, is_retrieval))
        return "\n".join(parts)

    elif mode == PromptMode.AGENT:
        # Agent mode: use model's own system_prompt if available (e.g. SYSTEM_PROMPT.txt),
        # otherwise fall back to role section only.
        tf = token_format or {}
        model_prompt = tf.get("system_prompt")
        if model_prompt and model_prompt.strip():
            return model_prompt.strip()
        return _build_role_section(token_format)

    elif mode == PromptMode.PLAN:
        # Structured output: forces LLM to output [TOOL_CALLS]create_plan[ARGS]{JSON}
        return SECTION_PLAN_SYSTEM

    elif mode == PromptMode.CODE_GEN:
        # Code gen = A + C(code rules) + code_gen_env + G(data lake + function dict)
        parts = [_build_role_section(token_format), SECTION_CODE_GEN_ENV]
        if data_lake_path:
            parts.append(f"\n# DATA LAKE\nData lake path: {data_lake_path}")
        if data_lake_content:
            parts.append(f"Available data files:\n{data_lake_content}")
        if file_schemas:
            parts.append(f"\n# FILE SCHEMAS (pre-read)\n{file_schemas}")
        if tool_desc:
            parts.append(f"\n# AVAILABLE FUNCTIONS\n{tool_desc}")
        return "\n".join(parts)

    elif mode == PromptMode.ANALYZE:
        # Analyze = standalone Korean prompt
        return SECTION_ANALYZE

    else:
        raise ValueError(f"Unknown prompt mode: {mode}")
