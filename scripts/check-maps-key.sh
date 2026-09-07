#!/usr/bin/env bash
# Diagnose a Google Maps API key: which APIs are on, and what is wrong if not.
#
#   ./scripts/check-maps-key.sh            # tests the key in .env.local
#   ./scripts/check-maps-key.sh AIza…      # tests a key you paste on the command line
#
# The key is never printed — only its prefix and length, which is what the
# handover runbook allows to be shared.
#
# Four of the five APIs this app needs have REST endpoints and are tested for
# real. Maps JavaScript API has none: it is a browser library, and the only
# honest way to check it is the browser console. Do not trust any terminal
# "test" of it — the auth endpoint answers about the shape of the request, not
# about your key, so it reports confident nonsense.
set -uo pipefail

KEY="${1:-}"
if [ -z "$KEY" ]; then
  [ -f .env.local ] || { echo "No .env.local here, and no key given. Run from the repo root."; exit 1; }
  KEY=$(grep '^GOOGLE_MAPS_API_KEY=' .env.local | cut -d= -f2- | tr -d '"'"'"'')
fi
[ -n "$KEY" ] || { echo "GOOGLE_MAPS_API_KEY is empty."; exit 1; }

RAW_LEN=${#KEY}
CLEAN=$(printf %s "$KEY" | tr -d '[:space:]')
echo "Key:  prefix=${CLEAN:0:4}…  length=${#CLEAN}"
[ "$RAW_LEN" -ne "${#CLEAN}" ] && echo "  !!  Whitespace in or around the key. Strip it — this alone breaks it."
case "$CLEAN" in AIza*) ;; *) echo "  !!  A Maps key normally starts with 'AIza'. This one does not." ;; esac
[ "${#CLEAN}" -ne 39 ] && echo "  !!  Expected 39 characters — looks truncated or over-copied."
echo

python3 - "$CLEAN" <<'PYEOF'
import json, sys, urllib.parse, urllib.request

key = sys.argv[1]
B = "https://maps.googleapis.com/maps/api/"

# The app calls the *legacy* Places endpoints (place/autocomplete/json), so this
# probes those specifically. Enabling only "Places API (New)" leaves them dead.
PROBES = [
    ("Places API",    "place/autocomplete/json", {"input": "Drottninggatan"}),
    ("Geocoding API", "geocode/json",            {"address": "Stockholm"}),
    ("Directions API","directions/json",         {"origin": "Stockholm", "destination": "Uppsala"}),
    ("Maps Static API","staticmap",              {"center": "Stockholm", "zoom": "10", "size": "100x100"}),
]

def classify(status, msg):
    m = (msg or "").lower()
    if "enable billing" in m or "billing" in m:            return "BILLING",    "billing is not linked to the project"
    if "not authorized" in m or "has not been used" in m or "is disabled" in m:
        return "OFF",       "this API is not enabled"
    if "referer" in m or "referrer" in m or "ip, ip range" in m:
        return "RESTRICTED","the key's restrictions block this call"
    if "legacy api" in m or "places api (new)" in m or "not enabled for your project" in m:
        return "LEGACY",    "the legacy API this app calls is unavailable on this project"
    if "api key not valid" in m or "invalid" in m:         return "BADKEY",    "Google rejected the key"
    if status in ("OK", "ZERO_RESULTS"):                   return "ON",        ""
    return "?", (msg or status or "unrecognised response")

results = []
for name, path, params in PROBES:
    url = B + path + "?" + urllib.parse.urlencode({**params, "key": key})
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            body, code = r.read(), r.status
    except urllib.error.HTTPError as e:
        body, code = e.read(), e.code
    except Exception as e:
        results.append((name, "?", "network error: %s" % e)); continue

    if path == "staticmap":
        if code == 200 and body[:4] in (b"\x89PNG", b"\xff\xd8\xff\xe0", b"GIF8"):
            state, why = "ON", ""
        else:
            state, why = classify("", body.decode("utf-8", "replace"))
    else:
        try:
            d = json.loads(body.decode("utf-8", "replace"))
        except Exception:
            results.append((name, "?", "unparseable response")); continue
        state, why = classify(d.get("status", ""), d.get("error_message", ""))
    # Keep Google's own words: an unclassified message is the useful one.
    if path == "staticmap":
        raw = "" if state == "ON" else body.decode("utf-8", "replace").strip()[:300]
    else:
        raw = "" if state == "ON" else ("%s — %s" % (d.get("status", "?"), d.get("error_message", "(no message)")))
    results.append((name, state, raw))

LABEL = {"ON": "enabled", "OFF": "NOT ENABLED", "BILLING": "BILLING NOT LINKED",
         "RESTRICTED": "BLOCKED BY RESTRICTIONS", "BADKEY": "KEY REJECTED",
         "LEGACY": "LEGACY API UNAVAILABLE", "?": "UNRECOGNISED — see message"}
print("  %-22s %s" % ("Maps JavaScript API", "cannot be tested here — read the browser console"))
for name, state, raw in results:
    print("  %-22s %s" % (name, LABEL[state]))
    if raw:
        print("  %-22s   %s" % ("", raw))
print()

off     = [n for n, s, _ in results if s == "OFF"]
unknown = [n for n, s, _ in results if s == "?"]
if any(s == "BILLING" for _, s, _ in results):
    print("DIAGNOSIS: billing is not linked to the project (STEG 2 in google-keys.pdf).")
    print("  Adding a card and linking the project to it are two separate actions.")
elif any(s == "RESTRICTED" for _, s, _ in results):
    print("DIAGNOSIS: the key carries restrictions that block server-side use.")
    print("  A referrer-restricted key works in a browser but not from a server,")
    print("  and this app needs both. Two keys are required — see BEFORE_DEPLOYMENT.md.")
elif any(s == "BADKEY" for _, s, _ in results):
    print("DIAGNOSIS: Google rejected the key. Re-copy it from Credentials.")
elif off:
    print("DIAGNOSIS: these are not enabled: " + ", ".join(off))
    print("  Fix: APIs & Services -> Library, search each name, press Enable.")
elif any(s == "LEGACY" for _, s, _ in results):
    print("DIAGNOSIS: this project cannot serve the legacy API the app calls.")
    print("  Google retired the legacy Places API for projects created after")
    print("  March 2025, and a brand-new project is one of those. Enabling")
    print("  something in the console will NOT fix this — the code has to move to")
    print("  the new Places API. Affected: app/api/places/autocomplete + details.")
elif unknown:
    # An unclassified response is not a pass. Saying "all clear" here is how a
    # broken checkout ships.
    print("DIAGNOSIS: could not classify " + ", ".join(unknown) + ".")
    print("  Google's own message is printed above — that is the real answer.")
    print("  Treat this as NOT working until the message says otherwise.")
else:
    print("DIAGNOSIS: all four testable APIs are live on this key.")
    print("  If the map still fails, it is Maps JavaScript API — its own switch,")
    print("  and the only one this script cannot see. The browser console names it:")
    print("    ApiNotActivatedMapError   -> enable Maps JavaScript API")
    print("    RefererNotAllowedMapError -> the key's referrer list excludes this site")
PYEOF
