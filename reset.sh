#!/usr/bin/env bash
# Quick reset of test data. Drops all collections and re-seeds.
set -e
cd "$(dirname "$0")/server"
echo "Resetting Civic Hub test data..."
npm run seed
echo "Done. All test accounts use password: test"
