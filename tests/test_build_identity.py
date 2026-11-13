import os
import subprocess
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from build_identity import checkout_commit


class CheckoutIdentityTests(unittest.TestCase):
    def test_clean_checkout_is_observed_independently_of_declared_build(self):
        sha = "a" * 40
        with patch.dict(os.environ, {"APP_COMMIT": "b" * 40}), patch("build_identity.subprocess.run", side_effect=[
            SimpleNamespace(returncode=0, stdout=sha + "\n"), SimpleNamespace(returncode=0),
        ]) as run:
            self.assertEqual(checkout_commit(), sha)
        self.assertEqual(run.call_args_list[0].args[0], ["git", "rev-parse", "--verify", "HEAD"])

    def test_dirty_or_invalid_checkout_never_claims_a_verified_build(self):
        for head, dirty in (("a" * 40, 1), ("not-a-sha", 0)):
            with self.subTest(head=head), patch("build_identity.subprocess.run", side_effect=[
                SimpleNamespace(returncode=0, stdout=head), SimpleNamespace(returncode=dirty),
            ]):
                self.assertIsNone(checkout_commit())

    def test_missing_git_and_timeout_remain_explicitly_unknown(self):
        for error in (FileNotFoundError(), subprocess.TimeoutExpired("git", 2)):
            with self.subTest(error=type(error).__name__), patch("build_identity.subprocess.run", side_effect=error):
                self.assertIsNone(checkout_commit())
