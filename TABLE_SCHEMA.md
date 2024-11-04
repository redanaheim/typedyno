# Heroku PostgreSQL Table Organization

## Table: `prefixes`

**Columns**: `snowflake`, `prefix`

`snowflake` - BigInt PRIMARY KEY

`prefix` - varchar NOT NULL

## Table: `users`

**Columns**: `snowflake`, `permissions`

`snowflake`: varchar PRIMARY KEY

`permissions`: varchar
