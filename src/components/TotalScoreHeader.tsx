import React from 'react';

interface TotalScoreHeaderProps {
  player1Score: number;
  player2Score: number;
  player3Score: number;
  player4Score: number;
  player1Name: string;
  player2Name: string;
  player3Name: string;
  player4Name: string;
}

export const TotalScoreHeader: React.FC<TotalScoreHeaderProps> = ({
  player1Score,
  player2Score,
  player3Score,
  player4Score,
  player1Name,
  player2Name,
  player3Name,
  player4Name
}) => {
  // Function to determine background and text colors based on ranking
  const getStyles = (score: number, maxScore: number) => {
    const ratio = score / maxScore;
    if (ratio >= 0.95) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white';
    if (ratio >= 0.9) return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white';
    if (ratio >= 0.85) return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white';
    if (ratio >= 0.8) return 'bg-blue-500 text-white';
    if (ratio >= 0.7) return 'bg-blue-400 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  const maxScore = Math.max(player1Score, player2Score, player3Score, player4Score);

  return (
    <div className="rounded-lg p-6 bg-gradient-to-br from-gray-50 to-gray-100 shadow-md">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Total Points</h2>
      <div className="grid grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-xl font-bold mb-3 text-gray-700">{player1Name}</div>
          <div className={`text-4xl font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 ${getStyles(player1Score, maxScore)}`}>
            {player1Score}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold mb-3 text-gray-700">{player2Name}</div>
          <div className={`text-4xl font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 ${getStyles(player2Score, maxScore)}`}>
            {player2Score}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold mb-3 text-gray-700">{player3Name}</div>
          <div className={`text-4xl font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 ${getStyles(player3Score, maxScore)}`}>
            {player3Score}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold mb-3 text-gray-700">{player4Name}</div>
          <div className={`text-4xl font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 ${getStyles(player4Score, maxScore)}`}>
            {player4Score}
          </div>
        </div>
      </div>
    </div>
  );
};