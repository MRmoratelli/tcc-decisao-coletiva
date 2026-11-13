"""Identidade observada do checkout; nunca usa APP_COMMIT nem consulta a rede."""
import re
import subprocess
from pathlib import Path


def checkout_commit():
    """Retorna o HEAD de um checkout sem alterações rastreadas, ou None."""
    options = {"cwd": Path(__file__).resolve().parent, "capture_output": True,
               "text": True, "timeout": 2, "check": False}
    try:
        head = subprocess.run(["git", "rev-parse", "--verify", "HEAD"], **options)
        value = head.stdout.strip()
        if head.returncode or not re.fullmatch(r"[0-9a-f]{40}", value):
            return None
        clean = subprocess.run(["git", "diff", "--quiet", "--no-ext-diff", "HEAD", "--"], **options)
        return value if clean.returncode == 0 else None
    except (OSError, subprocess.SubprocessError):
        return None
