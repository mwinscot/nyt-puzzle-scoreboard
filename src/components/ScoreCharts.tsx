import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ChartProps {
  scores: {
    player1: {
      dailyScores: { [key: string]: any };
      total: number;
    };
    player2: {
      dailyScores: { [key: string]: any };
      total: number;
    };
    player3: {
      dailyScores: { [key: string]: any };
      total: number;
    };
  };
}

const ScoreCharts: React.FC<ChartProps> = ({ scores }) => {
  // Process data for line chart
  const getDailyData = () => {
    const dates = Array.from(
      new Set([
        ...Object.keys(scores.player1.dailyScores),
        ...Object.keys(scores.player2.dailyScores),
        ...Object.keys(scores.player3.dailyScores),
      ])
    ).sort();

    return dates.map(date => ({
      date,
      Keith: scores.player1.dailyScores[date]?.total || 0,
      Mike: scores.player2.dailyScores[date]?.total || 0,
      Colleen: scores.player3.dailyScores[date]?.total || 0,
    }));
  };

  // Process data for stacked bar chart
  const getGameBreakdown = () => {
    return [
      {
        name: 'Keith',
        Wordle: Object.values(scores.player1.dailyScores).reduce((sum, day) => sum + (day.wordle || 0), 0),
        Connections: Object.values(scores.player1.dailyScores).reduce((sum, day) => sum + (day.connections || 0), 0),
        Strands: Object.values(scores.player1.dailyScores).reduce((sum, day) => sum + (day.strands || 0), 0),
      },
      {
        name: 'Mike',
        Wordle: Object.values(scores.player2.dailyScores).reduce((sum, day) => sum + (day.wordle || 0), 0),
        Connections: Object.values(scores.player2.dailyScores).reduce((sum, day) => sum + (day.connections || 0), 0),
        Strands: Object.values(scores.player2.dailyScores).reduce((sum, day) => sum + (day.strands || 0), 0),
      },
      {
        name: 'Colleen',
        Wordle: Object.values(scores.player3.dailyScores).reduce((sum, day) => sum + (day.wordle || 0), 0),
        Connections: Object.values(scores.player3.dailyScores).reduce((sum, day) => sum + (day.connections || 0), 0),
        Strands: Object.values(scores.player3.dailyScores).reduce((sum, day) => sum + (day.strands || 0), 0),
      },
    ];
  };

  return (
    <div className="space-y-8">
      {/* Total Score Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Total Score Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getDailyData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Points']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Keith" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Mike" 
                  stroke="#16a34a" 
                  strokeWidth={3}
                  dot={{ strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Colleen" 
                  stroke="#dc2626" 
                  strokeWidth={3}
                  dot={{ strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Game Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Game Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getGameBreakdown()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Wordle" stackId="a" fill="#22c55e" /> {/* Green */}
                <Bar dataKey="Connections" stackId="a" fill="#3b82f6" /> {/* Blue */}
                <Bar dataKey="Strands" stackId="a" fill="#f59e0b" /> {/* Amber */}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoreCharts;