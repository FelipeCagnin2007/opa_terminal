/**
 * usePokemonTeam — Hook for saving and loading a user's Pokémon team in Supabase.
 * Table: pokemon_teams (user_id UUID, team_data JSONB)
 *
 * Team data structure:
 * [
 *   {
 *     pokemonId: number,
 *     name: string,
 *     sprite: string,
 *     types: string[],
 *     stats: { hp, attack, defense, specialAttack, specialDefense, speed },
 *     moves: [{ name, power, accuracy, pp, type, damageClass, shortEffect }],
 *     ability: { name, shortEffect }
 *   },
 *   ... (up to 6)
 * ]
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export function usePokemonTeam(userId) {
  const [team, setTeam] = useState([]);
  const [teamName, setTeamNameState] = useState('Time Principal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load team from Supabase on mount
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('pokemon_teams')
        .select('team_data, team_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (err) {
        setError(err.message);
      } else if (data) {
        setTeam(data.team_data || []);
        setTeamNameState(data.team_name || 'Time Principal');
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  /**
   * Upsert the current team to Supabase
   */
  const saveTeam = useCallback(async (newTeam, name = teamName) => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('pokemon_teams')
      .upsert(
        { user_id: userId, team_data: newTeam, team_name: name, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (err) setError(err.message);
    else {
      setTeam(newTeam);
      setTeamNameState(name);
    }
    setSaving(false);
    return !err;
  }, [userId, teamName]);

  /**
   * Add a Pokémon to the team (max 6)
   */
  const addToTeam = useCallback((pokemonEntry) => {
    setTeam((prev) => {
      if (prev.length >= 6) return prev;
      if (prev.find((p) => p.pokemonId === pokemonEntry.pokemonId)) return prev;
      return [...prev, pokemonEntry];
    });
  }, []);

  /**
   * Remove a Pokémon from team by pokemonId
   */
  const removeFromTeam = useCallback((pokemonId) => {
    setTeam((prev) => prev.filter((p) => p.pokemonId !== pokemonId));
  }, []);

  /**
   * Update moves/ability for a Pokémon in the team
   */
  const updateTeamMember = useCallback((pokemonId, updates) => {
    setTeam((prev) =>
      prev.map((p) => (p.pokemonId === pokemonId ? { ...p, ...updates } : p))
    );
  }, []);

  return {
    team,
    teamName,
    setTeamName: setTeamNameState,
    loading,
    saving,
    error,
    saveTeam,
    addToTeam,
    removeFromTeam,
    updateTeamMember,
  };
}
