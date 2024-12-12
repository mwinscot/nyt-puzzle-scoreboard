import React, { useState, useEffect } from 'react';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { AuthChangeEvent } from '@supabase/supabase-js';
import { Trophy, Target, Puzzle, Brain, Star } from 'lucide-react';
import { supabase, publicSupabase, Database } from '@/lib/supabase';
import { PlayerScores, PlayerData, PlayerKey, PlayerName, DailyScore, BonusPoints } from '@/types';
import { AdminAuth } from './AdminAuth';
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

interface ScoreRecord {
  id: number;
  date: string;
  player_id: number;
  wordle: number;
  connections: number;
  strands: number;
  total: number;
  bonus_wordle: boolean;
  bonus_connections: boolean;
  bonus_strands: boolean;
  finalized: boolean;
  created_at?: string;
  players: {
    name: string;
  };
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

// Helper function to get the current date in Pacific Time
const getCurrentDatePT = (): string => {
  const now = new Date();
  // Convert to PT (America/Los_Angeles timezone)
  const ptTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return ptTime.toISOString().split('T')[0];
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [player1Name, setPlayer1Name] = useState<string>('Keith');
  const [player2Name, setPlayer2Name] = useState<string>('Mike');
  const [player3Name, setPlayer3Name] = useState<string>('Colleen');
  const [inputText, setInputText] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<PlayerKey | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData()
  });

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    
    checkAuth();

  // Update the auth state change handler
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setIsAdmin(!!session);
  });

  fetchAllScores();

  return () => {
    subscription.unsubscribe();
  };
}, []);

const calculateScores = (text: string): { 
  score: number, 
  bonusPoints: BonusPoints, 
  gameScores: { 
    wordle: number, 
    connections: number, 
    strands: number 
  } 
} => {
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

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  // Define types for game sections
  type GameType = 'connections' | 'strands' | 'wordle';
  type Section = {
    startIndex: number;
    endIndex: number;
  };
  type Sections = {
    [K in GameType]: Section;
  };

  // Find sections
  const sections: Sections = {
    connections: {
      startIndex: lines.findIndex(line => line.includes('Connections')),
      endIndex: -1
    },
    strands: {
      startIndex: lines.findIndex(line => line.includes('Strands')),
      endIndex: -1
    },
    wordle: {
      startIndex: lines.findIndex(line => line.includes('Wordle')),
      endIndex: -1
    }
  };

  // Set end indices
  (Object.keys(sections) as GameType[]).forEach((game) => {
    const currentStart = sections[game].startIndex;
    if (currentStart !== -1) {
      const nextStarts = Object.values(sections)
        .map(section => section.startIndex)
        .filter(index => index > currentStart);
      sections[game].endIndex = nextStarts.length > 0 ? Math.min(...nextStarts) : lines.length;
    }
  });

  // Parse Connections
  if (sections.connections.startIndex !== -1) {
    const connectionLines = lines
      .slice(sections.connections.startIndex, sections.connections.endIndex)
      .filter(line => ['🟨', '🟪', '🟦', '🟩'].some(emoji => line.includes(emoji)));
    
    if (connectionLines.length > 0) {
      // Check if puzzle was completed (has all colors)
      const hasAllColors = ['🟨', '🟪', '🟦', '🟩'].every(color => 
        connectionLines.some(line => line.includes(color))
      );
      
      if (!hasAllColors) {
        gameScores.connections = 0; // Incomplete puzzle
      } else {
        // Check for errors by looking at duplicate attempts
        const seenColors = new Set();
        const hasErrors = connectionLines.some((line) => {
          const colors = ['🟨', '🟪', '🟦', '🟩'].filter(color => line.includes(color));
          // Check if we've seen this color before
          const isDuplicate = colors.some(color => seenColors.has(color));
          // Add colors to seen set
          colors.forEach(color => seenColors.add(color));
          return isDuplicate;
        });
        
        // Check if purple (🟪) was found first
        const purpleIndex = connectionLines.findIndex(line => line.includes('🟪'));
        const isPurpleFirst = purpleIndex === 0;
        
        if (isPurpleFirst && !hasErrors) {
          gameScores.connections = 3;
          bonusPoints.connectionsPerfect = true;
        } else if (isPurpleFirst && hasErrors) {
          gameScores.connections = 2;
        } else if (!hasErrors) {
          gameScores.connections = 2;
        } else if (hasErrors) {
          gameScores.connections = 1;
        }

        // If there are too many attempts at multiple colors, score should be 0
        type ColorCount = { [key: string]: number };
        const colorCounts: ColorCount = connectionLines.reduce((acc: ColorCount, line) => {
          ['🟨', '🟪', '🟦', '🟩'].forEach(color => {
            if (line.includes(color)) {
              acc[color] = (acc[color] || 0) + 1;
            }
          });
          return acc;
        }, {});

        if (Object.values(colorCounts).some((count: number) => count > 2)) {
          gameScores.connections = 0;
        }
      }
    }
  }

  // Parse Strands
  if (sections.strands.startIndex !== -1) {
    const strandLines = lines
      .slice(sections.strands.startIndex, sections.strands.endIndex)
      .filter(line => ['🔵', '🟡'].some(emoji => line.includes(emoji)));
    
    if (strandLines.length > 0) {
      gameScores.strands = 1;  // Base point for completion
      
      // Check first line for spanagram
      if (strandLines[0].includes('🟡')) {
        gameScores.strands++;
        bonusPoints.strandsSpanagram = true;
      }
    }
  }

  // Parse Wordle
  if (sections.wordle.startIndex !== -1) {
    const wordleLines = lines
      .slice(sections.wordle.startIndex, sections.wordle.endIndex)
      .filter(line => line.includes('/6'));
    
    if (wordleLines.length > 0 && !wordleLines[0].includes('X/6')) {
      gameScores.wordle = 1;  // Base point for completion
      
      const guessMatch = wordleLines[0].match(/(\d+)\/6/);
      if (guessMatch) {
        const guesses = parseInt(guessMatch[1]);
        if (guesses <= 3) {
          gameScores.wordle++;
          bonusPoints.wordleQuick = true;
        }
      }
    }
  }

  const totalScore = gameScores.wordle + gameScores.connections + gameScores.strands;
  
  return { score: totalScore, bonusPoints, gameScores };
};

  const CONTEST_START_DATE = '2024-12-10'; // Today's date

  const fetchAllScores = async () => {
    try {
      const { data: scoresData, error } = await publicSupabase
        .from('daily_scores')
        .select(`
          *,
          players (
            name
          )
        `)
        .gte('date', CONTEST_START_DATE);

      if (error) throw error;

      const newScores: PlayerScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData(),
        player3: initialPlayerData()
      };

      scoresData?.forEach((score: ScoreRecord) => {
        const playerName = score.players.name as PlayerName;
        const playerKey = getPlayerKeyFromName(playerName);
        
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

  const getPlayerKeyFromName = (name: PlayerName): PlayerKey => {
    switch (name) {
      case 'Keith': return 'player1';
      case 'Mike': return 'player2';
      case 'Colleen': return 'player3';
    }
  };

  const canEditDate = (date: string, scores: PlayerScores): boolean => {
    if (!isAdmin) return false;
    
    const playerScores = [
      scores.player1.dailyScores[date],
      scores.player2.dailyScores[date],
      scores.player3.dailyScores[date]
    ];
    return date === new Date().toISOString().split('T')[0] && 
           (!playerScores.some(score => score?.finalized));
  };

  const handleSubmit = async () => {
    if (!currentEntry || !inputText || !isAdmin) return;

    try {
      const { score, bonusPoints, gameScores } = calculateScores(inputText);
      
      const playerName = currentEntry === 'player1' ? 'Keith' : 
                        currentEntry === 'player2' ? 'Mike' : 'Colleen';

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

      await fetchAllScores();
      setInputText('');
      setCurrentEntry(null);

    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };

  const finalizeDayScores = async () => {
    if (!isAdmin) return;
    
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

  const renderScoreboard = () => (
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

        {isAdmin && (
          <>
            {/* Player Selection */}
            <div className="flex space-x-4 mb-4">
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
            <div className="mb-4">
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
            <div className="flex justify-end space-x-4 mb-4">
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
            <div className="flex justify-center mb-8">
              <button
                onClick={finalizeDayScores}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Finalize Day's Scores
              </button>
            </div>
          </>
        )}

        {/* Daily Scores Grid */}
        <div className="grid grid-cols-3 gap-8 mb-8">
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
            <div className="text-sm text-gray-600">
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
            <div className="text-sm text-gray-600">
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
            <div className="text-sm text-gray-600">
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

            {/* Connections Rules */}
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
                <li>1 bonus point if spanagram found within first three moves</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="w-full max-w-4xl mx-auto">
      {!isAdmin && <AdminAuth onLogin={() => setIsAdmin(true)} />}
      {renderScoreboard()}
    </div>
  );
};

export default PuzzleScoreboard;