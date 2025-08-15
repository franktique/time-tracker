import { query } from './db';
import type { CognitoUser } from './cognito';

export interface LocalUser {
  id: string;
  username: string;
  email?: string;
  cognito_user_id?: string;
  cognito_email?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSyncResult {
  user: LocalUser;
  created: boolean; // true if user was created, false if found existing
}

/**
 * Synchronizes a Cognito user with the local database
 * - Checks if user exists by email or cognito_user_id
 * - Creates new user record if not found
 * - Updates existing user record with Cognito data if found
 */
export async function syncCognitoUser(cognitoUser: CognitoUser): Promise<UserSyncResult> {
  const { userId: cognitoUserId, username, email } = cognitoUser;
  
  if (!email) {
    throw new Error('Email is required for user synchronization');
  }

  try {
    // First, try to find existing user by cognito_user_id
    let existingUser = await findUserByCognitoId(cognitoUserId);
    
    // If not found by cognito_user_id, try to find by email
    if (!existingUser) {
      existingUser = await findUserByEmail(email);
    }

    if (existingUser) {
      // Update existing user with Cognito data if needed
      const updatedUser = await updateUserWithCognitoData(existingUser, cognitoUser);
      return { user: updatedUser, created: false };
    } else {
      // Create new user
      const newUser = await createLocalUserFromCognito(cognitoUser);
      return { user: newUser, created: true };
    }
  } catch (error) {
    console.error('Error syncing Cognito user:', error);
    throw new Error(`Failed to sync user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find user by Cognito user ID
 */
async function findUserByCognitoId(cognitoUserId: string): Promise<LocalUser | null> {
  const result = await query(
    'SELECT * FROM users WHERE cognito_user_id = $1',
    [cognitoUserId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Find user by email address
 */
async function findUserByEmail(email: string): Promise<LocalUser | null> {
  const result = await query(
    'SELECT * FROM users WHERE email = $1 OR cognito_email = $1',
    [email.toLowerCase()]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new local user record from Cognito user data
 */
async function createLocalUserFromCognito(cognitoUser: CognitoUser): Promise<LocalUser> {
  const { userId: cognitoUserId, username, email } = cognitoUser;
  
  if (!email) {
    throw new Error('Email is required to create user');
  }

  // Use email as username if username is not available or is an auto-generated UUID
  const displayUsername = isValidUsername(username) ? username : email;
  
  const result = await query(
    `INSERT INTO users (username, email, cognito_user_id, cognito_email, password_hash) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [
      displayUsername,
      email.toLowerCase(),
      cognitoUserId,
      email.toLowerCase(),
      null // password_hash is null for Cognito users
    ]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Failed to create user record');
  }
  
  console.log(`✅ Created new local user for Cognito user: ${email}`);
  return result.rows[0];
}

/**
 * Update existing user with Cognito data
 */
async function updateUserWithCognitoData(existingUser: LocalUser, cognitoUser: CognitoUser): Promise<LocalUser> {
  const { userId: cognitoUserId, email } = cognitoUser;
  
  // Only update if Cognito data is missing
  if (!existingUser.cognito_user_id && !existingUser.cognito_email) {
    const result = await query(
      `UPDATE users 
       SET cognito_user_id = $1, cognito_email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING *`,
      [cognitoUserId, email?.toLowerCase(), existingUser.id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Failed to update user record');
    }
    
    console.log(`✅ Updated existing user with Cognito data: ${email}`);
    return result.rows[0];
  }
  
  return existingUser;
}

/**
 * Check if username is valid (not auto-generated UUID pattern)
 */
function isValidUsername(username: string): boolean {
  // Cognito sometimes generates UUIDs as usernames
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return !uuidPattern.test(username) && username.length > 0;
}

/**
 * Get local user by ID (for API middleware)
 */
export async function getLocalUserById(userId: string): Promise<LocalUser | null> {
  try {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

/**
 * Get local user by Cognito user ID (for token validation)
 */
export async function getLocalUserByCognitoId(cognitoUserId: string): Promise<LocalUser | null> {
  try {
    const result = await query(
      'SELECT * FROM users WHERE cognito_user_id = $1',
      [cognitoUserId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching user by Cognito ID:', error);
    return null;
  }
}