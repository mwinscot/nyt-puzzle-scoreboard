// components/TotalScoreHeader.tsx
import React from 'react';
import { Trophy } from 'lucide-react';

interface TotalScoreHeaderProps {
  player1Score: number;
  player2Score: number;
  player3Score: number;
  player1Name: string;
  player2Name: string;
  player3Name: string;
}

export const TotalScoreHeader: React.FC<TotalScoreHeaderProps> = ({ 
  player1Score, 
  player2Score, 
  player3Score, 
  player1Name, 
  player2Name, 
  player3Name 
}) => {
  const getWinnerStyles = (score: number, otherScores: number[]) => {
    if (score > Math.max(...otherScores)) return "text-green-700";
    if (score < Math.max(...otherScores)) return "text-red-700";
    return "text-gray-900";
  };

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow">
      <div className="grid grid-cols-3 gap-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">{player1Name}</div>
          <div className={`text-5xl font-bold mt-2 ${getWinnerStyles(player1Score, [player2Score, player3Score])}`}>
            {player1Score}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">{player2Name}</div>
          <div className={`text-5xl font-bold mt-2 ${getWinnerStyles(player2Score, [player1Score, player3Score])}`}>
            {player2Score}
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">{player3Name}</div>
          <div className={`text-5xl font-bold mt-2 ${getWinnerStyles(player3Score, [player1Score, player2Score])}`}>
            {player3Score}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-center items-center">
        <Trophy className="w-5 h-5 text-yellow-600 mr-2" />
        <span className="text-sm text-gray-800 font-medium">Total Points</span>
      </div>
    </div>
  );
};