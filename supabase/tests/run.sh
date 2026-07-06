#!/usr/bin/env bash
# Run the deterministic security tests against a database.
#   DATABASE_URL=postgres://... ./supabase/tests/run.sh
# Each test creates fixtures, asserts RLS/share behavior, and rolls itself back
# via a sentinel RAISE. A PASS line is printed for each; any other error fails.
set -uo pipefail

: "${DATABASE_URL:?set DATABASE_URL to the project's Postgres connection string}"
here="$(cd "$(dirname "$0")" && pwd)"
status=0

for t in isolation_test share_link_test; do
  out="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f "$here/$t.sql" 2>&1)"
  if echo "$out" | grep -q "TESTS_PASSED"; then
    echo "PASS  $t  — $(echo "$out" | grep -o '[A-Z_]*TESTS_PASSED ([0-9]* checks)')"
  else
    echo "FAIL  $t"
    echo "$out"
    status=1
  fi
done
exit $status
