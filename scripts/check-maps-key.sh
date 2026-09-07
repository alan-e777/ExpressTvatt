#!/usr/bin/env bash
# Diagnose a Google Maps API key and say, in plain words, what is wrong with it.
#
#   ./scripts/check-maps-key.sh            # tests the key in .env.local
#   ./scripts/check-maps-key.sh AIza…      # tests a key you paste on the command line
#
# The key is never printed — only its prefix and length, which is what the
# handover runbook allows to be shared. Google's REST APIs return a plain error
# string for every failure mode, and those strings are what this maps to a cause.
#
# What it cannot see: the Maps JavaScript API has no REST endpoint, so if every
# check below passes and the map still fails in the browser, the cause is one of
# the two things listed at the end.
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
[ "$RAW_LEN" -ne "${#CLEAN}" ] && echo "  !!  The key has whitespace in or around it. Strip it — this alone breaks the key."
case "$CLEAN" in
  AIza*) ;;
  *) echo "  !!  A browser/server Maps key normally starts with 'AIza'. This one does not." ;;
esac
[ "${#CLEAN}" -ne 39 ] && echo "  !!  Expected 39 characters — this looks truncated or over-copied."
echo

MSG=$(curl -s --max-time 20 \
  "https://maps.googleapis.com/maps/api/geocode/json?address=Stockholm&key=$CLEAN" \
  | python3 -c 'import sys,json
try:
    d=json.load(sys.stdin)
except Exception:
    print("PARSE_FAIL"); raise SystemExit
print(d.get("status","?")+"|"+d.get("error_message",""))' 2>/dev/null)

STATUS="${MSG%%|*}"
DETAIL="${MSG#*|}"
echo "Geocoding API: $STATUS"
[ -n "$DETAIL" ] && echo "  $DETAIL"
echo

case "$DETAIL$STATUS" in
  *"enable Billing"*|*"BILLING"*)
    echo "DIAGNOSIS: billing is not linked to this project."
    echo "  This is STEG 2 in google-keys.pdf, and the trap the warning box covers:"
    echo "  adding a card and linking the project to it are two separate actions."
    echo "  Fix: console.cloud.google.com -> Fakturering (Billing). The project name"
    echo "  and the billing account name must appear together. If it says the project"
    echo "  has no billing account, click 'Lank ett faktureringskonto' and pick one."
    ;;
  *"not authorized to use this API"*|*"has not been used in project"*|*"is disabled"*)
    echo "DIAGNOSIS: the APIs are not switched on for this project."
    echo "  This is STEG 3. All five are needed:"
    echo "    Maps JavaScript / Places / Geocoding / Directions / Maps Static"
    echo "  Fix: APIs & Services -> Library, search each, press Enable."
    ;;
  *"referer restrictions"*|*"referrer restrictions"*|*"IP, IP range"*)
    echo "DIAGNOSIS: this key carries restrictions that block server-side use."
    echo "  Someone pressed 'Begransa nyckel' / Restrict key. A referrer-restricted"
    echo "  key works in a browser but not from a server, and this app needs both."
    echo "  Fix: two keys — a referrer-restricted browser key, and a separate"
    echo "  server key. See BEFORE_DEPLOYMENT.md, the Google Maps section."
    ;;
  *"API key not valid"*|*"INVALID_REQUEST"*|*"provided API key is invalid"*|*REQUEST_DENIED*)
    echo "DIAGNOSIS: Google rejected the key itself."
    echo "  Usually a mistyped or partially-copied key, or a key from a different"
    echo "  project than the one that has billing. Re-copy it from"
    echo "  APIs & Services -> Credentials and check nothing was cut off."
    ;;
  *OK*)
    echo "DIAGNOSIS: billing is live and this key works for the REST APIs."
    echo
    echo "  If the map in /admin/settings STILL fails, only two causes remain,"
    echo "  because the Maps JavaScript API cannot be tested from here:"
    echo "    1. 'Maps JavaScript API' specifically is not enabled (the other four"
    echo "       can be on while that one is off — it is its own switch)."
    echo "    2. The key has an HTTP-referrer restriction that does not include the"
    echo "       site you are loading. Localhost needs its own entry:"
    echo "         http://localhost:3001/*"
    echo "  Check both at APIs & Services -> Credentials -> click the key."
    ;;
  *)
    echo "DIAGNOSIS: unrecognised response — paste the two lines above to Claude."
    ;;
esac
