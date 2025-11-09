from __future__ import annotations

import json
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from backend.LLM_Score.ScoreCal import score_receipt


def _load_receipt(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"Receipt file not found: {path}")
    return json.loads(path.read_text())


def main() -> None:
    """Tiny helper to run the scorer manually."""
    receipt = _load_receipt(CURRENT_DIR / "sample_receipt.json")
    results = score_receipt(receipt)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
