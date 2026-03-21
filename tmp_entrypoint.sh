#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "Checking database existence..."
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p' | cut -d/ -f1)
  DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p' | rev | cut -d/ -f1 | rev)
  DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')

  echo "Waiting for postgres to be ready..."
  until PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; do sleep 1; done

  echo "Ensuring database $DB_NAME exists..."
  DB_EXISTS=$(PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null || echo "0")
  if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database $DB_NAME..."
    PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\"" || echo "Database may already exist"
  fi
fi
echo "Running database migrations..."
if [ -d "prisma/migrations" ]; then npx prisma migrate deploy; else npx prisma db push --accept-data-loss; fi || echo "Prisma migration failed, continuing..."
exec "$@"
