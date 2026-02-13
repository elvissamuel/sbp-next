# pgvector Setup for Neon Database

## Environment Variables

For Prisma migrations to work with pgvector on Neon, you need to set up both your main database and shadow database with the pgvector extension enabled.

### Required Environment Variables

Create or update your `.env` file with:

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
SHADOW_DATABASE_URL="postgresql://user:password@host.neon.tech/shadow_dbname?sslmode=require"
```

**Important:** The shadow database must be a separate database (not the same as your main database).

## Enabling pgvector Extension on Neon

### Option 1: Using Neon Dashboard (Recommended)

1. **Main Database:**
   - Go to your Neon project dashboard
   - Select your main database
   - Go to the SQL Editor
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

2. **Shadow Database:**
   - Create a new database in Neon for the shadow database (if you don't have one)
   - Go to that database in the SQL Editor
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### Option 2: Using Neon SQL Editor or psql

Connect to each database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Creating Shadow Database on Neon

If you don't have a shadow database yet:

1. In Neon dashboard, create a new database (e.g., `yourdb_shadow`)
2. Enable the `vector` extension on it
3. Update your `.env` file with the shadow database connection string

## Running Migrations

After setting up both databases with the vector extension:

```bash
npm run migrate
# or
npx prisma migrate dev
```

## Verification

You can verify the extension is enabled by running:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

This should return a row showing the vector extension is installed.

