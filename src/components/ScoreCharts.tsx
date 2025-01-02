import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlayerScores } from '@/types';
import { convertToPST } from '@/utils/dateUtils';

interface ScoreChartsProps {
  scores: PlayerScores;
}

const ScoreCharts: React.FC<ScoreChartsProps> = ({ scores }) => {
  const allDates = Object.keys(scores.player1.dailyScores);

  const chartData = allDates.map(date => {
    return {
      date,
      Keith: scores.player1.dailyScores[date]?.total || 0,
      Mike: scores.player2.dailyScores[date]?.total || 0,
      Colleen: scores.player3.dailyScores[date]?.total || 0,
      // Add original scores for debugging
      originalDate: date,
      originalKeith: scores.player1.dailyScores[date]?.total || 0
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  console.log('Chart data after sorting:', chartData);

  let keithTotal = 0;
  let mikeTotal = 0;
  let colleenTotal = 0;

  const cumulativeData = chartData.map(day => {
    const result = {
      date: day.date,
      Keith: (keithTotal += day.Keith),
      Mike: (mikeTotal += day.Mike),
      Colleen: (colleenTotal += day.Colleen)
    };
    console.log(`Cumulative for ${day.date}: Keith=${result.Keith}`);
    return result;
  });

  // Game performance data calculation
  const gamePerformanceData = [
    {
      name: 'Keith',
      Wordle: Object.values(scores.player1.dailyScores).reduce((sum, day) => sum + (day.wordle || 0), 0),
      Connections: Object.values(scores.player1.dailyScores).reduce((sum, day) => sum + (day.connections || 0), 0),
      Strands: Object.values(scores.player1.dailyScores).reduce((sum, day) => sum + (day.strands || 0), 0)
    },
    {
      name: 'Mike',
      Wordle: Object.values(scores.player2.dailyScores).reduce((sum, day) => sum + (day.wordle || 0), 0),
      Connections: Object.values(scores.player2.dailyScores).reduce((sum, day) => sum + (day.connections || 0), 0),
      Strands: Object.values(scores.player2.dailyScores).reduce((sum, day) => sum + (day.strands || 0), 0)
    },
    {
      name: 'Colleen',
      Wordle: Object.values(scores.player3.dailyScores).reduce((sum, day) => sum + (day.wordle || 0), 0),
      Connections: Object.values(scores.player3.dailyScores).reduce((sum, day) => sum + (day.connections || 0), 0),
      Strands: Object.values(scores.player3.dailyScores).reduce((sum, day) => sum + (day.strands || 0), 0)
    }
  ];

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
            <Line type="monotone" dataKey="Keith" stroke="#8884d8" strokeWidth={3} />
            <Line type="monotone" dataKey="Mike" stroke="#82ca9d" strokeWidth={3} />
            <Line type="monotone" dataKey="Colleen" stroke="#ffc658" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-96 w-full mb-16">
        <h2 className="text-xl font-bold mb-4">Game Performance</h2>
        <ResponsiveContainer>
          <BarChart data={gamePerformanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Wordle" stackId="a" fill="#8884d8" />
            <Bar dataKey="Connections" stackId="a" fill="#82ca9d" />
            <Bar dataKey="Strands" stackId="a" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScoreCharts;