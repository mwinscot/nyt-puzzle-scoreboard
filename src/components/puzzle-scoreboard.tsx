import React, { useState, useEffect } from 'react';
import { supabase, publicSupabase } from '@/lib/supabase';
import { PlayerScores, PlayerData, PlayerKey, PlayerName, DailyBonusPoints, GameScores, ScoreCalculationResult } from '@/types';
import { AdminAuth } from './AdminAuth';
import ScoreCharts from '@/components/ScoreCharts';
import { getMonthDateRange } from '@/utils/dateUtils';
import { ScoreCard } from './ScoreCard';
import { ArchiveButton } from '@/components/ArchiveButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TotalScoreHeader } from './TotalScoreHeader';  // Fixed import

const getCurrentDatePST = (): string => {
 const pstNow = new Date().toLocaleString("en-US", {
   timeZone: "America/Los_Angeles",
   hour12: false,
 });
 return new Date(pstNow).toISOString().split('T')[0];
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
   case 'Toby': return 'player4';
   default: throw new Error('Invalid player name');
 }
};

interface LastUpdate {
  date: string;
  score: number;
  displayDate: Date;
}

interface Updates {
  [key: string]: LastUpdate;
}

const PuzzleScoreboard: React.FC = () => {
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
  const [placeholderText] = useState<string>('');
 
  const { start } = getMonthDateRange();
 
  const archiveDecember = async () => {
    if (!isAdmin) return;
    try {
      const { data: decemberScores, error } = await publicSupabase
        .from('daily_scores')
        .select('*')
        .gte('date', '2023-12-10')
        .lte('date', '2023-12-31');
 
      if (error) throw error;
 
      const totals: PlayerTotals = {
        1: { score: 0, wordle: 0, connections: 0, strands: 0 },
        2: { score: 0, wordle: 0, connections: 0, strands: 0 },
        3: { score: 0, wordle: 0, connections: 0, strands: 0 }
      };
 
      decemberScores?.forEach(score => {
        if (score.player_id in totals) {
          const player = totals[score.player_id];
          player.score += score.total;
          if (score.bonus_wordle) player.wordle++;
          if (score.bonus_connections) player.connections++;
          if (score.bonus_strands) player.strands++;
        }
      });
 
      const { error: archiveError } = await supabase
        .from('monthly_archives')
        .insert(Object.entries(totals).map(([player_id, stats]) => ({
          month: '2023-12',
          player_id: parseInt(player_id),
          total_score: stats.score,
          total_wordle_bonus: stats.wordle,
          total_connections_bonus: stats.connections,
          total_strands_bonus: stats.strands
        })));
 
      if (archiveError) throw archiveError;
    } catch (error) {
      console.error('Error archiving December:', error);
    }
  };
 
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
 
  // Make fetchAllScores a named function declaration instead of const
  async function fetchAllScores() {
    try {
      const { data: scoresData, error } = await publicSupabase
        .from('daily_scores')
        .select(`*, players (name)`)
        .gte('date', start)
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
  }

  const handleArchiveComplete = () => {
    fetchAllScores();
  };
 
  const handleSubmit = async () => {
    if (!currentEntry || !inputText || !isAdmin) return;
 
    try {
      const result = calculateScores(inputText);
      console.log('Calculated scores:', result);
      
      const playerName = currentEntry === 'player1' ? 'Keith' : 
                        currentEntry === 'player2' ? 'Mike' : 
                        currentEntry === 'player3' ? 'Colleen' : 'Toby';
 
      console.log('Submitting for player:', playerName, 'on date:', currentDate);

      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('name', playerName)
        .single();
 
      if (playerError) throw playerError;

      // Ensure each score component is a valid number
      const scoreData = {
        date: currentDate,
        player_id: player.id,
        wordle: Math.max(0, Number(result.gameScores.wordle)) || 0,
        connections: Math.max(0, Number(result.gameScores.connections)) || 0,
        strands: Math.max(0, Number(result.gameScores.strands)) || 0,
        total: Math.max(0, Number(result.score)) || 0,
        bonus_wordle: Boolean(result.bonusPoints.wordleQuick),
        bonus_connections: Boolean(result.bonusPoints.connectionsPerfect),
        bonus_strands: Boolean(result.bonusPoints.strandsSpanagram),
        finalized: false,
        archived: false
      };

      console.log('Submitting score data:', scoreData);
 
      const { data: submitResult, error: scoreError } = await supabase
        .from('daily_scores')
        .upsert(scoreData)
        .select();

      if (scoreError) throw scoreError;
      console.log('Submission result:', submitResult);
 
      await fetchAllScores();
      setInputText('');
      setCurrentEntry(null);
 
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };
 
  const calculateScores = (input: string): ScoreCalculationResult => {
    console.log('Starting score calculation');
    const gameScores: GameScores = {
      wordle: 0,
      connections: 0,
      strands: 0
    };
    const bonusPoints: DailyBonusPoints = {
      wordleQuick: false,
      connectionsPerfect: false,
      strandsSpanagram: false
    };

    // Split into sections
    const sections = input.split(/\n(?=(?:Connections|Wordle|Strands))/);
    
    // Process Wordle section
    const wordleSection = sections.find(s => s.trim().startsWith('Wordle'));
    if (wordleSection) {
      // Reset scores first
      gameScores.wordle = 0;
      bonusPoints.wordleQuick = false;

      // Extract guess lines with emoji squares
      const guessLines = wordleSection
        .split('\n')
        .map(l => l.trim())
        .filter(l => {
          const squares = [...l].filter(c => ['⬛', '⬜', '🟨', '🟩'].includes(c));
          return squares.length === 5;  // Must have exactly 5 squares
        });

      // Check if puzzle was solved (last line is all green)
      if (guessLines.length > 0) {
        const lastLine = guessLines[guessLines.length - 1];
        const solved = lastLine === '🟩🟩🟩🟩🟩';

        if (solved) {
          // Base point for completion
          gameScores.wordle = 1;
          console.log('Wordle completed in', guessLines.length, 'guesses');
          
          // Only give bonus for 3 or fewer guesses
          if (guessLines.length <= 3) {
            console.log('Wordle bonus awarded - completed in 3 or fewer');
            bonusPoints.wordleQuick = true;
            gameScores.wordle += 1;
          }
        }
      }
    }

    // Process Connections section
    const connectionsSection = sections.find(s => s.startsWith('Connections'));
    if (connectionsSection) {
      const lines = connectionsSection.split('\n').map(l => l.trim());
      const gameLines: string[] = [];
      let foundPuzzle = false;

      // Extract game lines
      for (const line of lines) {
        if (line.includes('Puzzle #')) {
          foundPuzzle = true;
          continue;
        }
        if (foundPuzzle) {
          // Only collect lines with exactly 4 colored squares
          const squares = [...line].filter(c => ['🟪','🟨','🟦','🟩'].includes(c));
          if (squares.length === 4) {
            gameLines.push(squares.join(''));
          }
        }
      }

      console.log('Extracted game lines:', gameLines);

      if (gameLines.length > 0) {
        // Check if the last line is all the same color (completed)
        const lastLine = gameLines[gameLines.length - 1];
        const completed = lastLine === '🟪🟪🟪🟪' || 
                         lastLine === '🟨🟨🟨🟨' || 
                         lastLine === '🟦🟦🟦🟦' || 
                         lastLine === '🟩🟩🟩🟩';

        console.log('Connections completion check:', {
          lastLine,
          completed,
          totalLines: gameLines.length
        });

        if (completed) {
          // Now check if all lines are perfect for higher scores
          const validPatterns = ['🟪🟪🟪🟪', '🟨🟨🟨🟨', '🟦🟦🟦🟦', '🟩🟩🟩🟩'];
          const lineChecks = gameLines.map((line, i) => {
            const isPerfect = validPatterns.includes(line);
            console.log(`Line ${i + 1} "${line}" matches a valid pattern? ${isPerfect}`);
            return isPerfect;
          });

          const allPerfect = lineChecks.every(Boolean);
          const purpleFirst = gameLines[0] === '🟪🟪🟪🟪';

          console.log('Scoring check:', {
            allPerfect,
            purpleFirst,
            firstLine: gameLines[0]
          });

          if (allPerfect) {
            if (purpleFirst) {
              gameScores.connections = 3;
              bonusPoints.connectionsPerfect = true;
              console.log('✅ Score 3: Perfect completion with purple first');
            } else {
              gameScores.connections = 2;
              console.log('✅ Score 2: Perfect completion but purple not first');
            }
          } else {
            gameScores.connections = 1;
            console.log('✅ Score 1: Completed with mistakes');
          }
        } else {
          gameScores.connections = 0;
          console.log('❌ Score 0: Not completed');
        }

        console.log('Final Connections score:', {
          score: gameScores.connections,
          perfect: bonusPoints.connectionsPerfect
        });
      }
    }

    // Process Strands section
    const strandsSection = sections.find(s => s.startsWith('Strands'));
    if (strandsSection) {
      const lines = strandsSection.split('\n')
        .map(l => l.trim())
        .filter(l => l.includes('🔵') || l.includes('🟡'));

      if (lines.length > 0) {
        gameScores.strands = 1;
        // Check specifically the first line for yellow in first 3 positions
        const firstLine = lines[0];
        const firstThreeEmojis = [...firstLine].slice(0, 3);
        const yellowIndex = [...firstLine].findIndex(emoji => emoji === '🟡');
        const foundSpanagram = yellowIndex >= 0 && yellowIndex < 3;
        
        console.log('Strands check:', {
          firstLine,
          firstThreeEmojis,
          yellowIndex,
          foundSpanagram
        });
        
        if (foundSpanagram) {
          gameScores.strands += 1;
          bonusPoints.strandsSpanagram = true;
          console.log('✅ Strands bonus: Yellow in first 3 positions (index:', yellowIndex, ')');
        } else {
          console.log('❌ No Strands bonus: Yellow not in first 3 positions');
        }
      }
    }

    const totalScore = gameScores.wordle + gameScores.connections + gameScores.strands;
    console.log('Final calculated scores:', {
      total: totalScore,
      gameScores,
      bonusPoints
    });
    
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

  const handlePlayerSelect = (player: PlayerKey) => {
    setCurrentEntry(player);
  };

  const getLastUpdates = (): Updates => {
    const updates: Updates = {
      Keith: { date: '', score: 0, displayDate: new Date() },
      Mike: { date: '', score: 0, displayDate: new Date() },
      Colleen: { date: '', score: 0, displayDate: new Date() },
      Toby: { date: '', score: 0, displayDate: new Date() }
    };

    Object.entries(scores).forEach(([playerKey, playerData]) => {
      const dates = Object.keys(playerData.dailyScores).sort().reverse();
      if (dates.length > 0) {
        const lastDate = dates[0];
        const playerName = playerKey === 'player1' ? 'Keith' 
          : playerKey === 'player2' ? 'Mike'
          : playerKey === 'player3' ? 'Colleen'
          : 'Toby';
        
        updates[playerName] = {
          date: lastDate,
          score: playerData.dailyScores[lastDate].total,
          displayDate: new Date(lastDate + 'T00:00:00-08:00')
        };
      }
    });

    return updates;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!isAdmin && <AdminAuth onLogin={() => setIsAdmin(true)} />}
      <div className="p-6">
        {isAdmin && (
          <>
            <div className="mb-4 flex justify-end">
              <ArchiveButton onArchiveComplete={fetchAllScores} />
            </div>

            {/* Last Updates Section */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4 shadow">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Last Updates</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(getLastUpdates()).map(([name, data]) => (
                  <div key={name} className="text-sm">
                    <div className="font-medium text-gray-900">{name}</div>
                    {data.date ? (
                      <>
                        <div className="text-gray-600">
                          {data.displayDate.toLocaleDateString('en-US', {
                            timeZone: 'America/Los_Angeles',
                            month: 'numeric',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-gray-800">Score: {data.score}</div>
                      </>
                    ) : (
                      <div className="text-gray-400">No entries yet</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Controls */}
            <div className="mb-4 space-y-2">
              {/* Date Selector */}
              <div className="flex gap-2 items-center mb-4">
                <label className="text-gray-700 font-medium">Date:</label>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="p-2 border rounded"
                />
              </div>

              {/* Player Selection */}
              <div className="flex gap-2">
                {['player1', 'player2', 'player3', 'player4'].map((player) => (
                  <button
                    key={player}
                    onClick={() => handlePlayerSelect(player as PlayerKey)}
                    className={`px-4 py-2 rounded ${
                      currentEntry === player ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {player === 'player1' ? 'Keith' : 
                     player === 'player2' ? 'Mike' : 
                     player === 'player3' ? 'Colleen' : 'Toby'}
                  </button>
                ))}
              </div>

              {/* Score Input */}
              <div className="flex gap-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 p-2 border rounded min-h-[100px] font-mono"
                  placeholder={placeholderText}
                  disabled={!currentEntry}
                />
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                  disabled={!currentEntry || !inputText}
                >
                  Submit
                </button>
              </div>
            </div>
          </>
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

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <ScoreCard playerName={player1Name} score={scores.player1} />
          <ScoreCard playerName={player2Name} score={scores.player2} />
          <ScoreCard playerName={player3Name} score={scores.player3} />
          <ScoreCard playerName={player4Name} score={scores.player4} />
        </div>
        
        {/* Score Charts */}
        <div className="mt-6">
          <ScoreCharts scores={scores} />
        </div>

        {/* Rules Section */}
        <Card className="mt-8 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Game Rules & Scoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Wordle</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-800">
                <li>1 point for completing the puzzle</li>
                <li>1 bonus point if finished within 3 lines or less</li>
              </ul>
            </div>

            <div className="my-4 border-t border-gray-200" />

            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Connections</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-800">
                <li>1 point for completing the puzzle with errors</li>
                <li>2 points for completing the puzzle with no errors</li>
                <li>3 points if you get purple first and complete with no errors</li>
              </ul>
            </div>

            <div className="my-4 border-t border-gray-200" />

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
