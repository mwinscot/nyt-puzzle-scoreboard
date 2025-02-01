// src/services/archiveService.ts
import { PlayerScores, ScoreRecord, PlayerName, PlayerKey } from '@/types';
import { supabase, publicSupabase } from '@/lib/supabase';

const getPlayerKeyFromName = (name: PlayerName): PlayerKey => {
  switch (name) {
    case 'Keith': return 'player1';
    case 'Mike': return 'player2';
    case 'Colleen': return 'player3';
    default: throw new Error('Invalid player name');
  }
};

// Initialize player data structure
const initialPlayerData = () => ({
  dailyScores: {},
  total: 0,
  totalBonuses: {
    wordle: 0,
    connections: 0,
    strands: 0
  }
});

export const archiveMonthlyScores = async (
  month: string, 
  startDate: string, 
  endDate: string
): Promise<PlayerScores> => {
  try {
    // 1. Fetch all scores for the month
    const { data: monthlyScores, error } = await publicSupabase
      .from('daily_scores')
      .select(`
        *,
        players (
          name
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('archived', false);

    if (error) throw error;

    // 2. Calculate player totals and create archive structure
    const archiveData: PlayerScores = {
      player1: initialPlayerData(),
      player2: initialPlayerData(),
      player3: initialPlayerData()
    };

    monthlyScores?.forEach((score: ScoreRecord) => {
      const playerKey = getPlayerKeyFromName(score.players.name as PlayerName);
      
      // Add daily score
      archiveData[playerKey].dailyScores[score.date] = {
        date: score.date,
        wordle: score.wordle,
        connections: score.connections,
        strands: score.strands,
        total: score.total,
        bonusPoints: {
          wordleQuick: score.bonus_wordle,
          connectionsPerfect: score.bonus_connections,
          strandsSpanagram: score.bonus_strands
        },
        finalized: true
      };

      // Update totals
      archiveData[playerKey].total += score.total;
      if (score.bonus_wordle) archiveData[playerKey].totalBonuses.wordle++;
      if (score.bonus_connections) archiveData[playerKey].totalBonuses.connections++;
      if (score.bonus_strands) archiveData[playerKey].totalBonuses.strands++;
    });

    // 3. Store in monthly_archives table
    const { error: archiveError } = await supabase
      .from('monthly_archives')
      .upsert({
        month,
        archive_data: archiveData,
        created_at: new Date().toISOString()
      });

    if (archiveError) throw archiveError;

    // 4. Mark daily scores as archived
    const { error: updateError } = await supabase
      .from('daily_scores')
      .update({ archived: true })
      .gte('date', startDate)
      .lte('date', endDate);

    if (updateError) throw updateError;

    return archiveData;
  } catch (error) {
    console.error('Error archiving scores:', error);
    throw error;
  }
};

export const fetchArchivedMonth = async (month: string): Promise<PlayerScores | null> => {
  try {
    const { data, error } = await publicSupabase
      .from('monthly_archives')
      .select('archive_data')
      .eq('month', month)
      .single();

    if (error) throw error;
    return data?.archive_data || null;
  } catch (error) {
    console.error('Error fetching archived month:', error);
    return null;
  }
};

export const listArchivedMonths = async (): Promise<string[]> => {
  try {
    const { data, error } = await publicSupabase
      .from('monthly_archives')
      .select('month')
      .order('month', { ascending: false });

    if (error) throw error;
    return data.map(record => record.month);
  } catch (error) {
    console.error('Error listing archived months:', error);
    return [];
  }
};

export const getDateRangeForMonth = (month: string) => {
  const [year, monthStr] = month.split('-');
  const monthNum = parseInt(monthStr, 10) - 1; // JS months are 0-based
  
  const startDate = new Date(parseInt(year), monthNum, 1);
  const endDate = new Date(parseInt(year), monthNum + 1, 0);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getPreviousMonth = (): string => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
};