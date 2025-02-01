import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { supabase, publicSupabase } from '@/lib/supabase';
import { PlayerScores, PlayerData, PlayerKey, PlayerName, ScoreRecord } from '@/types';
import { AdminAuth } from './AdminAuth';
import ScoreCharts from '@/components/ScoreCharts';
import { Card } from '@/components/ui/card';
import { ScoreCard } from './ScoreCard';
import { ArchiveButton } from './ArchiveButton';
import { TotalScoreHeader } from '@/components/TotalScoreHeader';

// Helper function to get current date in PST
const getCurrentDatePST = (): string => {
  const pstNow = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
  });
  return new Date(pstNow).toISOString().split('T')[0];
};

// Initialize player data
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
    case 'Toby': return 'player4';
    default: throw new Error('Invalid player name');
  }
};

const PuzzleScoreboard: React.FC = () => {
  // State declarations
  const [isAdmin, setIsAdmin] = useState(false);
  const [player1Name] = useState<string>('Keith');
  const [player2Name] = useState<string>('Mike');
  const [player3Name] = useState<string>('Colleen');
  const [player4Name] = useState<string>('Toby');
  const [inputText, setInputText] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<PlayerKey | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(getCurrentDatePST());
  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData(),
    player4: initialPlayerData()
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAdmin(!!session);
    });

    fetchAllScores();
    return () => subscription.unsubscribe();
  }, []);

  const fetchAllScores = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(1);
      
      const { data: scoresData, error } = await publicSupabase
        .from('daily_scores')
        .select(`*, players (name)`)
        .gte('date', startDate.toISOString().split('T')[0])
        .eq('archived', false);

      if (error) throw error;

      const newScores: PlayerScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData(),
        player3: initialPlayerData(),
        player4: initialPlayerData()
      };

      scoresData?.forEach((score: ScoreRecord) => {
        const playerKey = getPlayerKeyFromName(score.players.name as PlayerName);
        
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

  const handleSubmit = async () => {
    if (!currentEntry || !inputText || !isAdmin) return;

    try {
      const { score, bonusPoints, gameScores } = calculateScores(inputText);
      
      const playerName = currentEntry === 'player1' ? 'Keith' : 
                      currentEntry === 'player2' ? 'Mike' : 
                      currentEntry === 'player3' ? 'Colleen' : 'Toby';

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

  const calculateScores = (text: string) => {
    const bonusPoints = {
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

    // Find sections for each game
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
  
    // Parse Connections
    if (sections.connections.startIndex !== -1) {
      const connectionLines = lines
        .slice(sections.connections.startIndex, sections.connections.endIndex)
        .filter(line => ['🟨', '🟪', '🟦', '🟩'].some(emoji => line.includes(emoji)));
      
      if (connectionLines.length > 0) {
        const lastLine = connectionLines[connectionLines.length - 1];
        const colorsInLastLine = ['🟨', '🟪', '🟦', '🟩'].filter(color => 
          lastLine.includes(color)
        ).length;
  
        if (colorsInLastLine === 1) {  // Puzzle completed
          const firstLine = connectionLines[0];
          const isPurpleFirst = (firstLine.match(/🟪/g) || []).length === 4;
  
          const hasErrors = connectionLines.slice(0, -1).some(line => {
            const colorsInLine = ['🟨', '🟪', '🟦', '🟩'].filter(color => 
              line.includes(color)
            ).length;
            return colorsInLine > 1;
          });
  
          if (isPurpleFirst) {
            gameScores.connections = hasErrors ? 2 : 3;
            if (!hasErrors) bonusPoints.connectionsPerfect = true;
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
        const hintsUsed = strandLines.some(line => line.includes('💡'));
        
        if (!hintsUsed) {
          gameScores.strands = 1;  // Base point for completion without hints
          
          const allMoves: string[] = [];
          for (const line of strandLines) {
            const moves = [...line].filter(char => char === '🔵' || char === '🟡');
            allMoves.push(...moves);
          }
  
          const yellowPosition = allMoves.findIndex(move => move === '🟡') + 1;
          if (yellowPosition > 0 && yellowPosition <= 3) {
            gameScores.strands++;
            bonusPoints.strandsSpanagram = true;
          }
        }
      }
    }
  
    const totalScore = gameScores.wordle + gameScores.connections + gameScores.strands;
    
    return { score: totalScore, bonusPoints, gameScores };
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

  const handleArchiveComplete = () => {
    fetchAllScores();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!isAdmin && <AdminAuth onLogin={() => setIsAdmin(true)} />}
      <div className="p-6">
        {/* Admin Controls */}
        {isAdmin && (
          <div className="mb-4 flex justify-between items-center">
            <ArchiveButton onArchiveComplete={handleArchiveComplete} />
            <Link 
              href={`/archives/${new Date().toISOString().slice(0, 7)}`}
              className="text-blue-500 hover:text-blue-600 flex items-center gap-2"
            >
              View Previous Month
            </Link>
          </div>
        )}

        {/* Header Scoreboard */}
        <div className="mb-8">
          <TotalScoreHeader
            player1Score={scores.player1.total}
            player2Score={scores.player2.total}
            player3Score={scores.player3.total}
            player4Score={scores.player4.total}
            player1Name={player1Name}
            player2Name={player2Name}
            player3Name={player3Name}
            player4Name={player4Name}
          />
        </div>

        {/* Score Input Section */}
        {isAdmin && (
          <div className="mb-6">
            {/* Date Picker */}
            <div className="mb-4">
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="p-2 border rounded"
                max={getCurrentDatePST()}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={() => setCurrentEntry('player1')}
                className={`p-2 rounded ${
                  currentEntry === 'player1' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {player1Name}
              </button>
              <button
                onClick={() => setCurrentEntry('player2')}
                className={`p-2 rounded ${
                  currentEntry === 'player2' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {player2Name}
              </button>
              <button
                onClick={() => setCurrentEntry('player3')}
                className={`p-2 rounded ${
                  currentEntry === 'player3' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {player3Name}
              </button>
              <button
                onClick={() => setCurrentEntry('player4')}
                className={`p-2 rounded ${
                  currentEntry === 'player4' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {player4Name}
              </button>
            </div>
            {currentEntry && (
  <div className="mt-4">
    <textarea
      value={inputText}
      onChange={(e) => setInputText(e.target.value)}
      className="w-full p-2 border rounded min-h-[150px] font-mono"
      placeholder="Paste scores here..."
    />
    <button
      onClick={handleSubmit}
      className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Submit Score
    </button>
  </div>
)}
          </div>
        )}

        {/* Scoreboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <ScoreCard 
            title="Total Score"
            score={scores.player1.total}
            icon={Trophy}
            bonusCount={
              scores.player1.totalBonuses.wordle + 
              scores.player1.totalBonuses.connections + 
              scores.player1.totalBonuses.strands
            }
            playerName={player1Name}
          />
          <ScoreCard 
            title="Total Score"
            score={scores.player2.total}
            icon={Trophy}
            bonusCount={
              scores.player2.totalBonuses.wordle + 
              scores.player2.totalBonuses.connections + 
              scores.player2.totalBonuses.strands
            }
            playerName={player2Name}
          />
          <ScoreCard 
            title="Total Score"
            score={scores.player3.total}
            icon={Trophy}
            bonusCount={
              scores.player3.totalBonuses.wordle + 
              scores.player3.totalBonuses.connections + 
              scores.player3.totalBonuses.strands
            }
            playerName={player3Name}
          />
          <ScoreCard 
            title="Total Score"
            score={scores.player4.total}
            icon={Trophy}
            bonusCount={
              scores.player4.totalBonuses.wordle + 
              scores.player4.totalBonuses.connections + 
              scores.player4.totalBonuses.strands
            }
            playerName={player4Name}
          />
        </div>

        {/* Finalize Scores Button */}
        {isAdmin && (
          <div className="mb-6">
            <button
              onClick={finalizeDayScores}
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Finalize Today's Scores
            </button>
          </div>
        )}
        
        {/* Score Charts */}
        <div className="mt-6">
          <ScoreCharts scores={scores} />
        </div>
      </div>
    </div>
  );
};

export default PuzzleScoreboard;