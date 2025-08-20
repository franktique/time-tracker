import { NextRequest } from "next/server";
import { withCognitoAuth, CognitoAuthenticatedRequest } from "@/lib/middleware";
import {
  createSuccessResponse,
  createErrorResponse,
  validateJsonBody,
  handleApiError,
} from "@/lib/middleware";
import { updateTeam, deleteTeam } from "@/lib/db-queries/teams";

// PUT /api/teams/[id] - Update team
export const PUT = withCognitoAuth(
  async (request: CognitoAuthenticatedRequest, context) => {
    try {
      const teamId = context?.params?.id;
      if (!teamId) {
        return createErrorResponse("Team ID is required", 400);
      }

      // Runtime guard and resolve safe userId with fallback chain
      if (!request.user) {
        return createErrorResponse("User authentication required", 401);
      }

      // Check for user ID with multiple fallback options
      const userId =
        request.user.id ??
        (request.user as any).sub ??
        (request.user as any)["cognito:username"] ??
        request.user.username;

      if (!userId) {
        return createErrorResponse(
          "User identification required - no valid user ID found",
          401
        );
      }

      const body = await validateJsonBody(request);
      const { name } = body;

      if (!name || !name.trim()) {
        return createErrorResponse("Team name is required", 400);
      }

      // Guard against undefined userId before calling updateTeam
      if (!userId) {
        return createErrorResponse("Invalid user identification", 400);
      }

      const updated = await updateTeam(teamId, userId, name.trim());

      if (!updated) {
        return createErrorResponse("Team not found", 404);
      }

      return createSuccessResponse({ message: "Team updated successfully" });
    } catch (error: any) {
      if (error.message === "Invalid JSON body") {
        return createErrorResponse("Invalid JSON body", 400);
      }
      return handleApiError(error, "Failed to update team");
    }
  }
);

// DELETE /api/teams/[id] - Delete team
export const DELETE = withCognitoAuth(
  async (request: CognitoAuthenticatedRequest, context) => {
    try {
      const teamId = context?.params?.id;
      if (!teamId) {
        return createErrorResponse("Team ID is required", 400);
      }

      // Runtime guard and normalize user ID
      if (!request.user) {
        return createErrorResponse("User authentication required", 401);
      }

      const userId =
        request.user.id ??
        request.user.cognito_user_id ??
        request.user.username;
      if (!userId) {
        return createErrorResponse("User identification required", 401);
      }

      const deleted = await deleteTeam(teamId, userId);

      if (!deleted) {
        return createErrorResponse("Team not found", 404);
      }

      return createSuccessResponse({ message: "Team deleted successfully" });
    } catch (error) {
      return handleApiError(error, "Failed to delete team");
    }
  }
);
