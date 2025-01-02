import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlayerScores } from '@/types';
import { getCurrentDatePST, convertToPST } from '@/utils/dateUtils';

interface ScoreChartsProps {
  scores: PlayerScores;
}

const ScoreCharts: React.FC<ScoreChartsProps> = ({ scores }) => {
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

  return (
    <div className="h-96 w-full mt-8">
      <h2 className="text-xl font-bold mb-4">Score Progress</h2>
      <ResponsiveContainer>
        <LineChart data={chartData}>
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
  );
};

export default ScoreCharts;