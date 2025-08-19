-- Migration: Hybrid Authentication (Cognito + Local Database)
-- This migration updates the users table to support Cognito authentication
-- while maintaining local database relationships

-- Add new columns for Cognito integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cognito_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS cognito_email VARCHAR(255);

-- Make password_hash optional (since Cognito handles authentication)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraint on cognito_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cognito_user_id 
ON users(cognito_user_id) WHERE cognito_user_id IS NOT NULL;

-- Add index on cognito_email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_cognito_email 
ON users(cognito_email) WHERE cognito_email IS NOT NULL;

-- Update the updated_at timestamp for any modified rows
UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id IN (
    SELECT id FROM users LIMIT 0
);

-- Add comment to document the hybrid approach
COMMENT ON TABLE users IS 'Users table supporting both legacy password authentication and Cognito SSO. cognito_user_id and cognito_email are populated for Cognito users.';
COMMENT ON COLUMN users.cognito_user_id IS 'AWS Cognito User ID (sub claim from JWT token)';
COMMENT ON COLUMN users.cognito_email IS 'Email address from Cognito user attributes';
COMMENT ON COLUMN users.password_hash IS 'Legacy password hash - only used for non-Cognito users';