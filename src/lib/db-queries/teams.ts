import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import type { Team } from '@/types';

export interface DbTeam {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DbPerson {
  id: string;
  team_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  // Get all teams for user
  const teamsResult = await query(
    'SELECT * FROM teams WHERE user_id = $1 ORDER BY name',
    [userId]
  );

  // Get all people for user's teams
  const peopleResult = await query(
    `SELECT p.* FROM people p 
     JOIN teams t ON p.team_id = t.id 
     WHERE t.user_id = $1 
     ORDER BY p.name`,
    [userId]
  );

  const teams = teamsResult.rows as DbTeam[];
  const people = peopleResult.rows as DbPerson[];

  // Group people by team
  return teams.map(team => ({
    id: team.id,
    name: team.name,
    people: people
      .filter(person => person.team_id === team.id)
      .map(person => ({
        id: person.id,
        name: person.name
      }))
  }));
};

export const createTeam = async (userId: string, name: string): Promise<string> => {
  const teamId = uuidv4();
  
  await query(
    'INSERT INTO teams (id, user_id, name) VALUES ($1, $2, $3)',
    [teamId, userId, name]
  );
  
  return teamId;
};

export const updateTeam = async (teamId: string, userId: string, name: string): Promise<boolean> => {
  const result = await query(
    'UPDATE teams SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
    [name, teamId, userId]
  );
  
  return result.rowCount > 0;
};

export const deleteTeam = async (teamId: string, userId: string): Promise<boolean> => {
  // This will cascade delete people in the team due to foreign key constraints
  const result = await query(
    'DELETE FROM teams WHERE id = $1 AND user_id = $2',
    [teamId, userId]
  );
  
  return result.rowCount > 0;
};

export const createPerson = async (teamId: string, userId: string, name: string): Promise<string> => {
  // Verify team belongs to user
  const teamCheck = await query(
    'SELECT id FROM teams WHERE id = $1 AND user_id = $2',
    [teamId, userId]
  );
  
  if (teamCheck.rows.length === 0) {
    throw new Error('Team not found or access denied');
  }

  const personId = uuidv4();
  
  await query(
    'INSERT INTO people (id, team_id, name) VALUES ($1, $2, $3)',
    [personId, teamId, name]
  );
  
  return personId;
};

export const updatePerson = async (personId: string, userId: string, name: string): Promise<boolean> => {
  const result = await query(
    `UPDATE people SET name = $1, updated_at = CURRENT_TIMESTAMP 
     FROM teams t 
     WHERE people.id = $2 AND people.team_id = t.id AND t.user_id = $3`,
    [name, personId, userId]
  );
  
  return result.rowCount > 0;
};

export const deletePerson = async (personId: string, userId: string): Promise<boolean> => {
  const result = await query(
    `DELETE FROM people 
     USING teams t 
     WHERE people.id = $1 AND people.team_id = t.id AND t.user_id = $2`,
    [personId, userId]
  );
  
  return result.rowCount > 0;
};

export const assignPersonToTask = async (taskId: string, personId: string, userId: string): Promise<void> => {
  // Verify task belongs to user
  const taskCheck = await query(
    'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
    [taskId, userId]
  );
  
  if (taskCheck.rows.length === 0) {
    throw new Error('Task not found or access denied');
  }

  // Verify person belongs to user's team
  const personCheck = await query(
    `SELECT p.id FROM people p 
     JOIN teams t ON p.team_id = t.id 
     WHERE p.id = $1 AND t.user_id = $2`,
    [personId, userId]
  );
  
  if (personCheck.rows.length === 0) {
    throw new Error('Person not found or access denied');
  }

  await query(
    'INSERT INTO task_people (task_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [taskId, personId]
  );
};

export const unassignPersonFromTask = async (taskId: string, personId: string, userId: string): Promise<boolean> => {
  // Verify task belongs to user
  const taskCheck = await query(
    'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
    [taskId, userId]
  );
  
  if (taskCheck.rows.length === 0) {
    throw new Error('Task not found or access denied');
  }

  const result = await query(
    'DELETE FROM task_people WHERE task_id = $1 AND person_id = $2',
    [taskId, personId]
  );
  
  return result.rowCount > 0;
};

export const updateTaskAssignments = async (taskId: string, userId: string, personIds: string[]): Promise<void> => {
  // Verify task belongs to user
  const taskCheck = await query(
    'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
    [taskId, userId]
  );
  
  if (taskCheck.rows.length === 0) {
    throw new Error('Task not found or access denied');
  }

  // Remove all existing assignments for this task
  await query(
    'DELETE FROM task_people WHERE task_id = $1',
    [taskId]
  );

  // Add new assignments
  if (personIds.length > 0) {
    const values = personIds.map((personId, index) => `($1, $${index + 2})`).join(', ');
    const params = [taskId, ...personIds];
    
    await query(
      `INSERT INTO task_people (task_id, person_id) VALUES ${values}`,
      params
    );
  }
};