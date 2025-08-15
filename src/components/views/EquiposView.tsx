import { useState } from "react";
import { PlusCircle, Building, UserPlus, Trash2, X } from "lucide-react";
import { AddTeamModal } from "@/components/modals/AddTeamModal";
import { AddPersonModal } from "@/components/modals/AddPersonModal";
import type { Team } from "@/types";

interface EquiposViewProps {
  teams: Team[];
  onAddTeam: (teamName: string) => void;
  onAddPerson: (teamId: string | number, personName: string) => void;
  onDeleteTeam: (teamId: string | number) => void;
  onDeletePerson: (teamId: string | number, personId: string | number) => void;
}

export const EquiposView: React.FC<EquiposViewProps> = ({
  teams,
  onAddTeam,
  onAddPerson,
  onDeleteTeam,
  onDeletePerson,
}) => {
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingPersonToTeam, setAddingPersonToTeam] = useState<{
    teamId: string | number;
    teamName: string;
  } | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  
  const handleConfirmAddTeam = () => {
    if (newTeamName.trim()) {
      onAddTeam(newTeamName.trim());
      setNewTeamName("");
      setIsAddingTeam(false);
    }
  };
  
  const handleConfirmAddPerson = () => {
    if (newPersonName.trim() && addingPersonToTeam) {
      onAddPerson(addingPersonToTeam.teamId, newPersonName.trim());
      setNewPersonName("");
      setAddingPersonToTeam(null);
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => setIsAddingTeam(true)}
        className="mb-4 inline-flex items-center px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600"
      >
        <PlusCircle size={16} className="mr-1" /> Añadir Equipo
      </button>
      {teams.length === 0 && (
        <p className="text-gray-500">No hay equipos creados.</p>
      )}
      {teams.map((team) => (
        <div
          key={team.id}
          className="bg-white p-3 rounded-lg shadow border border-gray-200"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <Building size={16} className="mr-2 text-gray-500" /> {team.name}
            </h3>
            <div>
              <button
                onClick={() =>
                  setAddingPersonToTeam({
                    teamId: team.id,
                    teamName: team.name,
                  })
                }
                className="p-1 text-green-600 hover:text-green-800 mr-1"
                title="Añadir Persona"
              >
                <UserPlus size={16} />
              </button>
              <button
                onClick={() => onDeleteTeam(team.id)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Eliminar Equipo"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <ul className="ml-4 space-y-1">
            {(team.people || []).length === 0 && (
              <li className="text-xs text-gray-400 italic">
                No hay personas en este equipo.
              </li>
            )}
            {(team.people || []).map((person) => (
              <li
                key={person.id}
                className="text-sm text-gray-700 flex justify-between items-center group"
              >
                <span>{person.name}</span>
                <button
                  onClick={() => onDeletePerson(team.id, person.id)}
                  className="p-0.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar Persona"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      
      <AddTeamModal
        isOpen={isAddingTeam}
        value={newTeamName}
        onChange={(e) => setNewTeamName(e.target.value)}
        onConfirm={handleConfirmAddTeam}
        onCancel={() => setIsAddingTeam(false)}
      />
      
      <AddPersonModal
        isOpen={addingPersonToTeam !== null}
        teamName={addingPersonToTeam?.teamName || ""}
        value={newPersonName}
        onChange={(e) => setNewPersonName(e.target.value)}
        onConfirm={handleConfirmAddPerson}
        onCancel={() => setAddingPersonToTeam(null)}
      />
    </div>
  );
};