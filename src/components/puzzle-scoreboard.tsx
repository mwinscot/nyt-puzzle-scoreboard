import React, { useState, useEffect } from 'react';
import { supabase, publicSupabase } from '@/lib/supabase';
import { PlayerScores, PlayerData, PlayerKey, PlayerName, DailyBonusPoints, GameScores, ScoreCalculationResult } from '@/types';
import { AdminAuth } from './AdminAuth';
import ScoreCharts from '@/components/ScoreCharts';
import { getMonthDateRange } from '@/utils/dateUtils';
import { ScoreCard } from './ScoreCard';
import { ArchiveButton } from '@/components/ArchiveButton';

const getCurrentDatePST = (): string => {
 const pstNow = new Date().toLocaleString("en-US", {
   timeZone: "America/Los_Angeles",
   hour12: false,
 });
 return new Date(pstNow).toISOString().split('T')[0];
};

interface ScoreRecord {
 id: number;
 date: string;
 player_id: number;
 wordle: number;
 connections: number;
 strands: number;
 total: number;
 bonus_wordle: boolean;
 bonus_connections: boolean;
 bonus_strands: boolean;
 finalized: boolean;
 created_at?: string;
 players: {
   name: string;
 };
}

interface PlayerTotals {
 [key: number]: {
   score: number;
   wordle: number;
   connections: number;
   strands: number;
 }
}

const initialPlayerData = (): PlayerData => ({
 dailyScores: {},
 total: 0,
 totalBonuses: {
   wordle: 0,
   connections: 0,
   strands: 0
 }
});

const getPlayerKeyFromName = (name: PlayerName): PlayerKey => {
 switch (name) {
   case 'Keith': return 'player1';
   case 'Mike': return 'player2';
   case 'Colleen': return 'player3';
   case 'Toby': return 'player4';
   default: throw new Error('Invalid player name');
 }
};

const PuzzleScoreboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [player1Name] = useState<string>('Keith');
  const [player2Name] = useState<string>('Mike');
  const [player3Name] = useState<string>('Colleen');
  const [player4Name] = useState<string>('Toby');
  const [inputText, setInputText] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<PlayerKey | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(getCurrentDatePST());
  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData(),
    player4: initialPlayerData()
  });
 
  const { start } = getMonthDateRange();
 
  const archiveDecember = async () => {
    if (!isAdmin) return;
    try {
      const { data: decemberScores, error } = await publicSupabase
        .from('daily_scores')
        .select('*')
        .gte('date', '2023-12-10')
        .lte('date', '2023-12-31');
 
      if (error) throw error;
 
      const totals: PlayerTotals = {
        1: { score: 0, wordle: 0, connections: 0, strands: 0 },
        2: { score: 0, wordle: 0, connections: 0, strands: 0 },
        3: { score: 0, wordle: 0, connections: 0, strands: 0 }
      };
 
      decemberScores?.forEach(score => {
        if (score.player_id in totals) {
          const player = totals[score.player_id];
          player.score += score.total;
          if (score.bonus_wordle) player.wordle++;
          if (score.bonus_connections) player.connections++;
          if (score.bonus_strands) player.strands++;
        }
      });
 
      const { error: archiveError } = await supabase
        .from('monthly_archives')
        .insert(Object.entries(totals).map(([player_id, stats]) => ({
          month: '2023-12',
          player_id: parseInt(player_id),
          total_score: stats.score,
          total_wordle_bonus: stats.wordle,
          total_connections_bonus: stats.connections,
          total_strands_bonus: stats.strands
        })));
 
      if (archiveError) throw archiveError;
    } catch (error) {
      console.error('Error archiving December:', error);
    }
  };
 
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAdmin(!!session);
    });
 
    fetchAllScores();
    return () => subscription.unsubscribe();
  }, []);
 
  // Make fetchAllScores a named function declaration instead of const
  async function fetchAllScores() {
    try {
      const { data: scoresData, error } = await publicSupabase
        .from('daily_scores')
        .select(`*, players (name)`)
        .gte('date', start)
        .eq('archived', false);

      if (error) throw error;
 
      const newScores: PlayerScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData(),
        player3: initialPlayerData(),
        player4: initialPlayerData()
      };
 
      scoresData?.forEach((score: ScoreRecord) => {
        const playerKey = getPlayerKeyFromName(score.players.name as PlayerName);
        
        newScores[playerKey].dailyScores[score.date] = {
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
          finalized: score.finalized
        };
 
        newScores[playerKey].total += score.total;
        if (score.bonus_wordle) newScores[playerKey].totalBonuses.wordle++;
        if (score.bonus_connections) newScores[playerKey].totalBonuses.connections++;
        if (score.bonus_strands) newScores[playerKey].totalBonuses.strands++;
      });
 
      setScores(newScores);
    } catch (error) {
      console.error('Error fetching scores:', error);
    }
  }

  const handleArchiveComplete = () => {
    fetchAllScores(); // Now fetchAllScores is in scope
  };
 
  const handleSubmit = async () => {
    if (!currentEntry || !inputText || !isAdmin) return;
 
    try {
      const { score, bonusPoints, gameScores } = calculateScores(inputText);
      
      const playerName = currentEntry === 'player1' ? 'Keith' : 
                        currentEntry === 'player2' ? 'Mike' : 
                        currentEntry === 'player3' ? 'Colleen' : 'Toby';
 
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('name', playerName)
        .single();
 
      if (playerError) throw playerError;
 
      const { error: scoreError } = await supabase
        .from('daily_scores')
        .upsert({
          date: currentDate,
          player_id: player.id,
          wordle: gameScores.wordle,
          connections: gameScores.connections,
          strands: gameScores.strands,
          total: score,
          bonus_wordle: bonusPoints.wordleQuick,
          bonus_connections: bonusPoints.connectionsPerfect,
          bonus_strands: bonusPoints.strandsSpanagram,
          finalized: false
        });
 
      if (scoreError) throw scoreError;
 
      await fetchAllScores();
      setInputText('');
      setCurrentEntry(null);
 
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };
 
  const calculateScores = (input: string): ScoreCalculationResult => {
    // Parse input format: "W4 C4/4 S7 BW BC"
    const parts = input.toUpperCase().split(' ');
    let score = 0;
    const gameScores: GameScores = {
      wordle: 0,
      connections: 0,
      strands: 0
    };
    const bonusPoints: DailyBonusPoints = {
      wordleQuick: false,
      connectionsPerfect: false,
      strandsSpanagram: false
    };

    parts.forEach(part => {
      if (part.startsWith('W')) {
        gameScores.wordle = parseInt(part.slice(1)) || 0;
        score += gameScores.wordle;
      } else if (part.startsWith('C')) {
        const [attempts] = part.slice(1).split('/');
        gameScores.connections = parseInt(attempts) || 0;
        score += gameScores.connections;
      } else if (part.startsWith('S')) {
        gameScores.strands = parseInt(part.slice(1)) || 0;
        score += gameScores.strands;
      } else if (part === 'BW') {
        bonusPoints.wordleQuick = true;
        score += 1;
      } else if (part === 'BC') {
        bonusPoints.connectionsPerfect = true;
        score += 1;
      } else if (part === 'BS') {
        bonusPoints.strandsSpanagram = true;
        score += 1;
      }
    });

    return { score, bonusPoints, gameScores };
  };
  
  const finalizeDayScores = async () => {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('daily_scores')
        .update({ finalized: true })
        .eq('date', currentDate);
 
      if (error) throw error;
      await fetchAllScores();
    } catch (error) {
      console.error('Error finalizing scores:', error);
    }
  };

  const handlePlayerSelect = (player: PlayerKey) => {
    setCurrentEntry(player);
  };
 
  // Add input handling UI elements
  return (
    <div className="w-full max-w-4xl mx-auto">
      {!isAdmin && <AdminAuth onLogin={() => setIsAdmin(true)} />}
      <div className="p-6">
        {isAdmin && (
          <>
            <div className="mb-4 flex justify-end">
              <ArchiveButton onArchiveComplete={fetchAllScores} />
            </div>
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                {['player1', 'player2', 'player3', 'player4'].map((player) => (
                  <button
                    key={player}
                    onClick={() => handlePlayerSelect(player as PlayerKey)}
                    className={`px-4 py-2 rounded ${
                      currentEntry === player ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {player === 'player1' ? 'Keith' : 
                     player === 'player2' ? 'Mike' : 
                     player === 'player3' ? 'Colleen' : 'Toby'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 p-2 border rounded"
                  placeholder="Enter scores..."
                  disabled={!currentEntry}
                />
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                  disabled={!currentEntry || !inputText}
                >
                  Submit
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Scoreboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ScoreCard playerName={player1Name} score={scores.player1} />
          <ScoreCard playerName={player2Name} score={scores.player2} />
          <ScoreCard playerName={player3Name} score={scores.player3} />
          <ScoreCard playerName={player4Name} score={scores.player4} />
        </div>
        
        {/* Score Charts */}
        <ScoreCharts scores={scores} />
      </div>
    </div>
  );
};

export default PuzzleScoreboard;