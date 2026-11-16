#!/bin/bash
# Rebuild the résumé PDFs from resume/resume.html with headless Chrome.
#
#   ./resume/build.sh                      -> assets/resume.pdf (public, no phone number)
#   ./resume/build.sh "+44 0000 000000"    -> also resume/private/Devamm_Patel_Resume.pdf
#                                             (with phone, for applications; git-ignored)
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SRC="file://$(python3 -c 'import sys,urllib.parse,os;print(urllib.parse.quote(os.path.abspath("resume/resume.html")))')"

render() { # $1 = url, $2 = output
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --hide-scrollbars \
    --virtual-time-budget=10000 --print-to-pdf="$2" "$1" >/dev/null 2>&1
  python3 - "$2" <<'PY'
import sys
try:
    from pypdf import PdfReader
except ImportError:
    sys.exit(0)  # no checker available; skip
n = len(PdfReader(sys.argv[1]).pages)
print(f"wrote {sys.argv[1]} ({n} page{'s' if n != 1 else ''})")
if n != 1:
    sys.exit("ERROR: the résumé no longer fits on one page. Shorten the text in resume/resume.html and rebuild.")
PY
}

render "$SRC" assets/resume.pdf
if [ "${1:-}" != "" ]; then
  mkdir -p resume/private
  Q=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1")
  render "$SRC?phone=$Q" resume/private/Devamm_Patel_Resume.pdf
fi
