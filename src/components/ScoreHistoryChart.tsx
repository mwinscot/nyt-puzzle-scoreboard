'use client';
export {};

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

interface BonusPoints {
  wordleQuick: boolean;
  connectionsPerfect: boolean;
  strandsSpanagram: boolean;
}

interface DailyScore {
  date: string;
  wordle: number;
  connections: number;
  strands: number;
  total: number;
  bonusPoints: BonusPoints;
  finalized: boolean;
}

interface PlayerData {
  dailyScores: { [date: string]: DailyScore };
  total: number;
  totalBonuses: {
    wordle: number;
    connections: number;
    strands: number;
  };
}

interface PlayerScores {
  player1: PlayerData;
  player2: PlayerData;
}

interface ScoreHistoryChartProps {
  scores: PlayerScores;
}

const ScoreHistoryChart: React.FC<ScoreHistoryChartProps> = ({ scores }) => {
  const chartData = useMemo(() => {
    // Get all dates from both players
    const allDates = new Set([
      ...Object.keys(scores.player1.dailyScores),
      ...Object.keys(scores.player2.dailyScores)
    ]);

    // Convert to array and sort chronologically
    const sortedDates = Array.from(allDates).sort();

    // Calculate running totals for each date
    let player1RunningTotal = 0;
    let player2RunningTotal = 0;

    return sortedDates.map(date => {
      const p1DayScore = scores.player1.dailyScores[date]?.total || 0;
      const p2DayScore = scores.player2.dailyScores[date]?.total || 0;
      
      player1RunningTotal += p1DayScore;
      player2RunningTotal += p2DayScore;

      return {
        date,
        'Keith Total': player1RunningTotal,
        'Mike Total': player2RunningTotal,
        'Keith Daily': p1DayScore,
        'Mike Daily': p2DayScore,
      };
    });
  }, [scores]);

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
            <Tooltip />
            <Legend />
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScoreHistoryChart;