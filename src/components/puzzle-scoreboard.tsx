import React, { useState, useEffect } from 'react';
import { Trophy, Target, Puzzle, Brain, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ScoreHistoryChart from './ScoreHistoryChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TotalScoreHeaderProps {
  player1Score: number;
  player2Score: number;
  player3Score: number;
  player1Name: string;
  player2Name: string;
  player3Name: string;
}

interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ElementType;
  bonusCount?: number;
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
  player3: PlayerData;
}

type PlayerKey = 'player1' | 'player2' | 'player3';
type PlayerName = 'Keith' | 'Mike' | 'Colleen';

const initialPlayerData = (): PlayerData => ({
  dailyScores: {},
  total: 0,
  totalBonuses: {
    wordle: 0,
    connections: 0,
    strands: 0
  }
});

const TotalScoreHeader: React.FC<TotalScoreHeaderProps> = ({ 
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

const PuzzleScoreboard: React.FC = () => {
  const [player1Name, setPlayer1Name] = useState<string>('Keith');
  const [player2Name, setPlayer2Name] = useState<string>('Mike');
  const [player3Name, setPlayer3Name] = useState<string>('Colleen');
  const [inputText, setInputText] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<'player1' | 'player2' | 'player3' | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData()
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
  
    // Split the text into sections for each puzzle
    const lines = text.split('\n');
    
    // Parse Connections
    if (text.includes('Connections')) {
      let score = 0;
      // Find the Connections section
      const connectionsStartIndex = lines.findIndex(line => line.trim() === 'Connections');
      if (connectionsStartIndex !== -1) {
        // Get only the lines related to Connections until the next puzzle or end
        const connectionsLines = lines.slice(connectionsStartIndex);
        const nextPuzzleIndex = connectionsLines.findIndex((line, i) => 
          i > 0 && (line.includes('Wordle') || line.includes('Strands'))
        );
        
        const connectionSection = nextPuzzleIndex !== -1 
          ? connectionsLines.slice(0, nextPuzzleIndex)
          : connectionsLines;

        console.log('Connections section:', connectionSection);
        
        // Filter for grid lines
        const gridLines = connectionSection.filter((line: string) => 
          line.includes('🟪') || line.includes('🟩') || 
          line.includes('🟦') || line.includes('🟨')
        );
        console.log('Grid lines:', gridLines);

        if (gridLines.length > 0) {
          const lastAttempt = gridLines[gridLines.length - 1];
          
          // Check if puzzle is completed
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
          
          const isComplete = Object.values(colorCounts).some(count => count === 4);

          if (isComplete) {
            // Check if there were any errors
            const hasErrors = gridLines.slice(0, -1).some(line => {
              const colors = ['🟪', '🟩', '🟦', '🟨'].filter(color => line.includes(color));
              return colors.length > 1;
            });

            // Check if purple was first
            const firstLine = gridLines[0];
            const purpleFirst = firstLine && Array.from(firstLine).filter(char => char === '🟪').length === 4;

            if (purpleFirst) {
              if (!hasErrors) {
                score = 3; // Purple first, no errors
                bonusPoints.connectionsPerfect = true;
              } else {
                score = 2; // Purple first, but with errors
              }
            } else {
              if (!hasErrors) {
                score = 2; // No errors, but purple wasn't first
              } else {
                score = 1; // Completed with errors
              }
            }
          }
        }
        
        gameScores.connections = score;
        console.log('Final connections score:', score);
      }
    }
  
    // Parse Wordle
    if (text.includes('Wordle')) {
      const wordleLines = text.split('\n');
      const scoreLine = wordleLines.find(line => line.includes('/6'));
      
      if (scoreLine && !scoreLine.includes('X/6')) {
        gameScores.wordle = 1;
        
        const guessMatch = scoreLine.match(/(\d+)\/6/);
        if (guessMatch) {
          const guesses = parseInt(guessMatch[1]);
          if (guesses <= 3) {
            gameScores.wordle++;
            bonusPoints.wordleQuick = true;
          }
        }
      }
    }
    
  // Parse Strands
  if (text.includes('Strands')) {
    console.log('=== STRANDS DEBUGGING ===');
    console.log('Raw input text:', JSON.stringify(text));
    
    const lines = text.split('\n');
    console.log('All lines:', lines.map(line => JSON.stringify(line)));
    
    const strandsStartIndex = lines.findIndex(line => line.trim().startsWith('Strands'));
    console.log('Strands start index:', strandsStartIndex);
    
    if (strandsStartIndex !== -1) {
      const strandsLines = lines.slice(strandsStartIndex);
      console.log('Lines after Strands start:', strandsLines.map(line => JSON.stringify(line)));
      
      // Only count lines that actually have moves (circles)
      const gridLines = strandsLines.filter(line => {
        const hasMove = line.includes('🔵') || line.includes('🟡');
        console.log('Line:', JSON.stringify(line), 'Has move:', hasMove);
        return hasMove;
      });
      
      console.log('Found game moves:', gridLines.map(line => JSON.stringify(line)));
      console.log('Number of moves:', gridLines.length);

      if (gridLines.length > 0) {
        // Base point for completion
        gameScores.strands = 1;
        console.log('Base point awarded');
        
        // Check first three MOVES for spanagram
        const firstThreeMoves = gridLines.slice(0, 3);
        console.log('First three moves:', firstThreeMoves.map(line => JSON.stringify(line)));
        
        firstThreeMoves.forEach((move, i) => {
          console.log(`Move ${i + 1} has yellow?`, move.includes('🟡'));
        });
        
        const hasEarlySpanagram = firstThreeMoves.some((move, i) => {
          const hasYellow = move.includes('🟡');
          console.log(`Checking move ${i + 1} for yellow:`, hasYellow);
          return hasYellow;
        });
        
        console.log('Found early spanagram?', hasEarlySpanagram);
        
        if (hasEarlySpanagram) {
          console.log('Adding spanagram bonus point');
          gameScores.strands++;
          bonusPoints.strandsSpanagram = true;
        } else {
          console.log('No spanagram bonus awarded');
        }
      }
    }
    
    console.log('Final Strands score:', gameScores.strands);
  }

  const totalScore = gameScores.wordle + gameScores.connections + gameScores.strands;
  console.log('Final total score breakdown:', {
    wordle: gameScores.wordle,
    connections: gameScores.connections,
    strands: gameScores.strands,
    total: totalScore
  });
  
  return { score: totalScore, bonusPoints, gameScores };
};


  const canEditDate = (date: string, scores: PlayerScores): boolean => {
    const playerScores = [
      scores.player1.dailyScores[date],
      scores.player2.dailyScores[date],
      scores.player3.dailyScores[date]
    ];
    return date === new Date().toISOString().split('T')[0] && 
           (!playerScores.some(score => score?.finalized));
  };
  
  // Add finalizeDayScores function
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
  
  // Helper function to get player key from name
  const getPlayerKeyFromName = (name: PlayerName): PlayerKey => {
    switch (name) {
      case 'Keith': return 'player1';
      case 'Mike': return 'player2';
      case 'Colleen': return 'player3';
    }
  };
  
  // Helper function to get player name from key
  const getPlayerNameFromKey = (key: PlayerKey): PlayerName => {
    switch (key) {
      case 'player1': return 'Keith';
      case 'player2': return 'Mike';
      case 'player3': return 'Colleen';
    }
  };

  // ... (fetchAllScores and other functions remain the same, just update player mapping)
  const fetchAllScores = async () => {
    try {
      const { data: scoresData, error } = await supabase
        .from('daily_scores')
        .select(`
          *,
          players (
            name
          )
        `);
  
      if (error) throw error;
  
      const newScores: PlayerScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData(),
        player3: initialPlayerData()
      };
  
      scoresData?.forEach(score => {
        const playerName = score.players.name as PlayerName;
        const playerKey = getPlayerKeyFromName(playerName);
        
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

  // Update handleSubmit to handle the third player
  const handleSubmit = async () => {
    if (!currentEntry || !inputText) return;
  
    // Calculate scores first
    const { score, bonusPoints, gameScores } = calculateScores(inputText);
    
    try {
      // Get player name based on currentEntry
      const playerName = currentEntry === 'player1' ? 'Keith' : 
                        currentEntry === 'player2' ? 'Mike' : 'Colleen';
      
      console.log('Submitting scores:', { gameScores, totalScore: score, bonusPoints });
  
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('name', playerName)
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
  
      // Refresh scores after successful submission
      await fetchAllScores();
      setInputText('');
      setCurrentEntry(null);
  
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };

  // Update the UI to include the third player button and scores
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
          player3Score={scores.player3.total}
          player1Name={player1Name}
          player2Name={player2Name}
          player3Name={player3Name}
        />
  
        {/* Player Selection - Now with three buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentEntry('player1')}
            disabled={!canEditDate(currentDate, scores)}
            className={`p-2 rounded-md flex-1 ${
              currentEntry === 'player1' 
                ? 'bg-blue-500 text-white' 
                : canEditDate(currentDate, scores)
                  ? 'bg-gray-200 hover:bg-gray-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Keith's Entry
          </button>
          <button
            onClick={() => setCurrentEntry('player2')}
            disabled={!canEditDate(currentDate, scores)}
            className={`p-2 rounded-md flex-1 ${
              currentEntry === 'player2'
                ? 'bg-blue-500 text-white'
                : canEditDate(currentDate, scores)
                ? 'bg-gray-200 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Mike's Entry
          </button>
          <button
            onClick={() => setCurrentEntry('player3')}
            disabled={!canEditDate(currentDate, scores)}
            className={`p-2 rounded-md flex-1 ${
              currentEntry === 'player3'
                ? 'bg-blue-500 text-white'
                : canEditDate(currentDate, scores)
                ? 'bg-gray-200 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Colleen's Entry
          </button>
        </div>

        {/* Results Input */}
        <div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!canEditDate(currentDate, scores) || !currentEntry}
            className="w-full h-48 p-2 border rounded font-mono"
            placeholder={
              !canEditDate(currentDate, scores)
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
            disabled={!canEditDate(currentDate, scores) || !currentEntry || !inputText}
            className={`p-2 rounded ${
              canEditDate(currentDate, scores) && currentEntry && inputText
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

        {/* Scoreboard - Now with three columns */}
        <div className="grid grid-cols-3 gap-8">
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

          {/* Player 3 Scores */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Colleen</h3>
            <ScoreCard 
              title="Wordle Wins" 
              score={scores.player3.dailyScores[currentDate]?.wordle || 0} 
              icon={Target}
              bonusCount={scores.player3.dailyScores[currentDate]?.bonusPoints.wordleQuick ? 1 : 0}
            />
            <ScoreCard 
              title="Connections Wins" 
              score={scores.player3.dailyScores[currentDate]?.connections || 0} 
              icon={Puzzle}
              bonusCount={scores.player3.dailyScores[currentDate]?.bonusPoints.connectionsPerfect ? 1 : 0}
            />
            <ScoreCard 
              title="Strands Wins" 
              score={scores.player3.dailyScores[currentDate]?.strands || 0} 
              icon={Brain}
              bonusCount={scores.player3.dailyScores[currentDate]?.bonusPoints.strandsSpanagram ? 1 : 0}
            />
            <div className="text-sm text-gray-600 mt-2">
              Total Bonus Points: 
              <span className="ml-2">Wordle ({scores.player3.totalBonuses.wordle})</span>
              <span className="ml-2">Connections ({scores.player3.totalBonuses.connections})</span>
              <span className="ml-2">Strands ({scores.player3.totalBonuses.strands})</span>
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

            {/* Updated Connections Rules */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Connections</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-800">
                <li>1 point for completing the puzzle with errors</li>
                <li>2 points for completing the puzzle with no errors</li>
                <li>3 points if you get purple first and complete with no errors</li>
                <li>2 points if you get purple first but have errors</li>
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
  );
};

export default PuzzleScoreboard;