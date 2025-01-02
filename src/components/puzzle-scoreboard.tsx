import React, { useState, useEffect } from 'react';
import { Trophy, Target, Puzzle, Brain, Star } from 'lucide-react';
import { supabase, publicSupabase } from '@/lib/supabase';
import { PlayerScores, PlayerData, PlayerKey, PlayerName, BonusPoints } from '@/types';
import { AdminAuth } from './AdminAuth';
import ScoreCharts from '@/components/ScoreCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/ScoreCard';
import { TotalScoreHeader } from '@/components/TotalScoreHeader';


const getCurrentDatePST = (): string => {
  const date = new Date();
  const pstDate = new Date(date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles'
  }));
  return pstDate.getFullYear() + '-' + 
    String(pstDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(pstDate.getDate()).padStart(2, '0');
};

// Helper to convert any date to PST
const convertToPST = (date: string): string => {
  const inputDate = new Date(date);
  const pstDate = new Date(inputDate.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles'
  }));
  return pstDate.getFullYear() + '-' + 
    String(pstDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(pstDate.getDate()).padStart(2, '0');
};


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

interface PlayerTotals {
 [key: number]: {
   score: number;
   wordle: number;
   connections: number;
   strands: number;
 }
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

const getPlayerKeyFromName = (name: PlayerName): PlayerKey => {
 switch (name) {
   case 'Keith': return 'player1';
   case 'Mike': return 'player2';
   case 'Colleen': return 'player3';
   default: throw new Error('Invalid player name');
 }
};

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
    
    if (connectionLines.length === 0) {
      gameScores.connections = 0;
    } else {
      // First check if puzzle is complete by checking last line has single color
      const lastLine = connectionLines[connectionLines.length - 1];
      const colorsInLastLine = ['🟨', '🟪', '🟦', '🟩'].filter(color => 
        lastLine.includes(color)
      ).length;

      // If last line has multiple colors, puzzle is incomplete
      if (colorsInLastLine !== 1) {
        gameScores.connections = 0;
      } else {
        // Check if purple was found first
        const firstLine = connectionLines[0];
        const isPurpleFirst = (firstLine.match(/🟪/g) || []).length === 4;

        // Look for errors (multiple colors) in any lines except the last
        const hasErrors = connectionLines.slice(0, -1).some(line => {
          const colorsInLine = ['🟨', '🟪', '🟦', '🟩'].filter(color => 
            line.includes(color)
          ).length;
          return colorsInLine > 1;
        });

        // Apply scoring rules:
        // - Purple first, no errors: 3 points
        // - Purple first with errors: 2 points
        // - Not purple first, no errors: 2 points
        // - Not purple first, with errors: 1 point
        if (isPurpleFirst) {
          gameScores.connections = hasErrors ? 2 : 3;
        } else {
          gameScores.connections = hasErrors ? 1 : 2;
        }
      }
    }
  }

  // Parse Strands
  if (sections.strands.startIndex !== -1) {
    const strandLines = lines
      .slice(sections.strands.startIndex, sections.strands.endIndex)
      .filter(line => line.includes('🔵') || line.includes('🟡') || line.includes('💡'));
    
    if (strandLines.length > 0) {
      // Check if any hints (💡) were used
      const hintsUsed = strandLines.some(line => line.includes('💡'));
      
      if (!hintsUsed) {
        gameScores.strands = 1;  // Base point for completion without hints
        
        // Get all moves into a single array
        const allMoves: string[] = [];
        for (const line of strandLines) {
          const moves = [...line].filter(char => char === '🔵' || char === '🟡');
          allMoves.push(...moves);
        }

        // Find position of yellow circle (1-based index)
        const yellowPosition = allMoves.findIndex(move => move === '🟡') + 1;
        if (yellowPosition > 0 && yellowPosition <= 3) {
          gameScores.strands++;
          bonusPoints.strandsSpanagram = true;
        }
      } else {
        gameScores.strands = 0; // No points if hints were used
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
        .order('date', { ascending: true });

      if (error) throw error;
      console.log('Raw scores before processing:', scoresData);

      const newScores: PlayerScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData(),
        player3: initialPlayerData()
      };

      scoresData?.forEach((score: ScoreRecord) => {
        console.log('Processing score record:', score);
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

      console.log('Processed scores:', newScores);
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
  
    const today = getCurrentDatePST();
    const yesterday = new Date(new Date(today).setDate(new Date(today).getDate() - 1))
      .toISOString().split('T')[0];
    
    return (date === today || date === yesterday) && 
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
 
  // Removed duplicate calculateScores function
  
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
 
  return (
    <div className="w-full max-w-4xl mx-auto">
      {!isAdmin && <AdminAuth onLogin={() => setIsAdmin(true)} />}
      <div className="p-6">
        <TotalScoreHeader
          player1Score={Object.values(scores.player1.dailyScores).reduce((acc, score) => acc + score.total, 0)}
          player2Score={Object.values(scores.player2.dailyScores).reduce((acc, score) => acc + score.total, 0)}
          player3Score={Object.values(scores.player3.dailyScores).reduce((acc, score) => acc + score.total, 0)}
          player1Name={player1Name}
          player2Name={player2Name}
          player3Name={player3Name}
        />

        {/* Add Date Selection */}
        {isAdmin && (
          <div className="mb-4">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="p-2 border rounded"
              max={getCurrentDatePST()}
            />
          </div>
        )}

        {/* Archive button */}
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
        <ScoreCharts scores={scores} />

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
 };
 
 export default PuzzleScoreboard;