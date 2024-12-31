// MonthlyArchive.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import ScoreCharts from '@/components/ScoreCharts';
import { PlayerScores } from '@/types';
interface MonthlyArchiveProps {
  month: string;
  scores: PlayerScores;
}

interface TotalScoreHeaderProps {
  player1Score: number;
  player2Score: number;
  player3Score: number;
  player1Name: string;
  player2Name: string;
  player3Name: string;
}

const TotalScoreHeader: React.FC<TotalScoreHeaderProps> = ({ player1Score, player2Score, player3Score, player1Name, player2Name, player3Name }) => (
  <div>
    <h2>Total Scores</h2>
    <p>{player1Name}: {player1Score}</p>
    <p>{player2Name}: {player2Score}</p>
    <p>{player3Name}: {player3Score}</p>
  </div>
);

const MonthlyArchive: React.FC<MonthlyArchiveProps> = ({ month, scores }) => (
  <div className="w-full max-w-4xl mx-auto p-6">
    <h1 className="text-2xl font-bold mb-6">{new Date(month).toLocaleString('default', { month: 'long', year: 'numeric' })} Archive</h1>
    <TotalScoreHeader 
      player1Score={scores.player1.total}
      player2Score={scores.player2.total}
      player3Score={scores.player3.total}
      player1Name="Keith"
      player2Name="Mike"
      player3Name="Colleen"
    />
    <ScoreCharts scores={scores} />
  </div>
);

export default MonthlyArchive;