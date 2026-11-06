import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from ai_service import AIService, failure_message, sanitize_external_text
from decision import Repository, current_proposal, current_responses, UNCHANGED_REVIEW_NOTE
from experiment_config import SCENARIO_INITIAL_TEXT, SCENARIO_INITIAL_ALLOCATION, EXPERIMENT_SCENARIO_VERSION


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

    def service(self, outputs, models=None, experimental_mode=False):
        client = FakeClient(outputs)
        service = AIService("fake-test-key", models=models, client_factory=lambda **kwargs: client,
                            experimental_mode=experimental_mode)
        return service, client

    def mediation(self, coverage=None):
        return json.dumps({"summary": "Prazo em discussão", "suggested_text": "Ampliar o prazo com acompanhamento",
                           "coverage": coverage if coverage is not None else [
                               {"participant": "P01", "treatment": "PARCIAL", "note": "Prazo ampliado; duração ainda será decidida"}]})

    def test_sanitizer_removes_identifiers_but_preserves_scenario_money(self):
        text = ("Contato teste@example.org, +55 (21) 98765-4321, (11) 3456-7890, "
                "21987654321; CPF 123.456.789-09; RG: 12.345.678-9; matrícula 123456; "
                "CNPJ 12.345.678/0001-90. R$ 80.000; R$ 25.000; R$ 10.000.")
        clean = sanitize_external_text(text)
        for private in ("teste@example.org", "98765", "3456-7890", "21987654321", "123.456", "12.345", "123456"):
            self.assertNotIn(private, clean)
        for marker in ("[EMAIL_REMOVIDO]", "[TELEFONE_REMOVIDO]", "[DOCUMENTO_REMOVIDO]"):
            self.assertIn(marker, clean)
        for amount in ("R$ 80.000", "R$ 25.000", "R$ 10.000"):
            self.assertIn(amount, clean)
        self.assertEqual(sanitize_external_text(clean), clean)

    def test_classification_sanitizes_all_external_text_without_local_changes(self):
        private = "contato@example.org (21) 98765-4321 123.456.789-09 R$ 80.000"
        for mode in (False, True):
            snap = json.loads(json.dumps(self.snapshot))
            snap["room"]["theme"] = private
            snap["room"]["context"] = private
            snap["proposals"][0]["text"] = private
            before = json.dumps(snap)
            service, client = self.service([json.dumps({"has_objection": True, "category": "CAT07"})],
                                          experimental_mode=mode)
            self.assertTrue(service.classify(snap, "NAO_ACEITO", private)["ok"])
            data = json.loads(client.calls[0]["contents"])
            for key in ("theme", "context", "proposal", "argument"):
                self.assertEqual(data[key], sanitize_external_text(private))
            for forbidden in ("participant_id", "alias", "P01", "Nome privado", "contato@example.org", "98765", "123.456"):
                self.assertNotIn(forbidden, client.calls[0]["contents"])
            self.assertEqual(json.dumps(snap), before)

    def test_experimental_mediation_uses_ephemeral_ids_and_remaps_persisted_coverage(self):
        repo = Repository(sqlite_path=Path(self.tmp.name) / "privacy.db", experimental_mode=True)
        access = repo.create_room("R$ 80.000", "Contato contexto@example.org", "R$ 25.000", 3)
        code, admin = access["code"], access["moderator_token"]
        proposal = current_proposal(repo.snapshot(code, admin))["id"]
        original = "Justificativa teste@example.org (21) 98765-4321 CPF 123.456.789-09 R$ 10.000"
        # Reverse response order ensures remapping does not assume M01 == P01.
        for i in (1, 0):
            repo.submit_response(code, access["invitations"][i]["token"], proposal, "NAO_ACEITO", original)
        repo.set_phase(code, admin, proposal, "REVISAO")
        snap = repo.snapshot(code, admin)
        before = json.dumps(snap)
        coverage = [{"participant": f"M{i:02d}", "treatment": "PARCIAL", "note": "Requer revisão"} for i in (1, 2)]
        service, client = self.service([self.mediation(coverage)], experimental_mode=True)
        result = service.mediate(snap)
        self.assertTrue(result["ok"])
        data = json.loads(client.calls[0]["contents"])
        self.assertEqual(data["missing_count"], 1)
        self.assertNotIn("missing", data)
        self.assertEqual([r["participant"] for r in data["responses"]], ["M01", "M02"])
        for r in data["responses"]:
            self.assertEqual(set(r), {"participant", "position", "argument", "category"})
            self.assertEqual(r["argument"], sanitize_external_text(original))
        sent = client.calls[0]["contents"]
        for forbidden in ("P01", "P02", "P03", "participant_id", "alias", "token", "teste@example.org", "contexto@example.org", "98765", "123.456"):
            self.assertNotIn(forbidden, sent)
        self.assertEqual([c["participant"] for c in result["details"]["coverage"]],
                         [r["pseudonym"] for r in current_responses(snap)])
        self.assertEqual(json.dumps(snap), before)
        repo.save_mediation(code, admin, proposal, snap["room"]["revision"], result)
        saved = repo.snapshot(code, admin)
        self.assertEqual(json.loads(saved["mediations"][0]["details_json"])["coverage"], result["details"]["coverage"])
        self.assertTrue(all(r["argument"] == original for r in saved["responses"]))

    def test_experimental_coverage_rejects_persistent_or_unknown_ids(self):
        for ids in (("P01",), ("M99",), (), ("M01", "M01")):
            coverage = [{"participant": i, "treatment": "PARCIAL", "note": "Revisar"} for i in ids]
            service, _ = self.service([self.mediation(coverage)], experimental_mode=True)
            self.assertFalse(service.mediate(self.snapshot)["ok"])

    @patch("ai_service.time.sleep")
    def test_experimental_model_never_switches_to_configured_fallback(self, sleep):
        error = RuntimeError("private provider message")
        error.code = 503
        service, client = self.service([error] * 3 + [self.mediation()], models=["primary", "fallback"], experimental_mode=True)
        self.assertEqual(service.models, ["primary"])
        result = service.mediate(self.snapshot)
        self.assertFalse(result["ok"])
        self.assertEqual(result["model"], "primary")
        self.assertEqual(len(client.calls), 3)
        self.assertEqual({c["model"] for c in client.calls}, {"primary"})
        self.assertNotIn("suggested_text", result)

    @patch("ai_service.time.sleep")
    def test_experimental_nontransient_failure_is_not_retried_or_switched(self, sleep):
        error = RuntimeError("private")
        error.code = 404
        service, client = self.service([error, self.mediation()], models=["primary", "fallback"], experimental_mode=True)
        self.assertEqual(service.mediate(self.snapshot)["failure_code"], "MODELO_INDISPONIVEL")
        self.assertEqual(len(client.calls), 1)
        sleep.assert_not_called()

    @patch("ai_service.time.sleep")
    def test_all_transient_codes_and_timeout_have_three_internal_attempts(self, sleep):
        for code in (500, 502, 503, 504, None):
            with self.subTest(code=code):
                sleep.reset_mock()
                error = TimeoutError("private") if code is None else RuntimeError("private")
                if code is not None:
                    error.code = code
                service, client = self.service([error] * 3, experimental_mode=True)
                result = service.mediate(self.snapshot)
                self.assertFalse(result["ok"])
                self.assertEqual(len(client.calls), 3)
                self.assertEqual([c.args[0] for c in sleep.call_args_list], [2, 4])
                self.assertNotIn("private", json.dumps(result))

    @patch("ai_service.time.sleep")
    def test_controlled_reexecution_keeps_same_model_prompt_payload_and_parameters(self, sleep):
        error = RuntimeError("private")
        error.code = 503
        first, c1 = self.service([error] * 3, models=["primary", "fallback"], experimental_mode=True)
        second, c2 = self.service([self.mediation([{"participant": "M01", "treatment": "PARCIAL", "note": "Condição parcial"}])],
                                   models=["primary", "fallback"], experimental_mode=True)
        self.assertFalse(first.mediate(self.snapshot)["ok"])
        self.assertTrue(second.mediate(self.snapshot)["ok"])
        self.assertEqual(first.experimental_configuration(), second.experimental_configuration())
        self.assertEqual(c1.calls[0], c2.calls[0])
        self.assertNotIn("fake-test-key", json.dumps(first.experimental_configuration()))

    def test_experimental_messages_never_offer_human_mediation_after_ai_failure(self):
        for code in ("COTA_OU_LIMITE", "FALHA_IA", "SERVICO_INDISPONIVEL"):
            self.assertNotIn("mediação humana", failure_message(code, True))
        self.assertIn("mediação humana", failure_message("FALHA_IA", False))

    def test_financial_context_uses_current_structured_allocation_without_changing_ai_output_schema(self):
        repo = Repository(sqlite_path=Path(self.tmp.name) / "scenario.db", experimental_mode=True)
        access = repo.create_room("Escola", "Orçamento", SCENARIO_INITIAL_TEXT, 3, True, scenario_enabled=True)
        code, admin = access["code"], access["moderator_token"]
        proposal = current_proposal(repo.snapshot(code, admin))["id"]
        token = access["invitations"][0]["token"]
        repo.submit_response(code, token, proposal, "NAO_ACEITO", "Rever a distribuição")
        repo.set_phase(code, admin, proposal, "REVISAO")
        snap = repo.snapshot(code, admin)
        source = repo.save_mediation(code, admin, proposal, snap["room"]["revision"], {
            "origin": "IA", "ok": True, "summary": "Resumo", "suggested_text": "Texto explicativo sem números",
        })
        values = dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": 20000}
        proposal = repo.publish_revision(code, admin, proposal, "Texto explicativo sem números", source,
                                         review_note=UNCHANGED_REVIEW_NOTE, allocation=values)
        repo.submit_response(code, token, proposal, "NAO_ACEITO", "Rever a distribuição")
        snap = repo.snapshot(code, admin)
        classifier, c1 = self.service([json.dumps({"has_objection": True, "category": "CAT07"})], experimental_mode=True)
        mediator, c2 = self.service([self.mediation([{"participant": "M01", "treatment": "PARCIAL", "note": "Rever valores"}])], experimental_mode=True)
        self.assertEqual(classifier.classify(snap, "NAO_ACEITO", "Rever a distribuição")["category"], "CAT07")
        self.assertTrue(mediator.mediate(snap)["ok"])
        for client in (c1, c2):
            data = json.loads(client.calls[0]["contents"])
            self.assertEqual(data["allocation"]["items"], values)
            self.assertEqual((data["allocation"]["total"], data["allocation"]["unallocated"]), (75000, 5000))
            self.assertEqual(data["scenario"]["scenario_version"], EXPERIMENT_SCENARIO_VERSION)
            self.assertEqual(data["proposal"], "Texto explicativo sem números")
        self.assertNotIn("participant_id", c2.calls[0]["contents"])
        self.assertNotIn("P01", c2.calls[0]["contents"])

    def test_no_key_is_explicit_failure(self):
        result = AIService().mediate(self.snapshot)
        self.assertFalse(result["ok"])
        self.assertEqual(result["failure_code"], "SEM_CHAVE")
        self.assertNotIn("suggested_text", result)

    @patch("ai_service.time.sleep")
    def test_transient_errors_retry_then_generate_valid_mediation(self, sleep):
        errors = []
        for code in (503, 504):
            error = RuntimeError("private")
            error.code = code
            errors.append(error)
        service, client = self.service(errors + [self.mediation()])
        result = service.mediate(self.snapshot)
        self.assertTrue(result["ok"])
        self.assertEqual(len(client.calls), 3)
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [2, 4])

    @patch("ai_service.time.sleep")
    def test_retry_exhaustion_preserves_failure_and_does_not_invent_suggestion(self, sleep):
        for code, expected in ((503, "SERVICO_INDISPONIVEL"), (504, "TEMPO_ESGOTADO")):
            error = RuntimeError("private")
            error.code = code
            service, client = self.service([error] * 3)
            result = service.mediate(self.snapshot)
            self.assertFalse(result["ok"])
            self.assertEqual(result["failure_code"], expected)
            self.assertEqual(len(client.calls), 3)
            self.assertNotIn("suggested_text", result)
            self.assertTrue(client.closed)

    @patch("ai_service.time.sleep")
    def test_invalid_key_is_not_retried(self, sleep):
        error = RuntimeError("private")
        error.code = 403
        service, client = self.service([error])
        self.assertEqual(service.mediate(self.snapshot)["failure_code"], "ACESSO_API")
        self.assertEqual(len(client.calls), 1)
        sleep.assert_not_called()

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

    def test_experimental_classification_uses_closed_taxonomy(self):
        service, client = self.service(
            [json.dumps({"has_objection": True, "category": "CAT07"})],
            experimental_mode=True,
        )
        result = service.classify(self.snapshot, "NAO_ACEITO", "O valor precisa ser redistribuído")
        self.assertTrue(result["ok"])
        self.assertEqual(result["category"], "CAT07")
        self.assertIn("CAT01", client.calls[0]["contents"])
        self.assertIn("Não crie novos rótulos", client.calls[0]["config"]["system_instruction"])

        invalid, _ = self.service(
            [json.dumps({"has_objection": True, "category": "Custos"})],
            experimental_mode=True,
        )
        self.assertFalse(invalid.classify(self.snapshot, "NAO_ACEITO", "O valor precisa ser redistribuído")["ok"])

        no_objection, _ = self.service(
            [json.dumps({"has_objection": False, "category": "Sem objeção explicitada"})],
            experimental_mode=True,
        )
        accepted = no_objection.classify(self.snapshot, "ACEITO", "")
        self.assertTrue(accepted["ok"])
        self.assertEqual(accepted["category"], "Sem objeção explicitada")

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
