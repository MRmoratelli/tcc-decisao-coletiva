import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from ai_service import AIService
from decision import Repository, current_proposal


class FakeClient:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = []
        self.closed = False
        self.models = self

    def generate_content(self, **args):
        self.calls.append(args)
        result = self.outputs.pop(0)
        if isinstance(result, Exception):
            raise result
        return SimpleNamespace(text=result)

    def close(self):
        self.closed = True


class AIValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        repo = Repository(sqlite_path=Path(self.tmp.name) / "test.db")
        access = repo.create_room("Regras de uma equipe", "Tema flexível", "Proposta original", ["Nome privado A", "Nome privado B"])
        proposal = current_proposal(repo.snapshot(access["code"], access["moderator_token"]))["id"]
        repo.submit_response(access["code"], access["invitations"][0]["token"], proposal, "NAO_ACEITO", "O prazo é curto")
        self.snapshot = repo.snapshot(access["code"], access["moderator_token"])

    def tearDown(self):
        self.tmp.cleanup()

    def service(self, outputs, models=None):
        client = FakeClient(outputs)
        service = AIService("fake-test-key", models=models, client_factory=lambda **kwargs: client)
        return service, client

    def mediation(self, coverage=None):
        return json.dumps({"summary": "Prazo em discussão", "suggested_text": "Ampliar o prazo com acompanhamento",
                           "coverage": coverage if coverage is not None else [
                               {"participant": "P01", "treatment": "PARCIAL", "note": "Prazo ampliado; duração ainda será decidida"}]})

    def test_no_key_is_explicit_failure(self):
        result = AIService().mediate(self.snapshot)
        self.assertFalse(result["ok"])
        self.assertEqual(result["failure_code"], "SEM_CHAVE")
        self.assertNotIn("suggested_text", result)

    def test_mediation_sends_pseudonyms_and_exposes_missing_people(self):
        service, client = self.service([self.mediation()])
        result = service.mediate(self.snapshot)
        self.assertTrue(result["ok"])
        sent = client.calls[0]["contents"]
        self.assertNotIn("Nome privado", sent)
        data = json.loads(sent)
        self.assertEqual(data["missing"], ["P02"])
        self.assertEqual(data["responses"][0]["pseudonym"], "P01")
        self.assertTrue(client.closed)

    def test_json_empty_or_malformed_is_not_mediation(self):
        for output in (None, "", "texto livre", "{}", "[]"):
            with self.subTest(output=output):
                service, _ = self.service([output])
                result = service.mediate(self.snapshot)
                self.assertFalse(result["ok"])
                self.assertEqual(result["failure_code"], "RESPOSTA_INVALIDA")

    def test_omitted_or_invented_participant_is_rejected(self):
        for coverage in ([], [{"participant": "P99", "treatment": "CONTEMPLADA", "note": "x"}]):
            service, _ = self.service([self.mediation(coverage)])
            self.assertFalse(service.mediate(self.snapshot)["ok"])

    def test_quota_failure_not_replaced_by_generic_pilot(self):
        error = RuntimeError("DO-NOT-EXPOSE-secret")
        error.code = 429
        service, _ = self.service([error])
        result = service.mediate(self.snapshot)
        self.assertEqual(result["failure_code"], "COTA_OU_LIMITE")
        self.assertNotIn("DO-NOT-EXPOSE", json.dumps(result))
        self.assertNotIn("suggested_text", result)

    def test_configured_fallback_records_actual_model(self):
        error = RuntimeError("Model not found")
        error.code = 404
        service, client = self.service([error, self.mediation()], models=["first", "second"])
        result = service.mediate(self.snapshot)
        self.assertTrue(result["ok"])
        self.assertEqual(result["model"], "second")
        self.assertNotIn("failure_code", result)
        self.assertNotIn("diagnostics", result.get("details", {}))
        self.assertEqual(len(client.calls), 2)

    def test_invalid_api_key_reason_is_actionable_without_exposing_response(self):
        error = RuntimeError("DO-NOT-EXPOSE-private-key")
        error.code = 400
        error.details = {"error": {"message": "DO-NOT-EXPOSE-private-key", "details": [
            {"reason": "API_KEY_INVALID", "metadata": {"private": "DO-NOT-EXPOSE-private-key"}}]}}
        service, _ = self.service([error])
        result = service.mediate(self.snapshot)
        self.assertEqual(result["failure_code"], "ACESSO_API")
        diagnostic = result["details"]["diagnostics"]
        self.assertEqual(diagnostic["http_status"], 400)
        self.assertEqual(diagnostic["reason"], "API_KEY_INVALID")
        self.assertEqual(diagnostic["stage"], "API_CALL")
        self.assertNotIn("DO-NOT-EXPOSE", json.dumps(result))

    def test_initialization_failure_is_distinguished_without_private_message(self):
        def broken_factory(**kwargs):
            raise ImportError("DO-NOT-EXPOSE-initialization-secret")
        service = AIService("fake-test-key", client_factory=broken_factory)
        result = service.mediate(self.snapshot)
        diagnostic = result["details"]["diagnostics"]
        self.assertEqual(diagnostic["stage"], "CLIENT_INIT")
        self.assertEqual(diagnostic["error_type"], "ImportError")
        self.assertIsNone(diagnostic["http_status"])
        self.assertNotIn("DO-NOT-EXPOSE", json.dumps(result))

    def test_approval_comment_can_contain_objection(self):
        service, client = self.service([json.dumps({"has_objection": True, "category": "Acessibilidade"})])
        result = service.classify(self.snapshot, "ACEITO", "Aceito, mas acompanhem a acessibilidade.")
        self.assertTrue(result["ok"])
        self.assertEqual(result["category"], "Acessibilidade")
        self.assertIn("Acessibilidade".lower(), client.calls[0]["contents"].lower())

    def test_ai_cannot_hide_explicit_reservation(self):
        service, _ = self.service([json.dumps({"has_objection": False, "category": ""})])
        self.assertFalse(service.classify(self.snapshot, "ACEITO_COM_RESSALVAS", "Tenho uma ressalva")["ok"])

    def test_category_type_and_length_are_validated(self):
        for payload in ({"has_objection": "false", "category": "Custos"},
                        {"has_objection": True, "category": "x" * 121},
                        {"has_objection": True, "category": ""}):
            service, _ = self.service([json.dumps(payload)])
            self.assertFalse(service.classify(self.snapshot, "NAO_ACEITO", "Custo")["ok"])

    def test_prompt_input_does_not_change_vote_by_api_output(self):
        service, client = self.service([self.mediation()])
        service.mediate(self.snapshot)
        self.assertIn("não como instruções", client.calls[0]["config"]["system_instruction"])
        # Serviço da IA não recebe objeto Repository nem credenciais de participantes.
        self.assertEqual(self.snapshot["responses"][0]["position"], "NAO_ACEITO")


if __name__ == "__main__":
    unittest.main()
