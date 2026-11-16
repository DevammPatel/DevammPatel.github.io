#!/bin/bash
# Rebuild assets/resume.pdf from resume/resume.html with headless Chrome.
#   ./resume/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SRC="file://$(python3 -c 'import urllib.parse,os;print(urllib.parse.quote(os.path.abspath("resume/resume.html")))')"
OUT=assets/resume.pdf

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --hide-scrollbars \
  --virtual-time-budget=10000 --print-to-pdf="$OUT" "$SRC" >/dev/null 2>&1

python3 - "$OUT" <<'PY'
import sys
try:
    from pypdf import PdfReader
except ImportError:
    print("wrote", sys.argv[1]); sys.exit(0)
n = len(PdfReader(sys.argv[1]).pages)
print(f"wrote {sys.argv[1]} ({n} page{'s' if n != 1 else ''})")
if n != 1:
    sys.exit("ERROR: the resume no longer fits on one page. Shorten the text in resume/resume.html and rebuild.")
PY
