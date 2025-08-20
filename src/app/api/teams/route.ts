import { NextRequest } from "next/server";
import { withCognitoAuth, CognitoAuthenticatedRequest } from "@/lib/middleware";
import {
  createSuccessResponse,
  createErrorResponse,
  validateJsonBody,
  handleApiError,
} from "@/lib/middleware";
import { getUserTeams, createTeam } from "@/lib/db-queries/teams";

// GET /api/teams - Get user's teams
export const GET = withCognitoAuth(
  async (request: CognitoAuthenticatedRequest) => {
    try {
      const teams = await getUserTeams(request.user.id);
      return createSuccessResponse(teams);
    } catch (error) {
      return handleApiError(error, "Failed to fetch teams");
    }
  }
);

// POST /api/teams - Create team
export const POST = withCognitoAuth(
  async (request: CognitoAuthenticatedRequest) => {
    try {
      const body = await validateJsonBody(request);
      const { name } = body;

      if (!name || !name.trim()) {
        return createErrorResponse("Team name is required", 400);
      }

      const teamId = await createTeam(request.user.id, name.trim());

      return createSuccessResponse(
        {
          id: teamId,
          message: "Team created successfully",
        },
        201
      );
    } catch (error: any) {
      if (error.message === "Invalid JSON body") {
        return createErrorResponse("Invalid JSON body", 400);
      }
      return handleApiError(error, "Failed to create team");
    }
  }
);
