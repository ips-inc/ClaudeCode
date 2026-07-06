"""Thin PostgREST client using the service-role key (worker is trusted infra)."""
from typing import Any

import requests

from . import config

BASE = f"{config.SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": config.SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {config.SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}


def claim_job(kinds: list[str]) -> dict[str, Any] | None:
    """Atomically claim one queued job via app.claim_job (SKIP LOCKED)."""
    r = requests.post(
        f"{BASE}/rpc/claim_job",
        json={"kinds": kinds},
        headers={**HEADERS, "Content-Profile": "app", "Accept-Profile": "app"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return data if data and data.get("id") else None


def finish_job(job_id: str, error: str | None = None) -> None:
    r = requests.patch(
        f"{BASE}/jobs?id=eq.{job_id}",
        json={"status": "error" if error else "done", "error": error},
        headers=HEADERS,
        timeout=30,
    )
    r.raise_for_status()


def get_asset(asset_id: str) -> dict[str, Any] | None:
    r = requests.get(
        f"{BASE}/assets?id=eq.{asset_id}&select=*", headers=HEADERS, timeout=30
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def update_asset(asset_id: str, patch: dict[str, Any]) -> None:
    r = requests.patch(
        f"{BASE}/assets?id=eq.{asset_id}", json=patch, headers=HEADERS, timeout=30
    )
    r.raise_for_status()


def upsert_rendition(row: dict[str, Any]) -> None:
    r = requests.post(
        f"{BASE}/renditions?on_conflict=asset_id,kind",
        json=row,
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        timeout=30,
    )
    r.raise_for_status()


def insert_transcript(row: dict[str, Any]) -> str:
    r = requests.post(
        f"{BASE}/transcripts?on_conflict=asset_id",
        json=row,
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()[0]["id"]


def replace_segments(transcript_id: str, segments: list[dict[str, Any]]) -> None:
    requests.delete(
        f"{BASE}/transcript_segments?transcript_id=eq.{transcript_id}",
        headers=HEADERS,
        timeout=30,
    ).raise_for_status()
    if segments:
        for i in range(0, len(segments), 500):
            r = requests.post(
                f"{BASE}/transcript_segments",
                json=segments[i : i + 500],
                headers=HEADERS,
                timeout=60,
            )
            r.raise_for_status()
