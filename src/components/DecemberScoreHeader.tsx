// src/components/DecemberScoreHeader.tsx
import React from 'react';

interface DecemberScoreHeaderProps {
  player1Score: number;
  player2Score: number;
  player3Score: number;
  player1Name: string;
  player2Name: string;
  player3Name: string;
}

export const DecemberScoreHeader: React.FC<DecemberScoreHeaderProps> = ({
  player1Score,
  player2Score,
  player3Score,
  player1Name,
  player2Name,
  player3Name
}) => {
  const getScoreColor = (score: number, maxScore: number) => {
    const ratio = score / maxScore;
    if (ratio >= 0.95) return 'bg-green-500';
    if (ratio >= 0.9) return 'bg-green-400';
    if (ratio >= 0.8) return 'bg-blue-500';
    if (ratio >= 0.7) return 'bg-blue-400';
    if (ratio >= 0.6) return 'bg-yellow-500';
    return 'bg-yellow-400';
  };

  const maxScore = Math.max(player1Score, player2Score, player3Score);

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-center mb-6">Total Points</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <div className="text-xl font-bold mb-2">{player1Name}</div>
          <div className={`text-4xl font-bold p-4 rounded-lg text-white ${getScoreColor(player1Score, maxScore)}`}>
            {player1Score}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-xl font-bold mb-2">{player2Name}</div>
          <div className={`text-4xl font-bold p-4 rounded-lg text-white ${getScoreColor(player2Score, maxScore)}`}>
            {player2Score}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-xl font-bold mb-2">{player3Name}</div>
          <div className={`text-4xl font-bold p-4 rounded-lg text-white ${getScoreColor(player3Score, maxScore)}`}>
            {player3Score}
          </div>
        </div>
      </div>
    </div>
  );
};