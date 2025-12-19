-- Create extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Initialize with basic seed data
-- This script is run after Prisma migrations
SELECT 1;
