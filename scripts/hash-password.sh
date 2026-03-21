#!/bin/sh
# Generate a bcrypt hash for ADMIN_PASSWORD_HASH env variable
# Usage: docker compose exec zee-index sh /app/scripts/hash-password.sh "your-password"

if [ -z "$1" ]; then
  echo "Usage: $0 <password>"
  echo "Generates a bcrypt hash for use as ADMIN_PASSWORD_HASH env variable"
  exit 1
fi

node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('$1', 10);
console.log();
console.log('Add this to your .env file:');
console.log('ADMIN_PASSWORD_HASH=' + hash);
console.log();
"
