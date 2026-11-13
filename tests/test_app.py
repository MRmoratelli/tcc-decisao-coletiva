"""Teste real de widgets Streamlit, sem chamadas externas de IA.

Instale requirements.txt para executar. CI exige que estes testes sejam executados.
"""
import importlib.util
import json
from contextlib import nullcontext
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

HAS_STREAMLIT = importlib.util.find_spec("streamlit") is not None
if HAS_STREAMLIT:
    from streamlit.testing.v1 import AppTest
elif os.getenv("APP_TESTS_REQUIRED") == "1":
    raise RuntimeError("Instale Streamlit antes de executar os testes de interface.")

from experiment_config import SCENARIO_THEME, SCENARIO_CONTEXT, SCENARIO_INITIAL_TEXT, SCENARIO_INITIAL_ALLOCATION, SCENARIO_ITEMS
from ai_service import AIService, DEFAULT_MODEL
from decision import (MANUAL_MEDIATION_FIELDS, MANUAL_RESTRICTION_CHECKS, NO_OBJECTION,
                      UNCHANGED_REVIEW_NOTE, Repository, current_proposal, current_responses, research_export)

ENTRY = Path(__file__).resolve().parents[1] / "Prototipo TCC.py"


def widget(app, kind, label):
    return next(item for item in getattr(app, kind) if item.label == label)


@unittest.skipUnless(HAS_STREAMLIT, "Streamlit não instalado neste ambiente")
class StreamlitFlowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "interface.db"
        self.previous = {name: os.environ.get(name) for name in ("SQLITE_PATH", "DATABASE_URL", "GEMINI_API_KEY", "EXPERIMENT_MODE")}
        os.environ.update(SQLITE_PATH=str(self.path), DATABASE_URL="", GEMINI_API_KEY="", EXPERIMENT_MODE="0")
        self.repo = Repository(sqlite_path=self.path)

    def tearDown(self):
        for name, value in self.previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value
        self.tmp.cleanup()

    def app(self):
        app = AppTest.from_file(str(ENTRY), default_timeout=15).run()
        self.assertFalse(app.exception, [str(e) for e in app.exception])
        return app

    def create(self, enabled=False, scenario=False):
        # Fixture SQLite: somente o gate de criação é simulado neste helper de testes.
        # O bloqueio real é exercitado separadamente; regras também rodam no PostgreSQL do CI.
        storage_fixture = patch("app.experimental_storage_ready", return_value=True) if os.environ.get("EXPERIMENT_MODE") == "1" else nullcontext()
        with storage_fixture:
            app = self.app()
            if os.environ.get("EXPERIMENT_MODE") == "1":
                widget(app, "checkbox", "Usar cenário experimental de orçamento escolar").set_value(scenario).run()
            widget(app, "text_input", "Tema da decisão").set_value(SCENARIO_THEME if scenario else "Organização de um evento")
            widget(app, "text_area", "Contexto e restrições conhecidas").set_value(SCENARIO_CONTEXT if scenario else "Todos participam remotamente")
            widget(app, "text_area", "Texto da proposta inicial").set_value(SCENARIO_INITIAL_TEXT if scenario else "Reunião semanal às quartas")
            if os.environ.get("EXPERIMENT_MODE") == "1":
                widget(app, "number_input", "Número de participantes").set_value(3)
            else:
                widget(app, "text_area", "Participantes: um nome ou apelido por linha").set_value("Ana\nBruno\nCarla")
            widget(app, "checkbox", "Usar IA para sugerir categorias e revisões").set_value(enabled)
            widget(app, "button", "Criar sala e gerar acessos").click().run()
            self.assertFalse(app.exception, [str(e) for e in app.exception])
            return app, app.session_state["invitation"]

    def join(self, access, index):
        app = self.app()
        widget(app, "text_input", "Código da sala").set_value(access["code"])
        widget(app, "text_input", "Credencial individual").set_value(access["invitations"][index]["token"])
        widget(app, "button", "Entrar").click().run()
        self.assertFalse(app.exception, [str(e) for e in app.exception])
        return app

    def test_landing_create_and_independent_participant_sessions_share_room(self):
        moderator, access = self.create()
        for index in range(3):
            person = self.join(access, index)
            widget(person, "button", "Salvar manifestação").click().run()
            self.assertFalse(person.exception, [str(e) for e in person.exception])
        moderator.run()
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        widget(moderator, "checkbox", "Conferi as manifestações e confirmo o encerramento desta sala.").set_value(True)
        widget(moderator, "button", "Encerrar com resultado do grupo").click().run()
        self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])
        self.assertEqual(self.repo.snapshot(access["code"], access["moderator_token"])["room"]["result"], "ACORDO")

    def test_revision_requires_new_votes_and_shows_free_theme(self):
        moderator, access = self.create()
        person = self.join(access, 0)
        widget(person, "radio", "Minha posição sobre esta versão").set_value("NAO_ACEITO")
        widget(person, "text_area", "Justificativa e ressalvas").set_value("Quarta não funciona")
        widget(person, "button", "Salvar manifestação").click().run()
        moderator.run()
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        widget(moderator, "text_area", "Texto revisado a ser apresentado ao grupo").set_value("Reunião semanal às quintas")
        widget(moderator, "text_area", "Justificativa da revisão humana").set_value("Alteramos o dia para atender a disponibilidade")
        widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
        widget(moderator, "button", "Publicar nova versão").click().run()
        person.run()
        self.assertFalse(person.exception, [str(e) for e in person.exception])
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(current_proposal(snap)["round"], 2)
        self.assertEqual(current_responses(snap), [])
        self.assertEqual(snap["room"]["theme"], "Organização de um evento")

    def test_experimental_creation_and_response_warn_without_civil_identity(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        landing = self.app()
        self.assertIn("Número de participantes", [w.label for w in landing.number_input])
        self.assertNotIn("Participantes: um nome ou apelido por linha", [w.label for w in landing.text_area])
        moderator, access = self.create()
        self.assertEqual([p["alias"] for p in access["invitations"]], ["P01", "P02", "P03"])
        person = self.join(access, 0)
        self.assertTrue(any("Não informe nome, e-mail, telefone, matrícula, documento" in c.value for c in person.caption))
        widget(person, "radio", "Minha posição sobre esta versão").set_value("ACEITO_COM_RESSALVAS")
        original = "Contato pessoa@example.org; revisar o orçamento"
        widget(person, "text_area", "Justificativa e ressalvas").set_value(original)
        widget(person, "button", "Salvar manifestação").click().run()
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(current_responses(snap)[0]["argument"], original)
        self.assertFalse(person.exception, [str(e) for e in person.exception])

    def test_experimental_mode_uses_closed_category_selector(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create(enabled=False)
        person = self.join(access, 0)
        widget(person, "radio", "Minha posição sobre esta versão").set_value("NAO_ACEITO")
        widget(person, "text_area", "Justificativa e ressalvas").set_value("O orçamento está desequilibrado")
        widget(person, "button", "Salvar manifestação").click().run()
        moderator.run()
        selector = widget(moderator, "selectbox", "Revisar categoria")
        self.assertIn(selector.value, tuple(f"CAT{i:02d}" for i in range(1, 10)))
        self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])

    def test_participant_can_contest_and_moderator_resolves_in_interface(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        repo = Repository(sqlite_path=self.path, experimental_mode=True)
        access = repo.create_room("Orçamento escolar", "Cenário", "Proposta", ["A", "B"], ai_enabled=True)
        proposal = current_proposal(repo.snapshot(access["code"], access["moderator_token"]))["id"]
        token = access["invitations"][0]["token"]
        saved = repo.submit_response(access["code"], token, proposal, "NAO_ACEITO", "Acessibilidade deve ter prioridade")
        repo.apply_classification(access["code"], token, proposal, saved["id"], saved["edit"],
                                  {"ok": True, "category": "CAT03", "model": "fake", "prompt_version": "test"})

        person = self.join(access, 0)
        suggestion = widget(person, "selectbox", "Categoria que considero mais adequada")
        suggestion.set_value("CAT05")
        widget(person, "button", "Contestar categoria").click().run()
        snap = repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(snap["category_contests"][0]["suggested_category"], "CAT05")
        self.assertEqual(current_responses(snap)[0]["category"], "CAT03")

        moderator = self.app()
        widget(moderator, "text_input", "Código da sala").set_value(access["code"])
        widget(moderator, "text_input", "Credencial individual").set_value(access["moderator_token"])
        widget(moderator, "button", "Entrar").click().run()
        selector = widget(moderator, "selectbox", "Revisar categoria")
        selector.set_value("CAT05")
        widget(moderator, "button", "Salvar categoria final").click().run()
        final = repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(current_responses(final)[0]["category"], "CAT05")
        self.assertEqual(final["category_contests"][0]["status"], "RESOLVIDA")
        self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])

    def rendered_text(self, app):
        # Inspect all text and table bodies, including collapsed expanders/tabs.
        kinds = ("text", "caption", "markdown", "info", "warning", "success", "error", "dataframe")
        return "\n".join(str(item.value) for kind in kinds for item in app.get(kind)) + "\n" + "\n".join(
            item.label for item in app.expander
        )

    def seed_other_response(self, access, marker, index=1):
        repo = Repository(sqlite_path=self.path, experimental_mode=True)
        snap = repo.snapshot(access["code"], access["moderator_token"])
        proposal_id = current_proposal(snap)["id"]
        token = access["invitations"][index]["token"]
        saved = repo.submit_response(access["code"], token, proposal_id, "NAO_ACEITO", marker)
        repo.set_category(access["code"], access["moderator_token"], proposal_id, saved["id"], "CAT07", saved["edit"])
        return repo, proposal_id, saved

    def assert_blind(self, person, *markers):
        self.assertFalse(person.exception, [str(e) for e in person.exception])
        text = self.rendered_text(person)
        for marker in markers:
            self.assertNotIn(marker, text)
        for leak in ("Aguardando:", "Faltam respostas:", "Todos os participantes aceitam", "Todos aceitam",
                     "Categoria:", "Classificação:", "Contestação do participante:", "Resultado:"):
            self.assertNotIn(leak, text)
        self.assertEqual([m.label for m in person.metric], ["Rodada"])
        self.assertFalse(person.get("plotly_chart"))
        self.assertFalse(person.dataframe)
        self.assertFalse(person.get("download_button"))
        self.assertTrue(any("antes de visualizar informações agregadas" in m.value for m in person.info))
        self.assertTrue(any("Histórico detalhado disponível após" in m.value for m in person.info))

    def manual_result(self, access, suggested, marker="Registro manual"):
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        details = {key: marker + " — " + label for key, label in MANUAL_MEDIATION_FIELDS}
        details["restriction_checks"] = {key: True for key, _ in MANUAL_RESTRICTION_CHECKS}
        details["coverage"] = [{"response_id": r["id"],
                                "treatment": "SEM_OBJECAO" if r["category"] == NO_OBJECTION else "PARCIAL",
                                "note": "" if r["category"] == NO_OBJECTION else "Limite do cenário impede atendimento integral."}
                               for r in current_responses(snap)]
        return {"origin": "HUMANA", "ok": True, "suggested_text": suggested, "details": details}

    def fill_manual_form(self, moderator, access, suggested, marker="Registro manual"):
        result = self.manual_result(access, suggested, marker)
        for key, label in MANUAL_MEDIATION_FIELDS:
            widget(moderator, "text_area", label).set_value(result["details"][key])
        for _, label in MANUAL_RESTRICTION_CHECKS:
            widget(moderator, "checkbox", label).set_value(True)
        widget(moderator, "text_area", "Proposta revisada sugerida").set_value(suggested)
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        for row in current_responses(snap):
            if row["category"] != NO_OBJECTION:
                widget(moderator, "selectbox", "Cobertura de " + row["pseudonym"]).set_value("PARCIAL")
                widget(moderator, "text_area", "Razão operacional — " + row["pseudonym"]).set_value("Limite do cenário impede atendimento integral.")
        widget(moderator, "button", "Salvar mediação manual").click().run()
        self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])

    def test_database_connection_diagnostic_is_safe_and_classified(self):
        from app import database_connection_diagnostic

        class AuthError(Exception):
            sqlstate = "28P01"

        auth = database_connection_diagnostic(
            AuthError("password authentication failed for user segredo@example.org")
        )
        self.assertEqual(auth["error_type"], "AuthError")
        self.assertEqual(auth["category"], "AUTENTICACAO")
        self.assertEqual(auth["sqlstate"], "28P01")
        self.assertNotIn("segredo@example.org", str(auth))

        cases = (
            ("could not translate host name banco-invalido", "HOST_DNS"),
            ("connection timed out", "TIMEOUT"),
            ("SSL certificate verify failed", "SSL"),
            ("connection refused", "CONEXAO_RECUSADA"),
            ("network is unreachable", "REDE"),
            ("falha não classificada", "CONEXAO_POSTGRESQL"),
        )
        for message, expected in cases:
            with self.subTest(expected=expected):
                result = database_connection_diagnostic(RuntimeError(message))
                self.assertEqual(result["category"], expected)
                self.assertIsNone(result["sqlstate"])
                self.assertNotIn(message, str(result))

    def test_visibility_helper_requires_own_response_to_active_proposal(self):
        from app import participant_has_current_response, participant_visibility_blocked
        snap = {"actor": {"role": "participant", "id": "self"},
                "room": {"active_proposal_id": "v2"},
                "responses": [{"participant_id": "self", "proposal_id": "v1"},
                              {"participant_id": "other", "proposal_id": "v2"}]}
        self.assertFalse(participant_has_current_response(snap))
        self.assertTrue(participant_visibility_blocked(snap, True))
        self.assertFalse(participant_visibility_blocked(snap, False))
        snap["responses"].append({"participant_id": "self", "proposal_id": "v2"})
        self.assertTrue(participant_has_current_response(snap))
        self.assertFalse(participant_visibility_blocked(snap, True))
        snap["actor"] = {"role": "moderator"}
        self.assertFalse(participant_has_current_response(snap))
        self.assertFalse(participant_visibility_blocked(snap, True))

    def test_experimental_unanswered_participant_sees_no_other_response_or_aggregate(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        _, access = self.create()
        marker = "SIGILO_P02_R1 orçamento insuficiente"
        repo, proposal_id, saved = self.seed_other_response(access, marker)
        repo.suggest_category(access["code"], access["invitations"][1]["token"], proposal_id,
                              saved["id"], "CAT05", saved["edit"])
        person = self.join(access, 0)
        self.assert_blind(person, marker, "P02", "P03", "CAT07", "CAT05")
        self.assertIn("Reunião semanal às quartas", self.rendered_text(person))
        self.assertIn("Todos participam remotamente", self.rendered_text(person))
        self.assertEqual(widget(person, "radio", "Minha posição sobre esta versão").value, "ACEITO")
        self.assertIsNotNone(widget(person, "text_area", "Justificativa e ressalvas"))
        self.seed_other_response(access, "SIGILO_P03_R1 outra objeção", index=2)
        widget(person, "button", "Atualizar painel").click().run()
        self.assert_blind(person, marker, "SIGILO_P03_R1", "P02", "P03", "CAT07")

    def test_experimental_visibility_unlocks_only_after_successful_save(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        _, access = self.create()
        marker = "SIGILO_P02_R1 prioridade de investimento"
        self.seed_other_response(access, marker)
        person = self.join(access, 0)
        widget(person, "radio", "Minha posição sobre esta versão").set_value("NAO_ACEITO")
        widget(person, "button", "Salvar manifestação").click().run()
        # A validation failure cannot release data from the other participant.
        self.assertTrue(person.error)
        self.assert_blind(person, marker, "P02", "CAT07")
        widget(person, "text_area", "Justificativa e ressalvas").set_value("Prefiro outra distribuição")
        widget(person, "button", "Salvar manifestação").click().run()
        self.assertFalse(person.exception, [str(e) for e in person.exception])
        self.assertIn(marker, self.rendered_text(person))
        self.assertIn("CAT07", self.rendered_text(person))
        self.assertEqual([m.label for m in person.metric], ["Rodada", "Manifestações", "Não aceites"])
        self.assertEqual(widget(person, "metric", "Manifestações").value, "2 / 3")
        self.assertTrue(person.get("plotly_chart"))
        self.assertTrue(person.dataframe)
        self.assertFalse(person.get("download_button"))

    def test_experimental_new_versions_reapply_blindness_in_v2_and_v3(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create()
        markers = ["SIGILO_P02_R1 objeção inicial"]
        self.seed_other_response(access, markers[0])
        person = self.join(access, 0)
        widget(person, "button", "Salvar manifestação").click().run()
        self.assertIn(markers[0], self.rendered_text(person))
        for round_number in (2, 3):
            moderator.run()
            widget(moderator, "button", "Pausar coleta e revisar").click().run()
            self.fill_manual_form(moderator, access, f"Proposta da rodada {round_number}", f"MEDIAÇÃO_R{round_number - 1}")
            widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
            widget(moderator, "button", "Publicar nova versão").click().run()
            markers.append(f"SIGILO_P02_R{round_number} objeção nova")
            self.seed_other_response(access, markers[-1])
            person.run()
            self.assert_blind(person, *markers, "MEDIAÇÃO_R", "P02", "CAT07")
            self.assertEqual(widget(person, "metric", "Rodada").value, f"{round_number} / 3")
            self.assertIn(f"Proposta da rodada {round_number}", self.rendered_text(person))
            widget(person, "button", "Salvar manifestação").click().run()
            self.assertFalse(person.exception, [str(e) for e in person.exception])
            self.assertIn(markers[-1], self.rendered_text(person))
            self.assertTrue(person.get("plotly_chart"))

    def test_experimental_moderator_keeps_full_visibility_and_export(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create()
        marker = "SIGILO_P02 moderador vê esta manifestação"
        repo, proposal_id, saved = self.seed_other_response(access, marker)
        repo.suggest_category(access["code"], access["invitations"][1]["token"], proposal_id,
                              saved["id"], "CAT05", saved["edit"])
        moderator.run()
        text = self.rendered_text(moderator)
        self.assertIn(marker, text)
        self.assertIn("Aguardando: P01, P03", text)
        self.assertIn("Contestação do participante:", text)
        self.assertEqual(widget(moderator, "metric", "Não aceites").value, "1")
        self.assertTrue(moderator.get("plotly_chart"))
        self.assertTrue(moderator.dataframe)
        self.assertIsNotNone(widget(moderator, "selectbox", "Revisar categoria"))
        labels = [w.label for w in moderator.get("download_button")]
        self.assertIn("Baixar histórico completo (JSON)", labels)
        self.assertIn("Baixar manifestações (CSV)", labels)
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        self.assertIn(marker, self.rendered_text(moderator))
        self.assertIsNotNone(widget(moderator, "button", "Publicar nova versão"))

    def test_experimental_unanswered_history_and_mediation_stay_hidden_when_paused_or_closed(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        _, access = self.create()
        marker = "SIGILO_P02 manifestação corrente"
        repo, proposal_id, _ = self.seed_other_response(access, marker)
        code, token = access["code"], access["moderator_token"]
        repo.set_phase(code, token, proposal_id, "REVISAO")
        snap = repo.snapshot(code, token)
        repo.save_mediation(code, token, proposal_id, snap["room"]["revision"],
                            self.manual_result(access, "SUGESTÃO_SIGILOSA_R1", "MEDIAÇÃO_SIGILOSA_R1"))
        repo.set_phase(code, token, proposal_id, "COLETA")
        person = self.join(access, 0)
        self.assert_blind(person, marker, "MEDIAÇÃO_SIGILOSA", "SUGESTÃO_SIGILOSA")
        repo.set_phase(code, token, proposal_id, "REVISAO")
        person.run()
        self.assert_blind(person, marker, "MEDIAÇÃO_SIGILOSA", "SUGESTÃO_SIGILOSA")
        repo.finish(code, token, proposal_id, "MOTIVO_SIGILOSO ligado às posições", cancel=True)
        person.run()
        self.assert_blind(person, marker, "MEDIAÇÃO_SIGILOSA", "SUGESTÃO_SIGILOSA", "MOTIVO_SIGILOSO")

    def test_generic_mode_preserves_visibility_before_own_response(self):
        _, access = self.create()
        marker = "VISÍVEL_NO_MODO_GENÉRICO antes de responder"
        self.seed_other_response(access, marker)
        person = self.join(access, 0)
        self.assertIn(marker, self.rendered_text(person))
        self.assertIn("Aguardando: P01, P03", self.rendered_text(person))
        self.assertEqual(widget(person, "metric", "Manifestações").value, "1 / 3")
        self.assertTrue(person.get("plotly_chart"))
        self.assertTrue(person.dataframe)

    def test_b_structured_manual_workflow_never_calls_ai(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        with patch("ai_service.AIService.classify", side_effect=AssertionError("IA proibida na condição B")) as classify, \
             patch("ai_service.AIService.mediate", side_effect=AssertionError("IA proibida na condição B")) as mediate:
            moderator, access = self.create(enabled=False)
            person = self.join(access, 0)
            widget(person, "radio", "Minha posição sobre esta versão").set_value("NAO_ACEITO")
            widget(person, "text_area", "Justificativa e ressalvas").set_value("Aumentar biblioteca sem reduzir computadores")
            widget(person, "button", "Salvar manifestação").click().run()
            moderator.run()
            self.assertFalse(any(w.label == "Revisar categoria" for w in moderator.text_input))
            widget(moderator, "selectbox", "Revisar categoria").set_value("CAT07")
            widget(moderator, "button", "Salvar categoria").click().run()
            widget(moderator, "button", "Pausar coleta e revisar").click().run()
            self.assertFalse(any(w.label == "Gerar sugestão com IA" for w in moderator.button))
            self.assertTrue(widget(moderator, "button", "Publicar nova versão").disabled)
            self.assertEqual(widget(moderator, "selectbox", "Base para a revisão").options, [])
            widget(moderator, "button", "Salvar mediação manual").click().run()
            self.assertTrue(moderator.error)
            self.assertEqual(self.repo.snapshot(access["code"], access["moderator_token"])["mediations"], [])
            self.fill_manual_form(moderator, access, "Distribuição revisada do orçamento", "Pedidos incompatíveis preservados")
            snap = self.repo.snapshot(access["code"], access["moderator_token"])
            mediation = snap["mediations"][0]
            self.assertEqual(mediation["origin"], "HUMANA")
            details = json.loads(mediation["details_json"])
            self.assertEqual(details["coverage"][0]["treatment"], "PARCIAL")
            for key, _ in MANUAL_MEDIATION_FIELDS:
                self.assertIn(key, details)
            widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
            widget(moderator, "button", "Publicar nova versão").click().run()
            snap = self.repo.snapshot(access["code"], access["moderator_token"])
            self.assertEqual(current_proposal(snap)["source_mediation_id"], mediation["id"])
            self.assertEqual(current_proposal(snap)["round"], 2)
            person.run()
            self.assert_blind(person, "Pedidos incompatíveis", "CAT07")
            classify.assert_not_called()
            mediate.assert_not_called()

    def test_b_participant_contests_manual_category_and_moderator_resolves(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create(enabled=False)
        person = self.join(access, 0)
        widget(person, "radio", "Minha posição sobre esta versão").set_value("ACEITO_COM_RESSALVAS")
        widget(person, "text_area", "Justificativa e ressalvas").set_value("Acessibilidade precisa ser considerada")
        widget(person, "button", "Salvar manifestação").click().run()
        moderator.run()
        widget(moderator, "selectbox", "Revisar categoria").set_value("CAT03")
        widget(moderator, "button", "Salvar categoria").click().run()
        person.run()
        widget(person, "selectbox", "Categoria que considero mais adequada").set_value("CAT05")
        widget(person, "button", "Contestar categoria").click().run()
        moderator.run()
        widget(moderator, "selectbox", "Revisar categoria").set_value("CAT05")
        widget(moderator, "button", "Salvar categoria final").click().run()
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(current_responses(snap)[0]["category"], "CAT05")
        self.assertIsNone(current_responses(snap)[0]["category_ai"])
        self.assertEqual(snap["category_contests"][0]["status"], "RESOLVIDA")

    def ai_review_setup(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create(enabled=True)
        repo, proposal_id, _ = self.seed_other_response(access, "Condição de orçamento")
        moderator.run()
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        self.assertTrue(widget(moderator, "button", "Publicar nova versão").disabled)
        snap = repo.snapshot(access["code"], access["moderator_token"])
        source = repo.save_mediation(access["code"], access["moderator_token"], proposal_id, snap["room"]["revision"], {
            "origin": "IA", "ok": True, "summary": "Síntese original da IA",
            "suggested_text": "Sugestão original IA", "details": {"coverage": [
                {"participant": "P02", "treatment": "PARCIAL", "note": "Condição parcialmente incorporada"}]},
        })
        original = repo.snapshot(access["code"], access["moderator_token"])["mediations"][0]
        moderator.run()
        return moderator, access, original, source

    def test_a_unchanged_ai_suggestion_requires_explicit_review_and_keeps_source(self):
        moderator, access, original, source = self.ai_review_setup()
        widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
        widget(moderator, "button", "Publicar nova versão").click().run()
        self.assertTrue(moderator.error)
        self.assertEqual(len(self.repo.snapshot(access["code"], access["moderator_token"])["proposals"]), 1)
        widget(moderator, "checkbox", "Confirmo a publicação sem alteração de conteúdo.").set_value(True)
        widget(moderator, "button", "Publicar nova versão").click().run()
        self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(current_proposal(snap)["source_mediation_id"], source)
        self.assertEqual(snap["mediations"][0], original)
        payload = json.loads(next(e for e in snap["events"] if e["action"] == "PROPOSTA_PUBLICADA")["payload_json"])
        self.assertEqual(payload["review_note"], UNCHANGED_REVIEW_NOTE)
        self.assertFalse(payload["changed_from_source"])
        self.assertIn(UNCHANGED_REVIEW_NOTE, self.rendered_text(moderator))

    def test_a_changed_ai_suggestion_requires_reason_and_displays_review_trail(self):
        moderator, access, original, source = self.ai_review_setup()
        widget(moderator, "text_area", "Texto revisado a ser apresentado ao grupo").set_value("Texto corrigido por restrição")
        widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
        widget(moderator, "button", "Publicar nova versão").click().run()
        self.assertTrue(moderator.error)
        note = "Removida inferência não sustentada e preservada objeção minoritária."
        widget(moderator, "text_area", "Nota de revisão humana da sugestão da IA").set_value(note)
        widget(moderator, "button", "Publicar nova versão").click().run()
        self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(snap["mediations"][0], original)
        self.assertEqual(current_proposal(snap)["source_mediation_id"], source)
        payload = json.loads(next(e for e in snap["events"] if e["action"] == "PROPOSTA_PUBLICADA")["payload_json"])
        self.assertTrue(payload["changed_from_source"])
        self.assertEqual(payload["review_note"], note)
        self.assertIn(note, self.rendered_text(moderator))

    def test_formal_experimental_creation_requires_postgresql_but_landing_still_loads(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        app = self.app()  # No storage mock: this is the production creation gate.
        self.assertTrue(widget(app, "button", "Criar sala e gerar acessos").disabled)
        self.assertIn("Modo experimental requer PostgreSQL persistente. Configure DATABASE_URL", self.rendered_text(app))
        self.assertIsNotNone(widget(app, "button", "Entrar"))
        self.assertFalse(app.exception)
        with self.repo.transaction() as conn:
            count = conn.execute("SELECT COUNT(*) AS total FROM dc_rooms").fetchone()["total"]
        self.assertEqual(count, 0)
        from app import experimental_storage_ready
        from types import SimpleNamespace
        self.assertTrue(experimental_storage_ready(SimpleNamespace(experimental_mode=True, postgres=True)))
        os.environ["EXPERIMENT_MODE"] = "0"
        generic = self.app()
        self.assertFalse(widget(generic, "button", "Criar sala e gerar acessos").disabled)
        _, access = self.create()  # Generic creation has no storage mock.
        self.assertTrue(self.repo.snapshot(access["code"], access["moderator_token"]))

    def test_app_ignores_fallback_environment_only_in_experimental_mode(self):
        for experimental in ("1", "0"):
            with patch.dict(os.environ, {"EXPERIMENT_MODE": experimental, "GEMINI_MODEL": "primary",
                                         "GEMINI_FALLBACK_MODELS": "fallback1,fallback2"}), \
                 patch("app.AIService", wraps=AIService) as service:
                self.app()
                self.assertEqual(service.call_args.kwargs["models"], ["primary"] if experimental == "1" else ["primary", "fallback1", "fallback2"])

    def test_experimental_classification_fallback_is_explicit_and_still_contestable(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create(enabled=True)
        person = self.join(access, 0)
        original = "Quero preservar a preocupação sobre acessibilidade"
        widget(person, "radio", "Minha posição sobre esta versão").set_value("NAO_ACEITO")
        widget(person, "text_area", "Justificativa e ressalvas").set_value(original)
        widget(person, "button", "Salvar manifestação").click().run()
        moderator.run()
        self.assertIn("SEM_CHAVE", self.rendered_text(moderator))
        widget(moderator, "selectbox", "Revisar categoria").set_value("CAT07")
        widget(moderator, "button", "Classificar como fallback técnico").click().run()
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        row = current_responses(snap)[0]
        self.assertEqual((row["classification_status"], row["category"], row["argument"]), ("FALLBACK_HUMANO", "CAT07", original))
        self.assertIsNone(row["category_ai"])
        self.assertIn("manualmente devido a falha técnica da IA", self.rendered_text(moderator))
        person.run()
        widget(person, "selectbox", "Categoria que considero mais adequada").set_value("CAT05")
        widget(person, "button", "Contestar categoria").click().run()
        moderator.run()
        widget(moderator, "selectbox", "Revisar categoria").set_value("CAT05")
        widget(moderator, "button", "Salvar categoria final").click().run()
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(snap["category_contests"][0]["status"], "RESOLVIDA")
        self.assertEqual(current_responses(snap)[0]["classification_status"], "FALLBACK_HUMANO")
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        self.assertFalse(any(w.label == "Salvar mediação manual" for w in moderator.button))

    def mediation_failure_setup(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create(enabled=True)
        self.seed_other_response(access, "Preocupação preservada para as duas execuções")
        moderator.run()
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        return moderator, access

    def test_second_mediation_failure_removes_retry_and_allows_only_technical_cancellation(self):
        failure = {"origin": "IA", "ok": False, "failure_code": "SERVICO_INDISPONIVEL", "model": DEFAULT_MODEL,
                   "prompt_version": "mediacao-v1", "duration_ms": 1}
        with patch("ai_service.AIService.mediate", return_value=failure) as mediate:
            moderator, access = self.mediation_failure_setup()
            widget(moderator, "button", "Gerar sugestão com IA").click().run()
            self.assertIn("última execução controlada", self.rendered_text(moderator))
            self.assertTrue(widget(moderator, "button", "Reabrir coleta desta versão").disabled)
            first = self.repo.snapshot(access["code"], access["moderator_token"])
            self.assertEqual([m["status"] for m in first["mediations"]], ["FALHA"])
            widget(moderator, "button", "Tentar mediação IA novamente").click().run()
            self.assertIn("não pode continuar na condição A", self.rendered_text(moderator))
            labels = [w.label for w in moderator.button]
            for label in ("Gerar sugestão com IA", "Tentar mediação IA novamente", "Publicar nova versão", "Salvar mediação manual"):
                self.assertNotIn(label, labels)
            snap = self.repo.snapshot(access["code"], access["moderator_token"])
            self.assertEqual(len(snap["mediations"]), 2)
            self.assertEqual(snap["room"]["revision"], first["room"]["revision"])
            widget(moderator, "button", "Cancelar sessão por falha técnica").click().run()
            snap = self.repo.snapshot(access["code"], access["moderator_token"])
            self.assertEqual(snap["room"]["result"], "CANCELADA")
            self.assertTrue(all(m["status"] == "FALHA" and m["failure_code"] == "SERVICO_INDISPONIVEL" for m in snap["mediations"]))
            self.assertTrue(all(not m["summary"] and not m["suggested_text"] for m in snap["mediations"]))
            self.assertEqual(mediate.call_count, 2)
            calls = [args.args[0] for args in mediate.call_args_list]
            self.assertEqual(current_responses(calls[0]), current_responses(calls[1]))
            self.assertEqual(calls[0]["room"]["revision"], calls[1]["room"]["revision"])

    def test_second_mediation_success_allows_normal_reviewed_publication(self):
        failure = {"origin": "IA", "ok": False, "failure_code": "TEMPO_ESGOTADO", "model": DEFAULT_MODEL, "prompt_version": "mediacao-v1"}
        success = {"origin": "IA", "ok": True, "model": DEFAULT_MODEL, "prompt_version": "mediacao-v1",
                   "summary": "Síntese da segunda execução", "suggested_text": "Proposta da segunda execução", "details": {"coverage": []}}
        with patch("ai_service.AIService.mediate", side_effect=[failure, success]):
            moderator, access = self.mediation_failure_setup()
            widget(moderator, "button", "Gerar sugestão com IA").click().run()
            widget(moderator, "button", "Tentar mediação IA novamente").click().run()
            self.assertTrue(widget(moderator, "button", "Gerar sugestão com IA").disabled)
            widget(moderator, "checkbox", "Confirmo a publicação sem alteração de conteúdo.").set_value(True)
            widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
            widget(moderator, "button", "Publicar nova versão").click().run()
            snap = self.repo.snapshot(access["code"], access["moderator_token"])
            self.assertEqual(current_proposal(snap)["round"], 2)
            self.assertEqual([m["status"] for m in snap["mediations"]], ["FALHA", "OK"])
            self.assertEqual(current_proposal(snap)["source_mediation_id"], snap["mediations"][1]["id"])

    def test_session_configuration_change_blocks_operations_instead_of_switching_model(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create(enabled=True)
        with patch.dict(os.environ, {"GEMINI_MODEL": "different-model"}):
            moderator.run()
        self.assertIn("difere da fixada nesta sessão", self.rendered_text(moderator))
        self.assertFalse(any(w.label in ("Gerar sugestão com IA", "Publicar nova versão") for w in moderator.button))
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        config = json.loads(next(e for e in snap["events"] if e["action"] == "CONFIGURACAO_IA_FIXADA")["payload_json"])
        self.assertEqual(config["model"], DEFAULT_MODEL)
        self.assertEqual(snap["mediations"], [])

    def test_database_read_failure_does_not_expose_private_exception_or_fabricate_state(self):
        moderator, access = self.create()
        with patch("decision.Repository.snapshot", side_effect=RuntimeError("DO_NOT_EXPOSE_DB_DETAILS")):
            moderator.run()
        text = self.rendered_text(moderator)
        self.assertIn("Não foi possível salvar ou ler os dados", text)
        self.assertNotIn("DO_NOT_EXPOSE_DB_DETAILS", text)
        self.assertFalse(moderator.radio)
        self.assertEqual(self.repo.snapshot(access["code"], access["moderator_token"])["responses"], [])

    def test_experimental_export_has_manifest_timestamped_names_and_build_only_for_moderator(self):
        import streamlit as st
        from experiment_config import EXPERIMENT_RELEASE
        build = "c" * 40
        with patch.dict(os.environ, {"EXPERIMENT_MODE": "1", "APP_COMMIT": build}), \
             patch("app.st.download_button", wraps=st.download_button) as downloads:
            moderator, access = self.create(enabled=False)
            json_call = next(c for c in reversed(downloads.call_args_list) if c.args[0] == "Baixar histórico completo (JSON)")
            csv_call = next(c for c in reversed(downloads.call_args_list) if c.args[0] == "Baixar manifestações (CSV)")
            data = json.loads(json_call.args[1])
            self.assertEqual(data["experiment"]["condition"], "B")
            self.assertEqual(data["experiment"]["app_commit"], build)
            self.assertEqual(data["experiment"]["experiment_release"], EXPERIMENT_RELEASE)
            self.assertRegex(json_call.kwargs["file_name"], f"^experimento_{access['code']}_" + r"\d{8}T\d{12}Z\.json$")
            self.assertEqual(csv_call.kwargs["file_name"], json_call.kwargs["file_name"].replace("experimento_", "manifestacoes_").replace(".json", ".csv"))
            self.assertNotIn(access["moderator_token"], json_call.args[1])
            self.assertIn("Versão experimental: " + EXPERIMENT_RELEASE, self.rendered_text(moderator))
            self.assertIn("Build: " + build, self.rendered_text(moderator))
            person = self.join(access, 0)
            self.assertNotIn("Build:", self.rendered_text(person))
            self.assertNotIn(build, self.rendered_text(person))
            self.assertFalse(person.get("download_button"))
            widget(person, "button", "Salvar manifestação").click().run()
            self.assertFalse(person.get("download_button"))
            self.assertNotIn("Build:", self.rendered_text(person))

    def test_experimental_default_candidate_is_used_when_model_is_unset(self):
        import streamlit as st
        with patch.dict(os.environ, {"EXPERIMENT_MODE": "1", "GEMINI_API_KEY": ""}), \
             patch("app.st.download_button", wraps=st.download_button) as downloads:
            os.environ.pop("GEMINI_MODEL", None)
            moderator, _ = self.create(enabled=True)
            call = next(c for c in reversed(downloads.call_args_list) if c.args[0] == "Baixar histórico completo (JSON)")
            manifest = json.loads(call.args[1])["experiment"]
            self.assertEqual(manifest["model"], "gemini-3.5-flash-lite")
            self.assertEqual(manifest["temperature_policy"], "provider_default")
            self.assertFalse(moderator.exception)

    def test_first_a_export_uses_recorded_model_configuration_and_missing_build_is_explicit(self):
        import streamlit as st
        with patch.dict(os.environ, {"EXPERIMENT_MODE": "1", "APP_COMMIT": "", "GEMINI_MODEL": "modelo-de-teste"}), \
             patch("app.st.download_button", wraps=st.download_button) as downloads:
            moderator, _ = self.create(enabled=True)
            call = next(c for c in reversed(downloads.call_args_list) if c.args[0] == "Baixar histórico completo (JSON)")
            manifest = json.loads(call.args[1])["experiment"]
            self.assertEqual(manifest["condition"], "A")
            self.assertEqual(manifest["model"], "modelo-de-teste")
            self.assertEqual(manifest["classification_prompt_version"], "classificacao-v1")
            self.assertEqual(manifest["mediation_prompt_version"], "mediacao-v1")
            self.assertIsNone(manifest["temperature"])
            self.assertEqual(manifest["temperature_policy"], "provider_default")
            self.assertEqual(manifest["ai_configuration_status"], "recorded")
            self.assertIsNone(manifest["app_commit"])
            self.assertIn("Build: não informado", self.rendered_text(moderator))
            self.assertFalse(moderator.exception)

    def test_generic_export_keeps_generic_names_and_does_not_claim_condition_a_or_b(self):
        import streamlit as st
        with patch("app.st.download_button", wraps=st.download_button) as downloads:
            moderator, access = self.create(enabled=False)
            call = next(c for c in reversed(downloads.call_args_list) if c.args[0] == "Baixar histórico completo (JSON)")
            manifest = json.loads(call.args[1])["experiment"]
            self.assertFalse(manifest["experimental_mode"])
            self.assertIsNone(manifest["condition"])
            self.assertEqual(call.kwargs["file_name"], f"historico_{access['code']}.json")
            self.assertNotIn("Versão experimental:", self.rendered_text(moderator))

    def scenario_revision_setup(self, enabled=False):
        os.environ["EXPERIMENT_MODE"] = "1"
        moderator, access = self.create(enabled=enabled, scenario=True)
        repo, proposal_id, _ = self.seed_other_response(access, "SIGILO_FINANCEIRO — condição sobre orçamento")
        moderator.run()
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        if enabled:
            snap = repo.snapshot(access["code"], access["moderator_token"])
            repo.save_mediation(access["code"], access["moderator_token"], proposal_id, snap["room"]["revision"], {
                "origin": "IA", "ok": True, "summary": "Síntese consultiva", "suggested_text": "Texto revisado para distribuição",
                "details": {"coverage": [{"participant": "P02", "treatment": "PARCIAL", "note": "Condição parcialmente incorporada"}]},
            })
            moderator.run()
        else:
            self.fill_manual_form(moderator, access, "Texto revisado para distribuição")
        return moderator, access

    def test_financial_scenario_is_default_only_in_experimental_creation(self):
        os.environ["EXPERIMENT_MODE"] = "1"
        landing = self.app()
        self.assertTrue(widget(landing, "checkbox", "Usar cenário experimental de orçamento escolar").value)
        self.assertEqual(widget(landing, "text_area", "Texto da proposta inicial").value, SCENARIO_INITIAL_TEXT)
        self.assertIn("R$ 80.000", widget(landing, "text_area", "Contexto e restrições conhecidas").value)
        os.environ["EXPERIMENT_MODE"] = "0"
        generic = self.app()
        self.assertFalse(any(w.label == "Usar cenário experimental de orçamento escolar" for w in generic.checkbox))

    def test_a_and_b_share_five_financial_fields_reject_over_budget_and_publish_valid_allocation(self):
        for enabled in (False, True):
            with self.subTest(ai_enabled=enabled):
                moderator, access = self.scenario_revision_setup(enabled)
                for code, item in SCENARIO_ITEMS.items():
                    self.assertEqual(widget(moderator, "number_input", item["name"] + " — valor em R$").value, SCENARIO_INITIAL_ALLOCATION[code])
                label = SCENARIO_ITEMS["CAT_INV01"]["name"] + " — valor em R$"
                widget(moderator, "number_input", label).set_value(25001).run()
                self.assertIn("não pode ultrapassar R$ 80.000", self.rendered_text(moderator))
                self.assertTrue(widget(moderator, "button", "Publicar nova versão").disabled)
                self.assertEqual(len(self.repo.snapshot(access["code"], access["moderator_token"])["proposals"]), 1)
                widget(moderator, "number_input", label).set_value(20000).run()
                self.assertIn("Total distribuído: R$ 75.000", self.rendered_text(moderator))
                self.assertIn("Saldo não alocado: R$ 5.000", self.rendered_text(moderator))
                widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
                if enabled:
                    widget(moderator, "checkbox", "Confirmo a publicação sem alteração de conteúdo.").set_value(True)
                widget(moderator, "button", "Publicar nova versão").click().run()
                self.assertIn("Confirme os valores financeiros", self.rendered_text(moderator))
                self.assertEqual(len(self.repo.snapshot(access["code"], access["moderator_token"])["proposals"]), 1)
                widget(moderator, "checkbox", "Conferi os cinco valores estruturados e sua coerência com o texto publicado.").set_value(True)
                widget(moderator, "button", "Publicar nova versão").click().run()
                self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])
                data = research_export(self.repo.snapshot(access["code"], access["moderator_token"]))
                self.assertEqual(data["proposals"][-1]["round"], 2)
                self.assertEqual(data["proposals"][-1]["allocation"]["items"]["CAT_INV01"], 20000)
                self.assertEqual((data["proposals"][-1]["total"], data["proposals"][-1]["unallocated"]), (75000, 5000))

    def test_participant_sees_v1_financial_proposal_before_answer_but_not_others(self):
        import streamlit as st
        os.environ["EXPERIMENT_MODE"] = "1"
        _, access = self.create(enabled=False, scenario=True)
        marker = "SIGILO_FINANCEIRO_P02 antes da resposta alheia"
        self.seed_other_response(access, marker)
        with patch("app.st.table", wraps=st.table) as tables:
            person = self.join(access, 0)
        self.assert_blind(person, marker, "P02", "CAT07")
        self.assertEqual(tables.call_count, 1)
        rows = tables.call_args.args[0]
        self.assertEqual(len(rows), 5)
        self.assertEqual([r["Valor alocado"] for r in rows], ["R$ 25.000", "R$ 25.000", "R$ 10.000", "R$ 15.000", "R$ 5.000"])
        self.assertIn("Total distribuído: R$ 80.000", self.rendered_text(person))
        self.assertIn("Saldo não alocado: R$ 0", self.rendered_text(person))
        widget(person, "button", "Salvar manifestação").click().run()
        self.assertIn(marker, self.rendered_text(person))

    def test_v2_financial_values_are_visible_while_new_responses_remain_blind(self):
        import streamlit as st
        moderator, access = self.scenario_revision_setup(False)
        label = SCENARIO_ITEMS["CAT_INV01"]["name"] + " — valor em R$"
        widget(moderator, "number_input", label).set_value(20000).run()
        widget(moderator, "checkbox", "Conferi os cinco valores estruturados e sua coerência com o texto publicado.").set_value(True)
        widget(moderator, "checkbox", "Revisei este texto e quero solicitar novas manifestações de todos.").set_value(True)
        widget(moderator, "button", "Publicar nova versão").click().run()
        marker = "SIGILO_FINANCEIRO_P02_R2 outra preocupação"
        self.seed_other_response(access, marker)
        with patch("app.st.table", wraps=st.table) as tables:
            person = self.join(access, 0)
        self.assert_blind(person, marker, "P02", "CAT07", "SIGILO_FINANCEIRO")
        self.assertEqual(tables.call_count, 1)
        self.assertEqual(tables.call_args.args[0][0]["Valor alocado"], "R$ 20.000")
        self.assertIn("Total distribuído: R$ 75.000", self.rendered_text(person))
        self.assertIn("Saldo não alocado: R$ 5.000", self.rendered_text(person))
        self.assertEqual(widget(person, "metric", "Rodada").value, "2 / 3")

    def test_financial_recalculation_keeps_review_draft_and_requires_new_value_confirmation(self):
        moderator, _ = self.scenario_revision_setup(False)
        draft = "Texto humano em revisão que deve continuar disponível"
        widget(moderator, "text_area", "Texto revisado a ser apresentado ao grupo").set_value(draft).run()
        widget(moderator, "checkbox", "Conferi os cinco valores estruturados e sua coerência com o texto publicado.").set_value(True).run()
        label = SCENARIO_ITEMS["CAT_INV01"]["name"] + " — valor em R$"
        widget(moderator, "number_input", label).set_value(20000).run()
        self.assertEqual(widget(moderator, "text_area", "Texto revisado a ser apresentado ao grupo").value, draft)
        self.assertFalse(widget(moderator, "checkbox", "Conferi os cinco valores estruturados e sua coerência com o texto publicado.").value)
        self.assertIn("Saldo não alocado: R$ 5.000", self.rendered_text(moderator))

    def test_no_api_key_preserves_vote_and_allows_human_workflow(self):
        moderator, access = self.create(enabled=True)
        person = self.join(access, 0)
        widget(person, "radio", "Minha posição sobre esta versão").set_value("ACEITO_COM_RESSALVAS")
        widget(person, "text_area", "Justificativa e ressalvas").set_value("Aceito, mas gostaria de acompanhar o horário")
        widget(person, "button", "Salvar manifestação").click().run()
        self.assertFalse(person.exception, [str(e) for e in person.exception])
        snap = self.repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(current_responses(snap)[0]["classification_status"], "SEM_CHAVE")
        moderator.run()
        widget(moderator, "button", "Pausar coleta e revisar").click().run()
        self.assertTrue(widget(moderator, "button", "Gerar sugestão com IA").disabled)
        self.assertFalse(moderator.exception, [str(e) for e in moderator.exception])


if __name__ == "__main__":
    unittest.main()
