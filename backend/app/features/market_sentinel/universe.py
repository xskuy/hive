from __future__ import annotations

import json
from pathlib import Path

from app.features.market_sentinel.types import UniverseTicker


def load_universe(path: str) -> list[UniverseTicker]:
    """Load the versioned ticker universe from disk."""
    payload = json.loads(Path(path).read_text())
    return [UniverseTicker(**item) for item in payload]
