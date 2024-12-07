'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Target, Puzzle, Brain, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ScoreHistoryChart from './ScoreHistoryChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TotalScoreHeaderProps {
  player1Score: number;
  player2Score: number;
  player1Name: string;
  player2Name: string;
}

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

interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ElementType;
  bonusCount?: number;
}

const initialPlayerData = (): PlayerData => ({
  dailyScores: {},
  total: 0,
  totalBonuses: {
    wordle: 0,
    connections: 0,
    strands: 0
  }
});

const TotalScoreHeader: React.FC<TotalScoreHeaderProps> = ({ player1Score, player2Score, player1Name, player2Name }) => {
  const getWinnerStyles = (score1: number, score2: number) => {
    if (score1 > score2) return "text-green-700"; // Darker green
    if (score2 > score1) return "text-red-700"; // Darker red
    return "text-gray-900";
  };

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow">
      <div className="grid grid-cols-2 gap-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">{player1Name}</div>
          <div className={`text-5xl font-bold mt-2 ${getWinnerStyles(player1Score, player2Score)}`}>
            {player1Score}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">{player2Name}</div>
          <div className={`text-5xl font-bold mt-2 ${getWinnerStyles(player2Score, player1Score)}`}>
            {player2Score}
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

const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, icon: Icon, bonusCount }) => (
  <div className="flex items-center space-x-2 p-4 bg-gray-100 rounded-lg">
    <Icon className="w-6 h-6 text-blue-600" />
    <div className="flex-1">
      <div className="text-sm text-gray-800">{title}</div>
      <div className="text-xl font-bold text-gray-900">{score}</div>
    </div>
    {bonusCount !== undefined && bonusCount > 0 && (
      <div className="flex items-center text-yellow-600">
        <Star className="w-4 h-4" />
        <span className="ml-1 text-gray-900">{bonusCount}</span>
      </div>
    )}
  </div>
);

const PuzzleScoreboard: React.FC = () => {
  const [player1Name, setPlayer1Name] = useState<string>('Keith');
  const [player2Name, setPlayer2Name] = useState<string>('Mike');
  const [inputText, setInputText] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<'player1' | 'player2' | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData()
  });

  const calculateScores = (text: string): { score: number, bonusPoints: BonusPoints, gameScores: { wordle: number, connections: number, strands: number } } => {
    const bonusPoints: BonusPoints = {
      wordleQuick: false,
      connectionsPerfect: false,
      strandsSpanagram: false
    };
    const gameScores = {
      wordle: 0,
      connections: 0,
      strands: 0
    };
  
    // Parse Wordle
    if (text.includes('Wordle')) {
      const wordleLines = text.split('\n');
      const scoreLine = wordleLines.find(line => line.includes('/6'));
      
      if (scoreLine && !scoreLine.includes('X/6')) {  // Only score if solved (not X/6)
        gameScores.wordle = 1;  // Base point
        
        const guessMatch = scoreLine.match(/(\d+)\/6/);
        if (guessMatch) {
          const guesses = parseInt(guessMatch[1]);
          if (guesses <= 3) {
            gameScores.wordle++;  // Bonus point
            bonusPoints.wordleQuick = true;
          }
        }
      }
    }
  
    // Parse Connections
    if (text.includes('Connections')) {
      let score = 0;
      const lines = text.split('\n');
      const gridLines = lines.filter((line: string) => 
          line.includes('🟪') || line.includes('🟩') || 
          line.includes('🟦') || line.includes('🟨')
      );
  
      if (gridLines.length > 0) {
        // Only proceed if we have enough attempts
        const lastAttempt = gridLines[gridLines.length - 1];
        
        // Check if last line is a complete group (all same color)
        type ColorKey = '🟪' | '🟩' | '🟦' | '🟨';
        const colorCounts: Record<ColorKey, number> = {
          '🟪': 0,
          '🟩': 0,
          '🟦': 0,
          '🟨': 0
        };
        
        Array.from(lastAttempt).forEach(char => {
          if (char in colorCounts) {
            colorCounts[char as ColorKey]++;
          }
        });
        
        // Puzzle is only solved if last line has all same color
        const isComplete = Object.values(colorCounts).some(count => count === 4);
  
        if (isComplete) {
          // Check if purple was first - this is a 3-point perfect game
          const firstLine = gridLines[0];
          if (firstLine && Array.from(firstLine).filter(char => char === '🟪').length === 4) {
            score = 3;  // Perfect game with purple first
            bonusPoints.connectionsPerfect = true;
          } else {
            score = 1;  // Normal completion
          }
          
          // If it wasn't a perfect game, check for missed lines
          if (score === 1) {
            const missedLines = gridLines.slice(0, -1).filter(line => {
              const colors = ['🟪', '🟩', '🟦', '🟨'].filter(color => line.includes(color));
              return colors.length > 1;
            }).length;
            
            score = Math.max(1, score - missedLines);
          }
        }
      }
      
      gameScores.connections = score;
    }
    
    // Parse Strands
    if (text.includes('Strands')) {
      const lines = text.split('\n');
      const gridLines = lines.filter((line: string) => 
        line.includes('🔵') || line.includes('🟡')
      );
      
      if (gridLines.length > 0) {
        gameScores.strands = 1;  // Base point
        
        const firstRow = gridLines[0];
        // Get just the first three emoji circles
        const firstThreeEmoji = Array.from(firstRow).filter(char => char === '🔵' || char === '🟡').slice(0, 3);
        if (firstThreeEmoji.includes('🟡')) {
          gameScores.strands++;  // Bonus point
          bonusPoints.strandsSpanagram = true;
        }
      }
    }
  
    const totalScore = gameScores.wordle + gameScores.connections + gameScores.strands;
    console.log('Score breakdown:', {
      wordle: gameScores.wordle,
      connections: gameScores.connections,
      strands: gameScores.strands,
      total: totalScore
    });
    return { score: totalScore, bonusPoints, gameScores };
  };

  const fetchAllScores = async () => {
    try {
      const { data: scores, error } = await supabase
        .from('daily_scores')
        .select(`
          *,
          players (
            name
          )
        `);
  
      if (error) throw error;
  
      const newScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData()
      };
  
      scores?.forEach(score => {
        const playerKey = score.players.name === 'Keith' ? 'player1' : 'player2';
        
        // Add to daily scores
        newScores[playerKey].dailyScores[score.date] = {
          date: score.date,
          wordle: score.wordle,
          connections: score.connections,
          strands: score.strands,
          total: score.total,
          bonusPoints: {
            wordleQuick: score.bonus_wordle,
            connectionsPerfect: score.bonus_connections,
            strandsSpanagram: score.bonus_strands
          },
          finalized: score.finalized
        };
  
        // Update running totals
        newScores[playerKey].total += score.total;
        if (score.bonus_wordle) newScores[playerKey].totalBonuses.wordle++;
        if (score.bonus_connections) newScores[playerKey].totalBonuses.connections++;
        if (score.bonus_strands) newScores[playerKey].totalBonuses.strands++;
      });
  
      setScores(newScores);
    } catch (error) {
      console.error('Error fetching scores:', error);
    }
  };

  const canEditDate = (date: string) => {
    const playerScores = scores.player1.dailyScores[date] || scores.player2.dailyScores[date];
    return date === currentDate && (!playerScores || !playerScores.finalized);
  };

  const handleSubmit = async () => {
    if (!currentEntry || !inputText) return;
  
    const { score, bonusPoints, gameScores } = calculateScores(inputText);
    
    try {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('name', currentEntry === 'player1' ? 'Keith' : 'Mike')
        .single();
  
      if (playerError) throw playerError;
  
      const { error: scoreError } = await supabase
        .from('daily_scores')
        .upsert({
          date: currentDate,
          player_id: player.id,
          wordle: gameScores.wordle,
          connections: gameScores.connections,
          strands: gameScores.strands,
          total: score,
          bonus_wordle: bonusPoints.wordleQuick,
          bonus_connections: bonusPoints.connectionsPerfect,
          bonus_strands: bonusPoints.strandsSpanagram,
          finalized: false
        });
  
      if (scoreError) throw scoreError;
  
      // Refresh all scores from database
      await fetchAllScores();
  
      setInputText('');
      setCurrentEntry(null);
  
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };

  const finalizeDayScores = async () => {
    try {
      const { error } = await supabase
        .from('daily_scores')
        .update({ finalized: true })
        .eq('date', currentDate);
  
      if (error) throw error;
  
      await fetchAllScores();
    } catch (error) {
      console.error('Error finalizing scores:', error);
    }
  };

  useEffect(() => {
    fetchAllScores();
  }, [currentDate]);

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center text-gray-900">NYT Puzzle Competition Scoreboard</h2>
        <div className="mt-4 text-center">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="p-2 border rounded"
          />
        </div>
        
        <TotalScoreHeader 
          player1Score={scores.player1.total}
          player2Score={scores.player2.total}
          player1Name={player1Name}
          player2Name={player2Name}
        />
  
        <div className="space-y-6">
          {/* Player Selection */}
          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentEntry('player1')}
              disabled={!canEditDate(currentDate)}
              className={`p-2 rounded-md flex-1 ${
                currentEntry === 'player1' 
                  ? 'bg-blue-500 text-white' 
                  : canEditDate(currentDate)
                    ? 'bg-gray-200 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Keith's Entry
            </button>
            <button
              onClick={() => setCurrentEntry('player2')}
              disabled={!canEditDate(currentDate)}
              className={`p-2 rounded-md flex-1 ${
                currentEntry === 'player2'
                  ? 'bg-blue-500 text-white'
                  : canEditDate(currentDate)
                  ? 'bg-gray-200 hover:bg-gray-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Mike's Entry
          </button>
        </div>

        {/* Results Input */}
        <div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!canEditDate(currentDate) || !currentEntry}
            className="w-full h-48 p-2 border rounded font-mono"
            placeholder={
              !canEditDate(currentDate)
                ? "Cannot edit past dates"
                : !currentEntry
                ? "Select a player first"
                : "Paste your results here..."
            }
          />
        </div>

        {/* Submit and Clear Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleSubmit}
            disabled={!canEditDate(currentDate) || !currentEntry || !inputText}
            className={`p-2 rounded ${
              canEditDate(currentDate) && currentEntry && inputText
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Submit Entry
          </button>
          <button
            onClick={() => {
              setInputText('');
              setCurrentEntry(null);
            }}
            className="p-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Clear Input
          </button>
        </div>

        {/* Finalize Day Button */}
        <div className="flex justify-center">
          <button
            onClick={finalizeDayScores}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Finalize Day's Scores
          </button>
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-8">
          {/* Player 1 Scores */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Keith</h3>
            <ScoreCard 
              title="Wordle Wins" 
              score={scores.player1.dailyScores[currentDate]?.wordle || 0} 
              icon={Target}
              bonusCount={scores.player1.dailyScores[currentDate]?.bonusPoints.wordleQuick ? 1 : 0}
            />
            <ScoreCard 
              title="Connections Wins" 
              score={scores.player1.dailyScores[currentDate]?.connections || 0} 
              icon={Puzzle}
              bonusCount={scores.player1.dailyScores[currentDate]?.bonusPoints.connectionsPerfect ? 1 : 0}
            />
            <ScoreCard 
              title="Strands Wins" 
              score={scores.player1.dailyScores[currentDate]?.strands || 0} 
              icon={Brain}
              bonusCount={scores.player1.dailyScores[currentDate]?.bonusPoints.strandsSpanagram ? 1 : 0}
            />
            <div className="text-sm text-gray-600 mt-2">
              Total Bonus Points: 
              <span className="ml-2">Wordle ({scores.player1.totalBonuses.wordle})</span>
              <span className="ml-2">Connections ({scores.player1.totalBonuses.connections})</span>
              <span className="ml-2">Strands ({scores.player1.totalBonuses.strands})</span>
            </div>
          </div>

          {/* Player 2 Scores */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Mike</h3>
            <ScoreCard 
              title="Wordle Wins" 
              score={scores.player2.dailyScores[currentDate]?.wordle || 0} 
              icon={Target}
              bonusCount={scores.player2.dailyScores[currentDate]?.bonusPoints.wordleQuick ? 1 : 0}
            />
            <ScoreCard 
              title="Connections Wins" 
              score={scores.player2.dailyScores[currentDate]?.connections || 0} 
              icon={Puzzle}
              bonusCount={scores.player2.dailyScores[currentDate]?.bonusPoints.connectionsPerfect ? 1 : 0}
            />
            <ScoreCard 
              title="Strands Wins" 
              score={scores.player2.dailyScores[currentDate]?.strands || 0} 
              icon={Brain}
              bonusCount={scores.player2.dailyScores[currentDate]?.bonusPoints.strandsSpanagram ? 1 : 0}
            />
            <div className="text-sm text-gray-600 mt-2">
              Total Bonus Points: 
              <span className="ml-2">Wordle ({scores.player2.totalBonuses.wordle})</span>
              <span className="ml-2">Connections ({scores.player2.totalBonuses.connections})</span>
              <span className="ml-2">Strands ({scores.player2.totalBonuses.strands})</span>
            </div>
          </div>
        </div>

        {/* Score History Chart */}
        <ScoreHistoryChart scores={scores} />

        {/* Rules Section */}
        <Card className="mt-8 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Game Rules & Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wordle Rules */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Wordle</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-800">
                <li>1 point for completing the puzzle</li>
                <li>1 bonus point if finished within 3 lines or less</li>
              </ul>
            </div>

            <div className="my-4 border-t border-gray-200" />

            {/* Connections Rules */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Connections</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-800">
                <li>1 point for completing the puzzle</li>
                <li>3 points if you get purple first and complete with no errors</li>
                <li>2 points if you get purple first but have one error</li>
                <li>1 point if you get purple first but have multiple errors</li>
              </ul>
            </div>

            <div className="my-4 border-t border-gray-200" />

            {/* Strands Rules */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Strands</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-800">
                <li>1 point for completing the puzzle with no hints</li>
                <li>1 bonus point if spanagram found by third word</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);
};

export default PuzzleScoreboard;