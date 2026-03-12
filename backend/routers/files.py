"""File management endpoints — 5 endpoints."""

import mimetypes
import os
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from config import get_settings
from models.schemas import FileInfo, FileUploadResponse, StatusResponse

router = APIRouter(prefix="/api", tags=["files"])

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico"}
TEXT_EXTENSIONS = {".txt", ".csv", ".tsv", ".json", ".jsonl", ".md", ".xml", ".yaml", ".yml", ".log"}


def _get_uploads_dir() -> str:
    return get_settings().UPLOADS_DIR


def _get_outputs_dir() -> str:
    return get_settings().OUTPUTS_DIR


def _sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent path traversal and invalid chars."""
    name = os.path.basename(name).replace("..", "_")
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    return name or "upload"


def _safe_path(base_dir: str, *parts: str) -> str:
    """Join path parts and verify the result stays within base_dir."""
    full = os.path.normpath(os.path.join(base_dir, *parts))
    if os.path.commonpath([base_dir, full]) != os.path.normpath(base_dir):
        raise HTTPException(status_code=400, detail="Invalid path")
    return full


def _extract_text(file_path: str) -> str | None:
    """Extract text from non-image files (simple text-based formats)."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in TEXT_EXTENSIONS:
        return None
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read(1_000_000)  # cap at 1MB text
    except Exception:
        return None


@router.get("/data/list", response_model=list[FileInfo])
async def list_files():
    """List all uploaded files, excluding .extracted.txt companions."""
    uploads = _get_uploads_dir()
    if not os.path.isdir(uploads):
        return []

    files: list[FileInfo] = []
    for fname in os.listdir(uploads):
        if fname.endswith(".extracted.txt"):
            continue
        fpath = os.path.join(uploads, fname)
        if not os.path.isfile(fpath):
            continue
        stat = os.stat(fpath)
        mime = mimetypes.guess_type(fname)[0] or "application/octet-stream"
        files.append(
            FileInfo(
                filename=fname,
                size=stat.st_size,
                type=mime,
                uploaded_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
            )
        )

    files.sort(key=lambda f: f.uploaded_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return files


@router.post("/data/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile):
    """Upload a file to UPLOADS_DIR with dedup and optional text extraction."""
    uploads = _get_uploads_dir()
    os.makedirs(uploads, exist_ok=True)

    safe_name = _sanitize_filename(file.filename or "upload")
    base, ext = os.path.splitext(safe_name)
    dest = os.path.join(uploads, safe_name)

    # Handle duplicate filenames
    counter = 1
    while os.path.exists(dest):
        safe_name = f"{base}_{counter}{ext}"
        dest = os.path.join(uploads, safe_name)
        counter += 1

    # Save file
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    # Text extraction for non-image files
    text_content = None
    if ext.lower() not in IMAGE_EXTENSIONS:
        text_content = _extract_text(dest)
        if text_content is not None:
            txt_path = dest + ".extracted.txt"
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text_content)

    return FileUploadResponse(filename=safe_name, text_content=text_content)


@router.delete("/data/{filename}", response_model=StatusResponse)
async def delete_file(filename: str):
    """Delete an uploaded file and its .extracted.txt companion."""
    uploads = _get_uploads_dir()
    fpath = _safe_path(uploads, filename)

    if not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="File not found")

    os.remove(fpath)

    # Remove companion .extracted.txt if it exists
    extracted = fpath + ".extracted.txt"
    if os.path.isfile(extracted):
        os.remove(extracted)

    return StatusResponse(status="ok", message=f"Deleted {filename}")


@router.get("/outputs/{conv_id}/{step_id}")
async def list_step_outputs(conv_id: str, step_id: str):
    """List figures and tables in a step's output directory."""
    outputs = _get_outputs_dir()
    step_dir = _safe_path(outputs, conv_id, f"step_{step_id}")

    if not os.path.isdir(step_dir):
        return {"figures": [], "tables": []}

    figures = sorted(
        f"/api/outputs/{conv_id}/step_{step_id}/{f}"
        for f in os.listdir(step_dir)
        if f.endswith(".png")
    )
    tables = sorted(
        f"/api/outputs/{conv_id}/step_{step_id}/{f}"
        for f in os.listdir(step_dir)
        if f.endswith(".csv")
    )
    return {"figures": figures, "tables": tables}


@router.get("/outputs/{conv_id}/{step_id}/{filename}")
async def get_step_output_file(conv_id: str, step_id: str, filename: str):
    """Serve a specific step output file."""
    outputs = _get_outputs_dir()
    fpath = _safe_path(outputs, conv_id, f"step_{step_id}", filename)

    if not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="File not found")

    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return FileResponse(fpath, media_type=media_type, filename=filename)
