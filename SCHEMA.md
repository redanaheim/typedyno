# Module Structure

Heroku is practically unable to persist files, so we have opted to go for the much easier to organize and better Heroku Postgres. However, this means that the setup of each module having its own database cannot work anymore.

This means we will provide each module with a set of tables.

Each module will be required in its `main.ts` to disclose the name of all the tables it will use. At startup, the module loader will check for conflicts.
