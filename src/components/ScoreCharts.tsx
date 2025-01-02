import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlayerScores } from '@/types';
import { convertToPST } from '@/utils/dateUtils';

interface ScoreChartsProps {
  scores: PlayerScores;
}

const ScoreCharts: React.FC<ScoreChartsProps> = ({ scores }) => {
  // Calculate running totals and game-specific data
  const dates = Object.keys(scores.player1.dailyScores);
  
  const chartData = dates.map(date => {
    const pstDate = convertToPST(date);
    return {
      date: pstDate,
      Keith: scores.player1.dailyScores[date]?.total || 0,
      Mike: scores.player2.dailyScores[date]?.total || 0,
      Colleen: scores.player3.dailyScores[date]?.total || 0
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Calculate cumulative scores
  let keithTotal = 0;
  let mikeTotal = 0;
  let colleenTotal = 0;

  const cumulativeData = chartData.map(day => ({
    date: day.date,
    Keith: (keithTotal += day.Keith),
    Mike: (mikeTotal += day.Mike),
    Colleen: (colleenTotal += day.Colleen)
  }));

  // Calculate game-specific performance
  const gameData = dates.map(date => {
    const pstDate = convertToPST(date);
    return {
      date: pstDate,
      'Keith Wordle': scores.player1.dailyScores[date]?.wordle || 0,
      'Mike Wordle': scores.player2.dailyScores[date]?.wordle || 0,
      'Colleen Wordle': scores.player3.dailyScores[date]?.wordle || 0,
      'Keith Connections': scores.player1.dailyScores[date]?.connections || 0,
      'Mike Connections': scores.player2.dailyScores[date]?.connections || 0,
      'Colleen Connections': scores.player3.dailyScores[date]?.connections || 0,
      'Keith Strands': scores.player1.dailyScores[date]?.strands || 0,
      'Mike Strands': scores.player2.dailyScores[date]?.strands || 0,
      'Colleen Strands': scores.player3.dailyScores[date]?.strands || 0,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8 mt-8">
      <div className="h-96 w-full">
        <h2 className="text-xl font-bold mb-4">Total Score Progress</h2>
        <ResponsiveContainer>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Keith" stroke="#8884d8" />
            <Line type="monotone" dataKey="Mike" stroke="#82ca9d" />
            <Line type="monotone" dataKey="Colleen" stroke="#ffc658" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-96 w-full">
        <h2 className="text-xl font-bold mb-4">Game Performance</h2>
        <ResponsiveContainer>
          <LineChart data={gameData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Keith Wordle" stroke="#8884d8" />
            <Line type="monotone" dataKey="Mike Wordle" stroke="#82ca9d" />
            <Line type="monotone" dataKey="Colleen Wordle" stroke="#ffc658" />
            <Line type="monotone" dataKey="Keith Connections" stroke="#8884d8" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="Mike Connections" stroke="#82ca9d" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="Colleen Connections" stroke="#ffc658" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="Keith Strands" stroke="#8884d8" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="Mike Strands" stroke="#82ca9d" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="Colleen Strands" stroke="#ffc658" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScoreCharts;