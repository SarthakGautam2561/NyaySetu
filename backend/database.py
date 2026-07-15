"""SQLite database for NyaySetu — stores chat sessions and generated content."""

import aiosqlite
import json
import uuid
from pathlib import Path
import re

DB_PATH = Path(__file__).parent / "nyaysetu.db"


async def init_db():
    """Create tables if they don't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT DEFAULT 'New chat',
                language TEXT DEFAULT 'en',
                pinned INTEGER DEFAULT 0,
                archived INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                filename TEXT,
                analysis TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS drafts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                draft_type TEXT,
                content TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS intakes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                user_text TEXT,
                analysis TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await _ensure_session_columns(db)
        await db.commit()


async def _ensure_session_columns(db):
    """Add missing session metadata columns for older databases."""
    cursor = await db.execute("PRAGMA table_info(sessions)")
    rows = await cursor.fetchall()
    existing = {row[1] for row in rows}
    columns = {
        "title": "TEXT DEFAULT 'New chat'",
        "pinned": "INTEGER DEFAULT 0",
        "archived": "INTEGER DEFAULT 0",
    }
    for column, definition in columns.items():
        if column not in existing:
            await db.execute(f"ALTER TABLE sessions ADD COLUMN {column} {definition}")


async def _ensure_session(db, session_id: str | None, language: str = "en") -> str:
    """Create or refresh a session row before writing related data."""
    resolved_id = session_id or str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO sessions (id, title, language)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            language = excluded.language,
            updated_at = CURRENT_TIMESTAMP
        """,
        (resolved_id, "New chat", language),
    )
    return resolved_id


def _derive_title(message: str) -> str:
    """Create a short human-readable session title from the first user message."""
    clean = re.sub(r"\s+", " ", message).strip(" .,!?:;-")
    if not clean:
        return "New chat"
    words = clean.split(" ")
    return " ".join(words[:6])[:42]


async def create_session(language: str = "en") -> str:
    """Create a new chat session."""
    async with aiosqlite.connect(DB_PATH) as db:
        session_id = await _ensure_session(db, None, language)
        await db.commit()
    return session_id


async def save_message(session_id: str, role: str, content: str):
    """Save a chat message."""
    async with aiosqlite.connect(DB_PATH) as db:
        await _ensure_session(db, session_id)
        await db.execute(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content),
        )
        if role == "user":
            cursor = await db.execute("SELECT title FROM sessions WHERE id = ?", (session_id,))
            row = await cursor.fetchone()
            current_title = row[0] if row else "New chat"
            if not current_title or current_title == "New chat":
                await db.execute(
                    "UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (_derive_title(content), session_id),
                )
            else:
                await db.execute(
                    "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (session_id,),
                )
        else:
            await db.execute(
                "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,),
            )
        await db.commit()


async def save_document_analysis(session_id: str, filename: str, analysis: dict):
    """Save a document analysis result."""
    async with aiosqlite.connect(DB_PATH) as db:
        await _ensure_session(db, session_id)
        await db.execute(
            "INSERT INTO documents (session_id, filename, analysis) VALUES (?, ?, ?)",
            (session_id, filename, json.dumps(analysis)),
        )
        await db.commit()


async def save_draft(session_id: str, draft_type: str, content: str):
    """Save a generated draft."""
    async with aiosqlite.connect(DB_PATH) as db:
        await _ensure_session(db, session_id)
        await db.execute(
            "INSERT INTO drafts (session_id, draft_type, content) VALUES (?, ?, ?)",
            (session_id, draft_type, content),
        )
        await db.commit()


async def save_intake(session_id: str, user_text: str, analysis: dict):
    """Save a structured intake analysis."""
    async with aiosqlite.connect(DB_PATH) as db:
        await _ensure_session(db, session_id)
        await db.execute(
            "INSERT INTO intakes (session_id, user_text, analysis) VALUES (?, ?, ?)",
            (session_id, user_text, json.dumps(analysis)),
        )
        await db.commit()


async def get_recent_messages(session_id: str, limit: int = 20) -> list[dict]:
    """Fetch recent messages for a session."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT role, content, created_at
            FROM messages
            WHERE session_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (session_id, limit),
        )
        rows = await cursor.fetchall()
    return [
        {"role": row["role"], "content": row["content"], "created_at": row["created_at"]}
        for row in reversed(rows)
    ]


async def list_sessions(limit: int = 25, include_archived: bool = False) -> list[dict]:
    """Return recent chat sessions with lightweight metadata."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        query = """
            SELECT s.id, s.title, s.language, s.pinned, s.archived, s.created_at, s.updated_at,
                   COALESCE(mc.message_count, 0) AS message_count,
                   COALESCE(lm.content, '') AS last_message,
                   COALESCE(lm.role, '') AS last_role
            FROM sessions s
            LEFT JOIN (
                SELECT session_id,
                       COUNT(*) AS message_count,
                       MAX(id) AS last_message_id
                FROM messages
                GROUP BY session_id
            ) mc ON mc.session_id = s.id
            LEFT JOIN messages lm ON lm.id = mc.last_message_id
        """
        params = []
        if not include_archived:
            query += " WHERE s.archived = 0"
        query += " ORDER BY s.pinned DESC, s.updated_at DESC, s.created_at DESC LIMIT ?"
        params.append(limit)
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "language": row["language"],
            "pinned": bool(row["pinned"]),
            "archived": bool(row["archived"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "message_count": row["message_count"],
            "last_message": row["last_message"],
            "last_role": row["last_role"],
        }
        for row in rows
    ]


async def rename_session(session_id: str, title: str):
    """Rename a chat session."""
    clean_title = (title or "New chat").strip()[:60] or "New chat"
    async with aiosqlite.connect(DB_PATH) as db:
        await _ensure_session(db, session_id)
        await db.execute(
            "UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (clean_title, session_id),
        )
        await db.commit()


async def set_session_pinned(session_id: str, pinned: bool):
    """Pin or unpin a chat session."""
    async with aiosqlite.connect(DB_PATH) as db:
        await _ensure_session(db, session_id)
        await db.execute(
            "UPDATE sessions SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (1 if pinned else 0, session_id),
        )
        await db.commit()


async def archive_session(session_id: str):
    """Archive a session instead of deleting its data."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sessions SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (session_id,),
        )
        await db.commit()
