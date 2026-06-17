-- Create application database if it does not exist
-- Note: Postgres doesn't support IF NOT EXISTS for CREATE DATABASE in older versions
-- This script will fail if the database already exists; that's acceptable for idempotent setup.
CREATE DATABASE absensi_multitenant;
