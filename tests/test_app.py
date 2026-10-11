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
        self.previous = {name: os.environ.get(name) for name in ("SQLITE_PATH", "DATABASE_URL", "GEMINI_API_KEY")}
        os.environ.update(SQLITE_PATH=str(self.path), DATABASE_URL="", GEMINI_API_KEY="")
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
