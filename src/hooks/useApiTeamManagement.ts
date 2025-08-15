import { useState, useCallback, useEffect } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Team } from "@/types";

export const useApiTeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load teams from API
  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const teamsData = await apiClient.getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setError(error instanceof ApiError ? error.message : 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize teams on mount
  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Add team
  const handleAddTeam = useCallback(async (teamName: string) => {
    try {
      setError(null);
      await apiClient.createTeam(teamName);
      await loadTeams();
    } catch (error) {
      console.error('Failed to add team:', error);
      setError(error instanceof ApiError ? error.message : 'Failed to add team');
    }
  }, [loadTeams]);
  
  // Add person to team
  const handleAddPerson = useCallback(async (teamId: string | number, personName: string) => {
    try {
      setError(null);
      await apiClient.addPersonToTeam(teamId as string, personName);
      await loadTeams();
    } catch (error) {
      console.error('Failed to add person:', error);
      setError(error instanceof ApiError ? error.message : 'Failed to add person');
    }
  }, [loadTeams]);
  
  // Delete team
  const handleDeleteTeam = useCallback(async (teamId: string | number) => {
    if (window.confirm("¿Seguro que quieres eliminar este equipo y todas sus personas?")) {
      try {
        setError(null);
        await apiClient.deleteTeam(teamId as string);
        await loadTeams();
      } catch (error) {
        console.error('Failed to delete team:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to delete team');
      }
    }
  }, [loadTeams]);
  
  // Delete person
  const handleDeletePerson = useCallback(async (teamId: string | number, personId: string | number) => {
    if (window.confirm("¿Seguro que quieres eliminar esta persona?")) {
      try {
        setError(null);
        await apiClient.deletePerson(personId as string);
        await loadTeams();
      } catch (error) {
        console.error('Failed to delete person:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to delete person');
      }
    }
  }, [loadTeams]);
  
  return {
    teams,
    isLoading,
    error,
    handleAddTeam,
    handleAddPerson,
    handleDeleteTeam,
    handleDeletePerson,
    refreshTeams: loadTeams,
    clearError: () => setError(null),
  };
};