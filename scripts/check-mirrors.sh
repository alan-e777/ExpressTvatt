#!/bin/bash
# The iOS app cannot import across the Next app, so these modules exist twice.
# They are kept byte-identical rather than "kept in sync by hand" — that way a
# divergence is a failing check instead of a pricing bug nobody notices until a
# customer is quoted one total and charged another (migration.md #10).
#
# If this fails: copy the web file over the app one, then re-check that the app
# still compiles. Never edit only one side.
set -e
cd "$(dirname "$0")/.."

EXEMPT="API_URL|api/timeslots"
MIRRORS="mattvatt serviceUnits serviceCategories minOrderQty rut discount timeslots newsletter"
status=0

for f in $MIRRORS; do
  web="lib/$f.ts"
  app="skraddare-app/lib/$f.ts"
  if [ ! -f "$web" ] || [ ! -f "$app" ]; then
    printf '  MISSING  %s\n' "$f.ts"
    status=1
  elif diff -qB <(grep -vE "$EXEMPT" "$web") <(grep -vE "$EXEMPT" "$app") >/dev/null 2>&1; then
    # Lines naming API_URL or the timeslots endpoint are exempt: React Native has
    # no origin to resolve a relative fetch path against, so the app copy
    # prefixes one. Nothing else may differ.
    printf '  ok       %s\n' "$f.ts"
  else
    printf '  DRIFTED  %s\n' "$f.ts"
    diff -uB <(grep -vE "$EXEMPT" "$web") <(grep -vE "$EXEMPT" "$app") | sed 's/^/    /'
    status=1
  fi
done

[ $status -eq 0 ] && echo "All mirrors identical." || echo "Mirrors have drifted — see above."
exit $status
