'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { publicSupabase } from '@/lib/supabase';
import { PlayerScores } from '@/types';

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

interface ScoreHistoryChartProps {
  scores: PlayerScores;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded shadow">
        <p className="font-bold mb-2">{label}</p>
        {payload.map((entry: TooltipPayloadItem, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ScoreHistoryChart: React.FC<ScoreHistoryChartProps> = ({ playerScores }) => {
  const [playerData, setPlayerData] = useState<PlayerScores>(playerScores);

  useEffect(() => {
    const fetchScores = async () => {
      // Get all players first
      const { data: players, error: playersError } = await publicSupabase
        .from('players')
        .select('*')
        .order('id');

        if (playersError) {
          console.error('Error fetching players:', playersError);
          return;
        }
  
        // Then get all scores
        const { data: dailyScores, error: scoresError } = await publicSupabase
          .from('daily_scores')
          .select('*')
          .order('date');
  
        if (scoresError) {
          console.error('Error fetching scores:', scoresError);
          return;
        }

      // Transform the data to match your current structure
      const transformedData: PlayerScores = {
        player1: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
        player2: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
        player3: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
      };

      dailyScores.forEach((score) => {
        const playerIndex = players.findIndex(p => p.id === score.player_id);
        if (playerIndex === -1) return;

        const playerKey = `player${playerIndex + 1}` as keyof PlayerScores;
        
        transformedData[playerKey].dailyScores[score.date] = {
          date: score.date,
          wordle: score.wordle || 0,
          connections: score.connections || 0,
          strands: score.strands || 0,
          total: score.total || 0,
          bonusPoints: {
            wordleQuick: score.bonus_wordle || false,
            connectionsPerfect: score.bonus_connections || false,
            strandsSpanagram: score.bonus_strands || false
          },
          finalized: score.finalized || false
        };

        // Update bonus totals
        if (score.bonus_wordle) transformedData[playerKey].totalBonuses.wordle++;
        if (score.bonus_connections) transformedData[playerKey].totalBonuses.connections++;
        if (score.bonus_strands) transformedData[playerKey].totalBonuses.strands++;
        
        transformedData[playerKey].total += score.total || 0;
      });

      setPlayerData(transformedData);
    };

    fetchScores();
  }, []);

  const chartData = useMemo(() => {
    // Get all dates from both players
    const allDates = new Set([
      ...Object.keys(scores.player1.dailyScores),
      ...Object.keys(scores.player2.dailyScores),
      ...Object.keys(scores.player3.dailyScores)
    ]);

    // Convert to array and sort chronologically
    const sortedDates = Array.from(allDates).sort();

    // Calculate running totals for each date
    let player1RunningTotal = 0;
    let player2RunningTotal = 0;

    return sortedDates.map(date => {
      // Get daily scores for each player
      const p1DailyScore = scores.player1.dailyScores[date]?.total || 0;
      const p2DailyScore = scores.player2.dailyScores[date]?.total || 0;
      const p3DailyScore = scores.player3.dailyScores[date]?.total || 0;
      
      // Get individual game scores
      const p1Wordle = playerData.player1.dailyScores[date]?.wordle || 0;
      const p1Connections = playerData.player1.dailyScores[date]?.connections || 0;
      const p1Strands = playerData.player1.dailyScores[date]?.strands || 0;
      
      const p2Wordle = scores.player2.dailyScores[date]?.wordle || 0;
      const p2Connections = scores.player2.dailyScores[date]?.connections || 0;
      const p2Strands = scores.player2.dailyScores[date]?.strands || 0;

      const p3Wordle = scores.player3.dailyScores[date]?.wordle || 0;
      const p3Connections = scores.player3.dailyScores[date]?.connections || 0;
      const p3Strands = scores.player3.dailyScores[date]?.strands || 0;
      
      // Update running totals
      player1RunningTotal += p1DailyScore;
      player2RunningTotal += p2DailyScore;

      return {
        date,
        'Keith Total': player1RunningTotal,
        'Mike Total': player2RunningTotal,
        'Keith Daily': p1DailyScore,
        'Mike Daily': p2DailyScore,
        // Individual game scores
        'Keith Wordle': p1Wordle,
        'Keith Connections': p1Connections,
        'Keith Strands': p1Strands,
        'Mike Wordle': p2Wordle,
        'Mike Connections': p2Connections,
        'Mike Strands': p2Strands,
      };
    });
  }, [playerData]);

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow border">
      <h3 className="text-xl font-bold mb-4">Score History</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Running Totals - Main solid lines */}
            <Line
              type="monotone"
              dataKey="Keith Total"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Mike Total"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
            />

            {/* Daily Totals - Dashed lines */}
            <Line
              type="monotone"
              dataKey="Keith Daily"
              stroke="#93c5fd"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="Mike Daily"
              stroke="#fca5a5"
              strokeWidth={1}
              strokeDasharray="5 5"
            />

            {/* Individual Game Scores - Keith */}
            <Line
              type="monotone"
              dataKey="Keith Wordle"
              stroke="#60a5fa"
              strokeWidth={1}
              dot={true}
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="Keith Connections"
              stroke="#3b82f6"
              strokeWidth={1}
              dot={true}
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="Keith Strands"
              stroke="#1d4ed8"
              strokeWidth={1}
              dot={true}
              opacity={0.5}
            />

            {/* Individual Game Scores - Mike */}
            <Line
              type="monotone"
              dataKey="Mike Wordle"
              stroke="#f87171"
              strokeWidth={1}
              dot={true}
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="Mike Connections"
              stroke="#ef4444"
              strokeWidth={1}
              dot={true}
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="Mike Strands"
              stroke="#b91c1c"
              strokeWidth={1}
              dot={true}
              opacity={0.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScoreHistoryChart;