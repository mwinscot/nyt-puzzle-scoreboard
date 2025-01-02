import React, { useEffect, useState } from 'react';
import { publicSupabase } from '@/lib/supabase';
import { ScoreCharts } from '@/components/ScoreCharts';
import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import { PlayerScores, ScoreRecord, PlayerName } from '@/types';

const DecemberScoreboard = () => {
  const [scores, setScores] = useState<PlayerScores>({
    player1: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
    player2: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
    player3: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } }
  });

  useEffect(() => {
    const fetchDecemberScores = async () => {
      const { data: scoresData, error } = await publicSupabase
        .from('daily_scores')
        .select(`
          *,
          players (
            name
          )
        `)
        .gte('date', '2024-12-10')
        .lte('date', '2024-12-31')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching scores:', error);
        return;
      }

      const newScores = {
        player1: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
        player2: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
        player3: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } }
      };

      scoresData?.forEach((score: ScoreRecord) => {
        const playerName = score.players.name as PlayerName;
        const playerKey = getPlayerKeyFromName(playerName);
        
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
    };

    fetchDecemberScores();
  }, []);

  const getPlayerKeyFromName = (name: PlayerName) => {
    switch (name) {
      case 'Keith': return 'player1';
      case 'Mike': return 'player2';
      case 'Colleen': return 'player3';
      default: throw new Error('Invalid player name');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8">December 2024 Contest Final Results</h1>
      
      <TotalScoreHeader
        player1Score={scores.player1.total}
        player2Score={scores.player2.total}
        player3Score={scores.player3.total}
        player1Name="Keith"
        player2Name="Mike"
        player3Name="Colleen"
      />

      <ScoreCharts scores={scores} />

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Bonus Point Totals</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold">Keith</h3>
            <p>Wordle: {scores.player1.totalBonuses.wordle}</p>
            <p>Connections: {scores.player1.totalBonuses.connections}</p>
            <p>Strands: {scores.player1.totalBonuses.strands}</p>
          </div>
          <div>
            <h3 className="font-semibold">Mike</h3>
            <p>Wordle: {scores.player2.totalBonuses.wordle}</p>
            <p>Connections: {scores.player2.totalBonuses.connections}</p>
            <p>Strands: {scores.player2.totalBonuses.strands}</p>
          </div>
          <div>
            <h3 className="font-semibold">Colleen</h3>
            <p>Wordle: {scores.player3.totalBonuses.wordle}</p>
            <p>Connections: {scores.player3.totalBonuses.connections}</p>
            <p>Strands: {scores.player3.totalBonuses.strands}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecemberScoreboard;