"""Teste real de widgets Streamlit, sem chamadas externas de IA.

Instale requirements.txt para executar. CI exige que estes testes sejam executados.
"""
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

HAS_STREAMLIT = importlib.util.find_spec("streamlit") is not None
if HAS_STREAMLIT:
    from streamlit.testing.v1 import AppTest
elif os.getenv("APP_TESTS_REQUIRED") == "1":
    raise RuntimeError("Instale Streamlit antes de executar os testes de interface.")

from decision import Repository, current_proposal, current_responses

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

    def create(self, enabled=False):
        app = self.app()
        widget(app, "text_input", "Tema da decisão").set_value("Organização de um evento")
        widget(app, "text_area", "Contexto e restrições conhecidas").set_value("Todos participam remotamente")
        widget(app, "text_area", "Texto da proposta inicial").set_value("Reunião semanal às quartas")
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
            widget(moderator, "text_area", "Texto revisado a ser apresentado ao grupo").set_value(f"Proposta da rodada {round_number}")
            widget(moderator, "text_area", "Justificativa da revisão humana").set_value(f"MEDIAÇÃO_R{round_number - 1} baseada nas objeções")
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
        repo.save_mediation(code, token, proposal_id, snap["room"]["revision"], {
            "origin": "HUMANA", "ok": True, "summary": "MEDIAÇÃO_SIGILOSA_R1",
            "suggested_text": "SUGESTÃO_SIGILOSA_R1",
        })
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
