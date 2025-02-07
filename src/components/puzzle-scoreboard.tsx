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
  const [placeholderText, setPlaceholderText] = useState<string>('');
 
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
    fetchAllScores(); // Now fetchAllScores is in scope
  };
 
  const handleSubmit = async () => {
    if (!currentEntry || !inputText || !isAdmin) return;
 
    try {
      const { score, bonusPoints, gameScores } = calculateScores(inputText);
      console.log('Calculated scores:', { score, bonusPoints, gameScores });
      
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

      const scoreData = {
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
      };

      console.log('Submitting score data:', scoreData);
 
      const { data: result, error: scoreError } = await supabase
        .from('daily_scores')
        .upsert(scoreData)
        .select();

      if (scoreError) throw scoreError;
      console.log('Submission result:', result);
 
      await fetchAllScores();
      setInputText('');
      setCurrentEntry(null);
 
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };
 
  const calculateScores = (input: string): ScoreCalculationResult => {
    console.log('Raw input:', input);
    
    let totalScore = 0;
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

    // Split into sections and clean up the input
    const sections = input.split(/\n(?=[A-Za-z])/);
    console.log('Sections:', sections);

    // Parse Wordle (1 point for completion)
    const wordleSection = sections.find(s => s.startsWith('Wordle'));
    if (wordleSection) {
      const lines = wordleSection.split('\n');
      const solutionLine = lines.findIndex(line => line.includes('🟩🟩🟩🟩🟩'));
      
      if (solutionLine !== -1) {
        gameScores.wordle = 1; // Base point for completing
        console.log('Added base Wordle point');

        if (solutionLine <= 2) { // Index 2 = line 3
          bonusPoints.wordleQuick = true;
          console.log('Added Wordle bonus point');
        }
      }
    }

    // Parse Connections
    const connectionsSection = sections.find(s => s.startsWith('Connections'));
    if (connectionsSection) {
      const lines = connectionsSection.split('\n');
      const moves = lines.filter(line => /[🟪🟩🟨🟦]{4}/.test(line));
      const purpleIndex = moves.findIndex(line => line.includes('🟪🟪🟪🟪'));
      const hasErrors = moves.some(line => line.includes('🟨'));

      if (moves.length > 0) { // If there are any moves
        if (!hasErrors) {
          if (purpleIndex === 0) {
            gameScores.connections = 3; // Purple first and perfect
            console.log('Added 3 points for perfect Connections with purple first');
          } else {
            gameScores.connections = 2; // Perfect but purple not first
            console.log('Added 2 points for perfect Connections');
          }
        } else {
          if (purpleIndex === 0) {
            gameScores.connections = 2; // Purple first but with errors
            console.log('Added 2 points for Connections with purple first but errors');
          } else {
            gameScores.connections = 1; // Completed with errors
            console.log('Added 1 point for completing Connections with errors');
          }
        }
      }
    }

    // Parse Strands
    const strandsSection = sections.find(s => s.startsWith('Strands'));
    if (strandsSection) {
      const lines = strandsSection.split('\n').slice(2); // Skip title and puzzle name
      const blueCircles = lines.map(line => (line.match(/🔵/g) || []).length);
      
      if (blueCircles.some(count => count > 0)) {
        gameScores.strands = 1;
        console.log('Added base Strands point');
        
        // Check for spanagram (3+ blue circles) in first three moves
        const spanagramIndex = blueCircles.findIndex(count => count >= 3);
        if (spanagramIndex !== -1 && spanagramIndex < 3) {
          bonusPoints.strandsSpanagram = true;
          console.log('Added Strands bonus point');
        }
      }
    }

    // Calculate total score
    totalScore = gameScores.wordle + gameScores.connections + gameScores.strands +
                (bonusPoints.wordleQuick ? 1 : 0) +
                (bonusPoints.strandsSpanagram ? 1 : 0);

    const result = { score: totalScore, bonusPoints, gameScores };
    
    console.log('Score breakdown:', {
      wordle: `${gameScores.wordle} + ${bonusPoints.wordleQuick ? '1' : '0'} bonus`,
      connections: gameScores.connections,
      strands: `${gameScores.strands} + ${bonusPoints.strandsSpanagram ? '1' : '0'} bonus`,
      total: totalScore
    });

    return result;
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

  // Fix the return statement JSX structure
  return (
    <div className="w-full max-w-4xl mx-auto">
      {!isAdmin && <AdminAuth onLogin={() => setIsAdmin(true)} />}
      <div className="p-6">
        {/* Admin Controls */}
        {isAdmin && (
          <>
            <div className="mb-4 flex justify-end">
              <ArchiveButton onArchiveComplete={fetchAllScores} />
            </div>

            {/* Add Last Updates Section */}
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
            <CardTitle className="text-xl font-semibold text-gray-900">Game Rules & Scoring</CardTitle>
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
                <li>2 points if you get purple first but have errors</li>
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