// MonthlyArchive.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import ScoreCharts from '@/components/ScoreCharts';
import { PlayerScores } from '@/types';
import { TotalScoreHeader } from '@/components/puzzle-scoreboard';
interface MonthlyArchiveProps {
  month: string;
  scores: PlayerScores;
}

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