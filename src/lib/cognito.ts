import { Amplify } from "aws-amplify";

// Utility function for retry with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 500
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) or final attempt
      if (attempt === maxAttempts) {
        throw error;
      }

      // Check if it's a retryable error
      const errorName =
        error && typeof error === "object" && "name" in error
          ? (error as { name: string }).name
          : "";

      const isRetryable = [
        "NetworkError",
        "TimeoutError",
        "InternalServerError",
        "ServiceUnavailableException",
      ].includes(errorName);

      if (!isRetryable) {
        throw error;
      }

      // Exponential backoff: 500ms, 1s, 2s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.info(
        `🔄 Auth attempt ${attempt} failed, retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  getCurrentUser,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  fetchUserAttributes,
  fetchAuthSession,
} from "aws-amplify/auth";

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;

if (!userPoolId || !userPoolClientId) {
  throw new Error(
    "Missing required Cognito configuration. Please check your environment variables."
  );
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
        username: true,
      },
    },
  },
});

export interface CognitoUser {
  userId: string;
  username: string;
  email?: string;
}

export interface SignUpResult {
  isSignUpComplete: boolean;
  userId?: string;
  nextStep: {
    signUpStep: string;
    additionalInfo?: Record<string, unknown>;
  };
}

export const cognitoAuth = {
  // Sign in with username/email and password
  async signIn(username: string, password: string): Promise<CognitoUser> {
    try {
      const result = await amplifySignIn({ username, password });

      if (result.isSignedIn) {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        return {
          userId: user.userId,
          username: user.username,
          email: attributes.email,
        };
      } else {
        throw new Error("Sign in incomplete");
      }
    } catch (error: unknown) {
      console.error("Cognito sign in error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Sign in failed";
      throw new Error(errorMessage);
    }
  },

  // Sign up new user
  async signUp(
    username: string,
    password: string,
    email: string
  ): Promise<SignUpResult> {
    try {
      const result = await amplifySignUp({
        username,
        password,
        attributes: {
          email,
        },
      });

      return {
        isSignUpComplete: result.isSignUpComplete,
        userId: result.userId,
        nextStep: result.nextStep,
      };
    } catch (error: unknown) {
      console.error("Cognito sign up error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Sign up failed";
      throw new Error(errorMessage);
    }
  },

  // Confirm sign up with verification code
  async confirmSignUp(
    username: string,
    confirmationCode: string
  ): Promise<void> {
    try {
      await confirmSignUp({ username, confirmationCode });
    } catch (error: unknown) {
      console.error("Cognito confirm sign up error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Confirmation failed";
      throw new Error(errorMessage);
    }
  },

  // Resend confirmation code
  async resendConfirmationCode(username: string): Promise<void> {
    try {
      await resendSignUpCode({ username });
    } catch (error: unknown) {
      console.error("Cognito resend code error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to resend code";
      throw new Error(errorMessage);
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await amplifySignOut();
    } catch (error: unknown) {
      console.error("Cognito sign out error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Sign out failed";
      throw new Error(errorMessage);
    }
  },

  // Check if user has valid session
  async hasValidSession(): Promise<boolean> {
    return retryOperation(async () => {
      try {
        const session = await fetchAuthSession();
        return !!(session.tokens && session.tokens.accessToken);
      } catch (error) {
        return false;
      }
    });
  },

  // Get current authenticated user with proper session validation
  async getCurrentUser(): Promise<CognitoUser | null> {
    return retryOperation(async () => {
      try {
        // First check if we have a valid session
        const hasSession = await this.hasValidSession();
        if (!hasSession) {
          return null;
        }

        // Only call getCurrentUser if we have a valid session
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        return {
          userId: user.userId,
          username: user.username,
          email: attributes.email,
        };
      } catch (error: unknown) {
        // Handle specific authentication errors silently
        if (error && typeof error === "object" && "name" in error) {
          const errorName = (error as { name: string }).name;
          if (
            errorName === "UserUnauthenticatedException" ||
            errorName === "NotAuthorizedException" ||
            errorName === "AuthUserPoolException"
          ) {
            // User is not authenticated - this is expected, return null silently
            return null;
          }
        }

        console.error("Get current user error:", error);
        return null;
      }
    });
  },

  // Get session info for debugging
  async getSessionInfo(): Promise<{ isValid: boolean; expiresAt?: Date }> {
    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken;

      if (accessToken && accessToken.payload.exp) {
        return {
          isValid: true,
          expiresAt: new Date(accessToken.payload.exp * 1000),
        };
      }

      return { isValid: false };
    } catch (error) {
      return { isValid: false };
    }
  },

  // Reset password
  async resetPassword(username: string): Promise<void> {
    try {
      await resetPassword({ username });
    } catch (error: unknown) {
      console.error("Cognito reset password error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Password reset failed";
      throw new Error(errorMessage);
    }
  },

  // Confirm password reset
  async confirmResetPassword(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    try {
      await confirmResetPassword({ username, confirmationCode, newPassword });
    } catch (error: unknown) {
      console.error("Cognito confirm reset password error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Password reset confirmation failed";
      throw new Error(errorMessage);
    }
  },
};

// Email domain validation
export const validateEmailDomain = (email: string): boolean => {
  const allowedDomains = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS;

  if (!allowedDomains) {
    return true; // No domain restriction
  }

  const domains = allowedDomains.split(",").map((d) => d.trim().toLowerCase());
  const emailDomain = email.toLowerCase().split("@")[1];

  return domains.includes(emailDomain) || domains.includes(email.toLowerCase());
};
