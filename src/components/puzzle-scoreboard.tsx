import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Target, Puzzle, Brain, Star } from 'lucide-react';
import { supabase, publicSupabase } from '@/lib/supabase';
import { PlayerScores, PlayerData, PlayerKey, PlayerName, BonusPoints } from '@/types';
import { AdminAuth } from './AdminAuth';
import ScoreCharts from '@/components/ScoreCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMonthDateRange } from '@/utils/dateUtils';
import { TotalScoreHeader } from './TotalScoreHeader';
import { ScoreCard } from './ScoreCard';

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
   default: throw new Error('Invalid player name');
 }
};

const PuzzleScoreboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [player1Name] = useState<string>('Keith');
  const [player2Name] = useState<string>('Mike');
  const [player3Name] = useState<string>('Colleen');
  const [inputText, setInputText] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<PlayerKey | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(getCurrentDatePST());
  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData()
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
 
  const fetchAllScores = async () => {
    try {
      const { data: scoresData, error } = await publicSupabase
        .from('daily_scores')
        .select(`*, players (name)`)
        .gte('date', start);
 
      if (error) throw error;
 
      const newScores: PlayerScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData(),
        player3: initialPlayerData()
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
  };
 
  const handleSubmit = async () => {
    if (!currentEntry || !inputText || !isAdmin) return;
 
    try {
      const { score, bonusPoints, gameScores } = calculateScores(inputText);
      
      const playerName = currentEntry === 'player1' ? 'Keith' : 
                        currentEntry === 'player2' ? 'Mike' : 'Colleen';
 
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
 
  const calculateScores = (input: string) => {
    // Implement your score calculation logic here
    // This is a placeholder implementation
    const score = 0;
    const bonusPoints = {
      wordleQuick: false,
      connectionsPerfect: false,
      strandsSpanagram: false
    };
    const gameScores = {
      wordle: 0,
      connections: 0,
      strands: 0
    };
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
 
  return (
    <div className="w-full max-w-4xl mx-auto">
      {!isAdmin && <AdminAuth onLogin={() => setIsAdmin(true)} />}
      <div className="p-6">
        {/* Archive button */}
        {isAdmin && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={archiveDecember}
              className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Archive December Scores
            </button>
          </div>
        )}
        
        {/* Rest of your existing JSX */}
      </div>
    </div>
  );
 };
 
 export default PuzzleScoreboard;