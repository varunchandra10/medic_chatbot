# backend/__init__.py
import sys
from pathlib import Path

# Automatically inject project root and backend folder into sys.path
_ROOT = Path(__file__).resolve().parent.parent
_BACKEND = Path(__file__).resolve().parent

for _p in (str(_ROOT), str(_BACKEND)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

