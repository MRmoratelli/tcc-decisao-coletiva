"""Regras e armazenamento compartilhado, independentes de Streamlit e IA.

SQLite atende uma instância; DATABASE_URL permite PostgreSQL persistente.
Toda alteração autentica o ator, verifica a versão e usa uma transação.
"""
from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

POSITIONS = {
    "ACEITO": "Aceito",
    "ACEITO_COM_RESSALVAS": "Aceito com ressalvas",
    "NAO_ACEITO": "Não aceito",
}
NO_OBJECTION = "Sem objeção explicitada"
UNCLASSIFIED = "Não classificada"
MAX_ROUNDS = 3


class DecisionError(ValueError):
    """Erro de regra ou acesso que pode ser apresentado na interface."""


def now():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def uid():
    return uuid.uuid4().hex


def digest(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def clean(text, label, limit, required=True):
    value = str(text).strip()
    if required and not value:
        raise DecisionError(f"Preencha {label}.")
    if len(value) > limit:
        raise DecisionError(f"{label} deve ter até {limit} caracteres.")
    return value


SCHEMA = (
    """CREATE TABLE IF NOT EXISTS dc_rooms (
        id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, theme TEXT NOT NULL,
        context TEXT NOT NULL, state TEXT NOT NULL, active_proposal_id TEXT NOT NULL,
        moderator_hash TEXT NOT NULL, ai_enabled INTEGER NOT NULL,
        revision INTEGER NOT NULL, created_at TEXT NOT NULL,
        closed_at TEXT, result TEXT, close_reason TEXT)""",
    """CREATE TABLE IF NOT EXISTS dc_participants (
        id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES dc_rooms(id),
        alias TEXT NOT NULL, normalized_alias TEXT NOT NULL, pseudonym TEXT NOT NULL,
        token_hash TEXT NOT NULL, UNIQUE(room_id, normalized_alias),
        UNIQUE(room_id, pseudonym))""",
    """CREATE TABLE IF NOT EXISTS dc_proposals (
        id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES dc_rooms(id),
        round INTEGER NOT NULL CHECK(round BETWEEN 1 AND 3), text TEXT NOT NULL,
        parent_id TEXT REFERENCES dc_proposals(id), source_mediation_id TEXT,
        origin TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(room_id, round))""",
    """CREATE TABLE IF NOT EXISTS dc_responses (
        id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES dc_proposals(id),
        participant_id TEXT NOT NULL REFERENCES dc_participants(id),
        position TEXT NOT NULL CHECK(position IN ('ACEITO','ACEITO_COM_RESSALVAS','NAO_ACEITO')),
        argument TEXT NOT NULL, category_ai TEXT, category TEXT NOT NULL,
        category_manual INTEGER NOT NULL, classification_status TEXT NOT NULL,
        classification_model TEXT, classification_prompt TEXT,
        edit INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(proposal_id, participant_id))""",
    """CREATE TABLE IF NOT EXISTS dc_mediations (
        id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES dc_rooms(id),
        proposal_id TEXT NOT NULL REFERENCES dc_proposals(id),
        revision INTEGER NOT NULL, origin TEXT NOT NULL, status TEXT NOT NULL,
        summary TEXT NOT NULL, suggested_text TEXT NOT NULL, details_json TEXT NOT NULL,
        model TEXT, prompt_version TEXT, failure_code TEXT, duration_ms INTEGER,
        created_at TEXT NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS dc_events (
        id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES dc_rooms(id),
        proposal_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL,
        payload_json TEXT NOT NULL, created_at TEXT NOT NULL)""",
)


class Connection:
    def __init__(self, raw, postgres):
        self.raw, self.postgres = raw, postgres

    def execute(self, sql, args=()):
        return self.raw.execute(sql.replace("?", "%s") if self.postgres else sql, args)


class Repository:
    def __init__(self, database_url="", sqlite_path="data/decisoes.sqlite3"):
        self.url = database_url.strip()
        self.postgres = self.url.startswith(("postgres://", "postgresql://"))
        if self.url and not self.postgres:
            raise DecisionError("DATABASE_URL deve ser uma conexão PostgreSQL.")
        self.path = str(Path(sqlite_path).resolve())
        if not self.postgres:
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.transaction(write=True) as conn:
            for sql in SCHEMA:
                conn.execute(sql)

    @contextmanager
    def transaction(self, write=False):
        if self.postgres:
            import psycopg
            from psycopg.rows import dict_row
            raw = psycopg.connect(self.url, autocommit=True, row_factory=dict_row, connect_timeout=10)
        else:
            raw = sqlite3.connect(self.path, timeout=20, isolation_level=None)
            raw.row_factory = sqlite3.Row
            raw.execute("PRAGMA foreign_keys=ON")
            raw.execute("PRAGMA busy_timeout=20000")
        conn = Connection(raw, self.postgres)
        try:
            if write:
                conn.execute("BEGIN" if self.postgres else "BEGIN IMMEDIATE")
            else:
                conn.execute("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" if self.postgres else "BEGIN")
            yield conn
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise
        finally:
            raw.close()

    def _access(self, conn, code, token, write=False, moderator=False):
        sql = "SELECT * FROM dc_rooms WHERE code=?"
        if self.postgres and write:
            sql += " FOR UPDATE"
        row = conn.execute(sql, (code.strip().upper(),)).fetchone()
        token_hash = digest(token)
        if row and hmac.compare_digest(row["moderator_hash"], token_hash):
            actor = {"role": "moderator", "pseudonym": "MODERADOR", "id": None}
        elif row:
            participant = conn.execute(
                "SELECT id, alias, pseudonym FROM dc_participants WHERE room_id=? AND token_hash=?",
                (row["id"], token_hash),
            ).fetchone()
            actor = dict(participant) | {"role": "participant"} if participant else None
        else:
            actor = None
        if not actor:
            raise DecisionError("Código da sala ou credencial de acesso inválidos.")
        if moderator and actor["role"] != "moderator":
            raise DecisionError("Esta ação é exclusiva do moderador.")
        return dict(row), actor

    def _current(self, room, proposal_id, state):
        if room["state"] == "ENCERRADA":
            raise DecisionError("Esta sala já foi encerrada.")
        if room["active_proposal_id"] != proposal_id:
            raise DecisionError("A proposta mudou. Atualize a página e leia a nova versão.")
        if room["state"] != state:
            raise DecisionError("Esta ação não está disponível na etapa atual. Atualize a página.")

    def _event(self, conn, room, proposal_id, actor, action, payload):
        conn.execute("INSERT INTO dc_events VALUES (?,?,?,?,?,?,?)", (
            uid(), room["id"], proposal_id, actor["pseudonym"], action,
            json.dumps(payload, ensure_ascii=False), now(),
        ))

    def _bump(self, conn, room):
        conn.execute("UPDATE dc_rooms SET revision=revision+1 WHERE id=?", (room["id"],))

    def create_room(self, theme, context, proposal, aliases, ai_enabled=True):
        theme = clean(theme, "o tema", 300)
        context = clean(context, "o contexto", 6000, False)
        proposal = clean(proposal, "a proposta inicial", 12000)
        aliases = [clean(alias, "o nome de cada participante", 80) for alias in aliases]
        if not 2 <= len(aliases) <= 30:
            raise DecisionError("Cadastre de 2 a 30 participantes antes de iniciar.")
        if len({a.casefold() for a in aliases}) != len(aliases):
            raise DecisionError("Use um nome ou apelido diferente para cada participante.")
        room_id, proposal_id = uid(), uid()
        code = uid()[:10].upper()
        moderator_token = secrets.token_urlsafe(24)
        stamp = now()
        room = {"id": room_id}
        invitations = []
        with self.transaction(write=True) as conn:
            conn.execute("INSERT INTO dc_rooms VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                room_id, code, theme, context, "COLETA", proposal_id,
                digest(moderator_token), int(ai_enabled), 0, stamp, None, None, None,
            ))
            conn.execute("INSERT INTO dc_proposals VALUES (?,?,?,?,?,?,?,?)", (
                proposal_id, room_id, 1, proposal, None, None, "HUMANA", stamp,
            ))
            for index, alias in enumerate(aliases, 1):
                token, participant_id = secrets.token_urlsafe(24), uid()
                pseudonym = f"P{index:02d}"
                conn.execute("INSERT INTO dc_participants VALUES (?,?,?,?,?,?)", (
                    participant_id, room_id, alias, alias.casefold(), pseudonym, digest(token),
                ))
                invitations.append({"alias": alias, "pseudonym": pseudonym, "token": token})
            self._event(conn, room, proposal_id, {"pseudonym": "MODERADOR"}, "SALA_CRIADA", {
                "participants": len(aliases), "ai_enabled": bool(ai_enabled), "max_rounds": MAX_ROUNDS,
            })
        return {"code": code, "moderator_token": moderator_token, "invitations": invitations}

    def snapshot(self, code, token):
        with self.transaction() as conn:
            room, actor = self._access(conn, code, token)
            room.pop("moderator_hash")
            participants = [dict(p) for p in conn.execute(
                "SELECT id, alias, pseudonym FROM dc_participants WHERE room_id=? ORDER BY pseudonym",
                (room["id"],),
            ).fetchall()]
            proposals = [dict(p) for p in conn.execute(
                "SELECT * FROM dc_proposals WHERE room_id=? ORDER BY round", (room["id"],),
            ).fetchall()]
            responses = [dict(r) for r in conn.execute(
                """SELECT r.*, p.pseudonym, p.alias FROM dc_responses r
                   JOIN dc_participants p ON p.id=r.participant_id
                   WHERE p.room_id=? ORDER BY r.created_at""", (room["id"],),
            ).fetchall()]
            mediations = [dict(m) for m in conn.execute(
                "SELECT * FROM dc_mediations WHERE room_id=? ORDER BY created_at", (room["id"],),
            ).fetchall()]
            events = [dict(e) for e in conn.execute(
                "SELECT * FROM dc_events WHERE room_id=? ORDER BY created_at", (room["id"],),
            ).fetchall()]
        return {"room": room, "actor": actor, "participants": participants,
                "proposals": proposals, "responses": responses, "mediations": mediations, "events": events}

    def submit_response(self, code, token, proposal_id, position, argument, expected_edit=None):
        if position not in POSITIONS:
            raise DecisionError("Escolha uma posição válida.")
        argument = clean(argument, "a justificativa", 6000, position != "ACEITO")
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True)
            self._current(room, proposal_id, "COLETA")
            if actor["role"] != "participant":
                raise DecisionError("Para responder, entre com a credencial de um participante.")
            old = conn.execute("SELECT * FROM dc_responses WHERE proposal_id=? AND participant_id=?",
                               (proposal_id, actor["id"])).fetchone()
            current_edit = old["edit"] if old else 0
            if expected_edit is not None and expected_edit != current_edit:
                raise DecisionError("Sua manifestação foi alterada em outro acesso. Atualize antes de editar.")
            response_id, edit, stamp = old["id"] if old else uid(), current_edit + 1, now()
            category = NO_OBJECTION if not argument else UNCLASSIFIED
            status = "SEM_TEXTO" if not argument else "PENDENTE" if room["ai_enabled"] else "SEM_IA"
            if old:
                conn.execute("""UPDATE dc_responses SET position=?, argument=?, category_ai=NULL,
                    category=?, category_manual=0, classification_status=?, classification_model=NULL,
                    classification_prompt=NULL, edit=?, updated_at=? WHERE id=?""",
                    (position, argument, category, status, edit, stamp, response_id))
            else:
                conn.execute("INSERT INTO dc_responses VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                    response_id, proposal_id, actor["id"], position, argument, None, category,
                    0, status, None, None, edit, stamp, stamp,
                ))
            self._bump(conn, room)
            self._event(conn, room, proposal_id, actor, "MANIFESTACAO_REGISTRADA", {
                "response_id": response_id, "edit": edit, "position": position, "argument": argument,
                "previous": {"position": old["position"], "argument": old["argument"], "edit": old["edit"]} if old else None,
            })
        return {"id": response_id, "edit": edit}

    def apply_classification(self, code, token, proposal_id, response_id, edit, result):
        """Uma resposta atrasada da API nunca substitui uma edição humana."""
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True)
            if not room["ai_enabled"]:
                return False
            row = conn.execute("SELECT * FROM dc_responses WHERE id=? AND proposal_id=?",
                               (response_id, proposal_id)).fetchone()
            if not row or (actor["role"] != "moderator" and row["participant_id"] != actor["id"]):
                raise DecisionError("Manifestação não disponível para este acesso.")
            if (room["active_proposal_id"] != proposal_id or room["state"] != "COLETA"
                    or row["edit"] != edit or row["category_manual"]):
                return False
            status = "OK" if result["ok"] else result.get("failure_code", "FALHA_IA")
            category = clean(result["category"], "a categoria", 120) if result["ok"] else UNCLASSIFIED
            conn.execute("""UPDATE dc_responses SET category_ai=?, category=?, classification_status=?,
                         classification_model=?, classification_prompt=? WHERE id=?""", (
                category if result["ok"] else None, category, status, result.get("model"),
                result.get("prompt_version"), response_id,
            ))
            self._bump(conn, room)
            self._event(conn, room, proposal_id, actor, "CLASSIFICACAO_IA", {
                "response_id": response_id, "edit": edit, "category": category, "status": status,
            })
        return True

    def set_category(self, code, token, proposal_id, response_id, category, expected_edit=None):
        category = clean(category, "a categoria", 120)
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True, moderator=True)
            self._current(room, proposal_id, "COLETA")
            row = conn.execute("SELECT * FROM dc_responses WHERE id=? AND proposal_id=?",
                               (response_id, proposal_id)).fetchone()
            if not row:
                raise DecisionError("Manifestação não pertence à proposta atual.")
            if expected_edit is not None and row["edit"] != expected_edit:
                raise DecisionError("O participante editou a justificativa. Atualize antes de revisar a categoria.")
            conn.execute("UPDATE dc_responses SET category=?, category_manual=1 WHERE id=?", (category, response_id))
            self._bump(conn, room)
            self._event(conn, room, proposal_id, actor, "CATEGORIA_REVISADA", {
                "response_id": response_id, "previous": row["category"], "category": category,
            })

    def set_phase(self, code, token, proposal_id, phase):
        if phase not in ("COLETA", "REVISAO"):
            raise DecisionError("Etapa inválida.")
        previous = "REVISAO" if phase == "COLETA" else "COLETA"
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True, moderator=True)
            self._current(room, proposal_id, previous)
            conn.execute("UPDATE dc_rooms SET state=?, revision=revision+1 WHERE id=?", (phase, room["id"]))
            self._event(conn, room, proposal_id, actor, "ETAPA_ALTERADA", {"from": previous, "to": phase})

    def save_mediation(self, code, token, proposal_id, revision, result):
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True, moderator=True)
            self._current(room, proposal_id, "REVISAO")
            if room["revision"] != revision:
                raise DecisionError("As manifestações mudaram. Gere uma nova mediação.")
            if result["origin"] == "IA" and not room["ai_enabled"]:
                raise DecisionError("A IA está desativada nesta sala.")
            if result["origin"] not in ("IA", "HUMANA"):
                raise DecisionError("Origem de mediação inválida.")
            mediation_id = uid()
            conn.execute("INSERT INTO dc_mediations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                mediation_id, room["id"], proposal_id, revision, result["origin"],
                "OK" if result["ok"] else "FALHA", result.get("summary", ""),
                result.get("suggested_text", ""), json.dumps(result.get("details", {}), ensure_ascii=False),
                result.get("model"), result.get("prompt_version"), result.get("failure_code"),
                result.get("duration_ms"), now(),
            ))
            self._event(conn, room, proposal_id, actor, "MEDIACAO_REGISTRADA", {
                "mediation_id": mediation_id, "origin": result["origin"], "ok": result["ok"],
            })
        return mediation_id

    def publish_revision(self, code, token, proposal_id, text, mediation_id=None):
        text = clean(text, "a proposta revisada", 12000)
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True, moderator=True)
            self._current(room, proposal_id, "REVISAO")
            old = conn.execute("SELECT * FROM dc_proposals WHERE id=?", (proposal_id,)).fetchone()
            if old["round"] >= MAX_ROUNDS:
                raise DecisionError("O limite de três rodadas já foi atingido.")
            if text == old["text"]:
                raise DecisionError("A nova versão deve conter uma alteração na proposta.")
            origin = "HUMANA"
            if mediation_id:
                mediation = conn.execute("SELECT * FROM dc_mediations WHERE id=? AND room_id=?",
                                         (mediation_id, room["id"])).fetchone()
                if (not mediation or mediation["proposal_id"] != proposal_id
                        or mediation["revision"] != room["revision"] or mediation["status"] != "OK"):
                    raise DecisionError("Esta mediação não corresponde ao conjunto atual de manifestações.")
                origin = "IA_REVISADA_POR_HUMANO" if mediation["origin"] == "IA" else "HUMANA"
            new_id = uid()
            conn.execute("INSERT INTO dc_proposals VALUES (?,?,?,?,?,?,?,?)", (
                new_id, room["id"], old["round"] + 1, text, proposal_id, mediation_id, origin, now(),
            ))
            conn.execute("UPDATE dc_rooms SET active_proposal_id=?, state='COLETA', revision=revision+1 WHERE id=?",
                         (new_id, room["id"]))
            self._event(conn, room, new_id, actor, "PROPOSTA_PUBLICADA", {
                "parent_id": proposal_id, "round": old["round"] + 1, "origin": origin,
                "source_mediation_id": mediation_id,
            })
        return new_id

    def finish(self, code, token, proposal_id, reason="", cancel=False):
        reason = clean(reason, "o motivo do encerramento", 2000, cancel)
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True, moderator=True)
            self._current(room, proposal_id, "REVISAO" if not cancel else room["state"])
            snapshot = {
                "participants": [dict(p) for p in conn.execute("SELECT id, pseudonym FROM dc_participants WHERE room_id=?", (room["id"],)).fetchall()],
                "responses": [dict(r) for r in conn.execute("SELECT * FROM dc_responses WHERE proposal_id=?", (proposal_id,)).fetchall()],
                "room": room,
            }
            state = consensus(snapshot)
            current_round = conn.execute("SELECT round FROM dc_proposals WHERE id=?", (proposal_id,)).fetchone()["round"]
            if cancel:
                result = "CANCELADA"
            elif state["accepted"]:
                result = "ACORDO"
            elif current_round < MAX_ROUNDS:
                raise DecisionError("Antes da terceira rodada, encerre por acordo ou registre um cancelamento com motivo.")
            else:
                result = "INCONCLUSIVO" if state["missing"] else "SEM_ACORDO"
            conn.execute("UPDATE dc_rooms SET state='ENCERRADA', result=?, closed_at=?, close_reason=? WHERE id=?",
                         (result, now(), reason, room["id"]))
            self._event(conn, room, proposal_id, actor, "SALA_ENCERRADA", {"result": result, "reason": reason})
        return result

    def reset_invitation(self, code, token, participant_id):
        replacement = secrets.token_urlsafe(24)
        with self.transaction(write=True) as conn:
            room, actor = self._access(conn, code, token, write=True, moderator=True)
            if room["state"] == "ENCERRADA":
                raise DecisionError("Esta sala já foi encerrada.")
            participant = conn.execute("SELECT pseudonym FROM dc_participants WHERE id=? AND room_id=?",
                                       (participant_id, room["id"])).fetchone()
            if not participant:
                raise DecisionError("Participante não pertence à sala.")
            conn.execute("UPDATE dc_participants SET token_hash=? WHERE id=?", (digest(replacement), participant_id))
            self._event(conn, room, room["active_proposal_id"], actor, "CONVITE_REDEFINIDO", {"participant": participant["pseudonym"]})
        return replacement


def current_proposal(snapshot):
    return next(p for p in snapshot["proposals"] if p["id"] == snapshot["room"]["active_proposal_id"])


def current_responses(snapshot):
    return [r for r in snapshot["responses"] if r["proposal_id"] == snapshot["room"]["active_proposal_id"]]


def consensus(snapshot):
    roster = {p["id"]: p for p in snapshot["participants"]}
    responses = {r["participant_id"]: r for r in current_responses(snapshot) if r["participant_id"] in roster}
    missing = [p["pseudonym"] for key, p in roster.items() if key not in responses]
    rejects = [roster[key]["pseudonym"] for key, r in responses.items() if r["position"] == "NAO_ACEITO"]
    reservations = [roster[key]["pseudonym"] for key, r in responses.items() if r["position"] == "ACEITO_COM_RESSALVAS"]
    return {"expected": len(roster), "responded": len(responses), "missing": missing,
            "rejects": rejects, "reservations": reservations,
            "accepted": bool(roster) and not missing and all(
                r["position"] in ("ACEITO", "ACEITO_COM_RESSALVAS") for r in responses.values())}


def research_export(snapshot):
    """Exporta a trilha completa sem credenciais nem aliases pessoais."""
    output = {"schema_version": 1, "exported_at": now(), "max_rounds": MAX_ROUNDS}
    for section in ("room", "participants", "proposals", "responses", "mediations", "events"):
        output[section] = snapshot[section]
    output = json.loads(json.dumps(output, ensure_ascii=False))
    for person in output["participants"] + output["responses"]:
        person.pop("alias", None)
        person.pop("normalized_alias", None)
        person.pop("token_hash", None)
    output["room"].pop("moderator_hash", None)
    return output


def csv_export(snapshot):
    output = io.StringIO(newline="")
    fields = ["round", "participant", "position", "argument", "category", "category_ai", "classification_status", "updated_at"]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    rounds = {p["id"]: p["round"] for p in snapshot["proposals"]}
    for response in snapshot["responses"]:
        row = {k: response.get(k, "") for k in fields if k not in ("round", "participant")}
        row.update(round=rounds[response["proposal_id"]], participant=response["pseudonym"])
        for key, value in row.items():
            if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
                row[key] = "'" + value
        writer.writerow(row)
    return output.getvalue().encode("utf-8-sig")
