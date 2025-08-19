import { useCallback } from "react";
import type { Team } from "@/types";

export const useTeamManagement = (teams: Team[], setTeams: (teams: Team[]) => void) => {
  const handleAddTeam = useCallback((teamName: string) => {
    const newTeam: Team = { id: Date.now(), name: teamName, people: [] };
    setTeams([...teams, newTeam]);
  }, [teams, setTeams]);
  
  const handleAddPerson = useCallback((teamId: string | number, personName: string) => {
    const newPerson = { id: Date.now(), name: personName };
    setTeams(teams.map((team) => {
      if (team.id === teamId) {
        return { ...team, people: [...(team.people || []), newPerson] };
      }
      return team;
    }));
  }, [teams, setTeams]);
  
  const handleDeleteTeam = useCallback((teamId: string | number) => {
    if (window.confirm("¿Seguro que quieres eliminar este equipo y todas sus personas?")) {
      setTeams(teams.filter((team) => team.id !== teamId));
    }
  }, [teams, setTeams]);
  
  const handleDeletePerson = useCallback((teamId: string | number, personId: string | number) => {
    if (window.confirm("¿Seguro que quieres eliminar esta persona?")) {
      setTeams(teams.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            people: (team.people || []).filter((p) => p.id !== personId),
          };
        }
        return team;
      }));
    }
  }, [teams, setTeams]);
  
  return {
    handleAddTeam,
    handleAddPerson,
    handleDeleteTeam,
    handleDeletePerson,
  };
};