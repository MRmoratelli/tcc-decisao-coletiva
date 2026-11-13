import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ai_service import AIService, DEFAULT_EXPERIMENT_MODEL, DEFAULT_MODEL
from decision import DecisionError, Repository, current_proposal, current_responses, research_export
from experiment_config import SCENARIO_INITIAL_TEXT
from test_ai import FakeClient


class GeminiConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "candidate.db"
        self.repo = Repository(sqlite_path=self.path, experimental_mode=True)
        self.access = self.repo.create_room("Escola", "Orçamento fixo de R$ 80.000", SCENARIO_INITIAL_TEXT,
                                            5, True, scenario_enabled=True)
        self.code, self.admin = self.access["code"], self.access["moderator_token"]
        self.proposal = current_proposal(self.snapshot())["id"]
        self.saved = []
        for person in self.access["invitations"]:
            row = self.repo.submit_response(self.code, person["token"], self.proposal, "NAO_ACEITO", "Rever a distribuição")
            self.saved.append(row)
            self.repo.set_category(self.code, self.admin, self.proposal, row["id"], "CAT07")
        self.config = AIService(experimental_mode=True).experimental_configuration()
        self.repo.ensure_ai_configuration(self.code, self.admin, self.config)

    def tearDown(self):
        self.tmp.cleanup()

    def snapshot(self):
        return self.repo.snapshot(self.code, self.admin)

    def service(self, output, models=None, mode=True):
        client = FakeClient([json.dumps(output)])
        return AIService("fake-test-key", models=models, experimental_mode=mode,
                         client_factory=lambda **kw: client), client

    def test_candidate_default_and_provider_default_are_explicit_without_numeric_guess(self):
        self.assertEqual(DEFAULT_EXPERIMENT_MODEL, "gemini-3.5-flash-lite")
        self.assertEqual(AIService().models, [DEFAULT_MODEL])
        self.assertEqual(AIService(experimental_mode=True).models, [DEFAULT_EXPERIMENT_MODEL])
        self.assertIsNone(self.config["temperature"])
        self.assertEqual(self.config["temperature_policy"], "provider_default")

    def test_gemini3_and_experimental_requests_omit_temperature_and_keep_closed_json(self):
        for models, mode in ((None, True), (["gemini-3.8-flash"], False), (["custom-primary"], True)):
            with self.subTest(models=models, mode=mode):
                service, client = self.service({"has_objection": True, "category": "CAT07"}, models, mode)
                self.assertTrue(service.classify(self.snapshot(), "NAO_ACEITO", "Rever valores")["ok"])
                cfg = client.calls[0]["config"]
                self.assertNotIn("temperature", cfg)
                self.assertEqual(cfg["response_mime_type"], "application/json")
                self.assertIn("response_json_schema", cfg)
                if mode:
                    self.assertEqual(len(cfg["response_json_schema"]["properties"]["category"]["enum"]), 10)
        generic, client = self.service({"has_objection": True, "category": "Orçamento"}, ["gemini-2.5-flash"], False)
        self.assertTrue(generic.classify(self.snapshot(), "NAO_ACEITO", "Rever valores")["ok"])
        self.assertEqual(client.calls[0]["config"]["temperature"], 0)

    def test_request_and_retry_options_are_accepted_by_installed_sdk(self):
        from google.genai import types
        service, client = self.service({"has_objection": True, "category": "CAT05"})
        self.assertTrue(service.classify(self.snapshot(), "NAO_ACEITO", "Mais acessibilidade")["ok"])
        typed = types.GenerateContentConfig(**client.calls[0]["config"])
        self.assertNotIn("temperature", typed.model_dump(exclude_unset=True))
        options = types.HttpOptions(timeout=60000, retry_options={"attempts": 1})
        self.assertEqual(options.retry_options.attempts, 1)

    def test_mediation_requires_complete_unique_ephemeral_coverage_for_five_people(self):
        coverage = [{"participant": f"M{i:02d}", "treatment": "PARCIAL", "note": "Demanda preservada"}
                    for i in range(1, 6)]
        for rows, valid in ((coverage, True), (coverage[:-1], False), (coverage[:-1] + [coverage[0]], False)):
            service, client = self.service({"summary": "Redistribuição sob orçamento fixo",
                "suggested_text": "Rever alocação sem recursos adicionais", "coverage": rows})
            result = service.mediate(self.snapshot())
            self.assertEqual(result["ok"], valid)
            if valid:
                self.assertEqual({x["participant"] for x in result["details"]["coverage"]},
                                 {f"P{i:02d}" for i in range(1, 6)})
                self.assertIn("sdk_version", result["details"])
                self.assertNotIn("temperature", client.calls[0]["config"])

    def test_explicit_zero_and_missing_policy_cannot_start_or_change_candidate_configuration(self):
        before = [e for e in self.snapshot()["events"] if e["action"] == "CONFIGURACAO_IA_FIXADA"]
        missing = dict(self.config)
        del missing["temperature_policy"]
        for config in (self.config | {"temperature": 0}, missing):
            with self.assertRaises(DecisionError):
                self.repo.ensure_ai_configuration(self.code, self.admin, config)
        self.assertEqual([e for e in self.snapshot()["events"] if e["action"] == "CONFIGURACAO_IA_FIXADA"], before)

    def test_legacy_zero_is_exported_as_history_and_new_policy_cannot_override_it(self):
        legacy = self.config | {"temperature": 0}
        del legacy["temperature_policy"]
        snapshot = self.snapshot()
        event = next(e for e in snapshot["events"] if e["action"] == "CONFIGURACAO_IA_FIXADA")
        event["payload_json"] = json.dumps(legacy)
        manifest = research_export(snapshot)["experiment"]
        self.assertEqual(manifest["temperature"], 0)
        self.assertNotIn("temperature_policy", manifest)
        with patch.object(self.repo, "_ai_configuration", return_value=legacy):
            with self.assertRaisesRegex(DecisionError, "difere"):
                self.repo.ensure_ai_configuration(self.code, self.admin, self.config)

    def test_classification_persists_duration_sdk_and_only_safe_diagnostics(self):
        # Uma nova edição remove a revisão manual; resultados atrasados continuam bloqueados.
        row = self.repo.submit_response(self.code, self.access["invitations"][0]["token"], self.proposal,
                                        "NAO_ACEITO", "Rever a distribuição")
        self.assertTrue(self.repo.apply_classification(self.code, self.access["invitations"][0]["token"], self.proposal,
            row["id"], row["edit"], {"ok": False, "failure_code": "SERVICO_INDISPONIVEL",
                "model": DEFAULT_EXPERIMENT_MODEL, "prompt_version": "classificacao-v1", "duration_ms": 17,
                "sdk_version": "2.34.0", "details": {"diagnostics": {"stage": "API_CALL", "http_status": 503,
                    "error_type": "ServerError", "sdk_version": "2.34.0", "api_key": "DO_NOT_LOG"}}}))
        data = research_export(self.snapshot())
        saved = next(r for r in data["responses"] if r["id"] == row["id"])
        self.assertEqual(saved["classification_duration_ms"], 17)
        self.assertEqual(saved["classification_sdk_version"], "2.34.0")
        self.assertEqual(saved["classification_diagnostics"]["http_status"], 503)
        self.assertEqual(saved["argument"], "Rever a distribuição")
        self.assertEqual(saved["position"], "NAO_ACEITO")
        self.assertNotIn("DO_NOT_LOG", json.dumps(data))

    def test_observed_checkout_is_separate_from_declaration_and_not_retroactive(self):
        other = Repository(sqlite_path=self.path, experimental_mode=True, app_commit="a" * 40,
                           checkout_commit="b" * 40)
        old = research_export(other.snapshot(self.code, self.admin))
        self.assertIsNone(old["experiment"]["checkout_commit"])
        self.assertEqual(old["exporter"]["checkout_commit"], "b" * 40)
        access = other.create_room("Escola", "", "Proposta", 5)
        new = research_export(other.snapshot(access["code"], access["moderator_token"]))
        self.assertEqual(new["experiment"]["app_commit"], "a" * 40)
        self.assertEqual(new["experiment"]["checkout_commit"], "b" * 40)
