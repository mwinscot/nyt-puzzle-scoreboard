'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Target, Puzzle, Brain, Star } from 'lucide-react';

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

const STORAGE_KEY = 'nyt-puzzle-scores';

const loadSavedData = () => {
  if (typeof window === 'undefined') return null;
  const savedData = localStorage.getItem(STORAGE_KEY);
  return savedData ? JSON.parse(savedData) : null;
};

const saveData = (data: PlayerScores) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const PuzzleScoreboard = () => {
  const [player1Name, setPlayer1Name] = useState<string>('Player 1');
  const [player2Name, setPlayer2Name] = useState<string>('Player 2');
  const [inputText, setInputText] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<'player1' | 'player2' | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const initialPlayerData = (): PlayerData => ({
    dailyScores: {},
    total: 0,
    totalBonuses: {
      wordle: 0,
      connections: 0,
      strands: 0
    }
  });

  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData()
  });

  // Load saved data on startup
  useEffect(() => {
    const savedData = loadSavedData();
    if (savedData) {
      setScores(savedData);
    }
  }, []);

  // Save data whenever scores change
  useEffect(() => {
    saveData(scores);
  }, [scores]);

  // Load/save player names
  useEffect(() => {
    const savedNames = localStorage.getItem('nyt-puzzle-player-names');
    if (savedNames) {
      const { player1, player2 } = JSON.parse(savedNames);
      setPlayer1Name(player1);
      setPlayer2Name(player2);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nyt-puzzle-player-names', JSON.stringify({
      player1: player1Name,
      player2: player2Name
    }));
  }, [player1Name, player2Name]);

  const calculateScores = (text: string): { score: number, bonusPoints: BonusPoints, gameScores: { wordle: number, connections: number, strands: number } } => {
    let totalScore = 0;
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
      
      if (scoreLine) {
        gameScores.wordle = 1;
        totalScore++; // Base point for completion
        
        const guessMatch = scoreLine.match(/(\d+)\/6/);
        if (guessMatch) {
          const guesses = parseInt(guessMatch[1]);
          if (guesses <= 3) {
            totalScore++; // Bonus point
            bonusPoints.wordleQuick = true;
          }
        }
      }
    }

    // Parse Connections
    if (text.includes('Connections')) {
      gameScores.connections = 1;
      totalScore++; // Base point
      
      const lines = text.split('\n');
      const gridLines = lines.filter((line: string) => 
        line.includes('🟪') || line.includes('🟩') || 
        line.includes('🟦') || line.includes('🟨')
      );
      
      if (gridLines.length === 4 && 
          gridLines[0].includes('🟪') && 
          gridLines[1].includes('🟩') && 
          gridLines[2].includes('🟦') && 
          gridLines[3].includes('🟨')) {
        totalScore++; // Bonus point
        bonusPoints.connectionsPerfect = true;
      }
    }

    // Parse Strands
    if (text.includes('Strands')) {
      gameScores.strands = 1;
      totalScore++; // Base point
      
      const lines = text.split('\n');
      const gridLines = lines.filter((line: string) => 
        line.includes('🔵') || line.includes('🟡')
      );
      
      if (gridLines.length > 0) {
        const firstRow = gridLines[0];
        const firstThreeSpots = firstRow.slice(0, 12);
        if (firstThreeSpots.includes('🟡')) {
          totalScore++; // Bonus point
          bonusPoints.strandsSpanagram = true;
        }
      }
    }

    return { score: totalScore, bonusPoints, gameScores };
  };

  const handleSubmit = () => {
    if (!currentEntry || !inputText) return;

    const { score, bonusPoints, gameScores } = calculateScores(inputText);
    
    setScores(prevScores => {
      const playerScores = prevScores[currentEntry];
      const existingDayScore = playerScores.dailyScores[currentDate];
      
      // Calculate bonus point changes
      const oldBonuses = existingDayScore?.bonusPoints || {
        wordleQuick: false,
        connectionsPerfect: false,
        strandsSpanagram: false
      };

      const bonusChanges = {
        wordle: (bonusPoints.wordleQuick ? 1 : 0) - (oldBonuses.wordleQuick ? 1 : 0),
        connections: (bonusPoints.connectionsPerfect ? 1 : 0) - (oldBonuses.connectionsPerfect ? 1 : 0),
        strands: (bonusPoints.strandsSpanagram ? 1 : 0) - (oldBonuses.strandsSpanagram ? 1 : 0)
      };
      
      // Create or update the daily score
      const updatedDailyScore: DailyScore = {
        date: currentDate,
        wordle: gameScores.wordle + (existingDayScore?.wordle || 0),
        connections: gameScores.connections + (existingDayScore?.connections || 0),
        strands: gameScores.strands + (existingDayScore?.strands || 0),
        total: score + (existingDayScore?.total || 0),
        bonusPoints: {
          wordleQuick: bonusPoints.wordleQuick || (existingDayScore?.bonusPoints.wordleQuick || false),
          connectionsPerfect: bonusPoints.connectionsPerfect || (existingDayScore?.bonusPoints.connectionsPerfect || false),
          strandsSpanagram: bonusPoints.strandsSpanagram || (existingDayScore?.bonusPoints.strandsSpanagram || false)
        },
        finalized: false
      };

      const newPlayerScores = {
        ...playerScores,
        dailyScores: {
          ...playerScores.dailyScores,
          [currentDate]: updatedDailyScore
        },
        totalBonuses: {
          wordle: playerScores.totalBonuses.wordle + bonusChanges.wordle,
          connections: playerScores.totalBonuses.connections + bonusChanges.connections,
          strands: playerScores.totalBonuses.strands + bonusChanges.strands
        }
      };

      // Recalculate total
      newPlayerScores.total = Object.values(newPlayerScores.dailyScores)
        .reduce((sum, day) => sum + day.total, 0);

      return {
        ...prevScores,
        [currentEntry]: newPlayerScores
      };
    });

    setInputText('');
    setCurrentEntry(null);
  };

  const finalizeDayScores = () => {
    setScores(prevScores => {
      const newScores = { ...prevScores };
      if (newScores.player1.dailyScores[currentDate]) {
        newScores.player1.dailyScores[currentDate].finalized = true;
      }
      if (newScores.player2.dailyScores[currentDate]) {
        newScores.player2.dailyScores[currentDate].finalized = true;
      }
      return newScores;
    });
  };

  const canEditDate = (date: string) => {
    const playerScores = scores.player1.dailyScores[date] || scores.player2.dailyScores[date];
    return date === currentDate && (!playerScores || !playerScores.finalized);
  };

  const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, icon: Icon, bonusCount }) => (
    <div className="flex items-center space-x-2 p-4 bg-gray-100 rounded-lg">
      <Icon className="w-6 h-6 text-blue-500" />
      <div className="flex-1">
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-xl font-bold">{score}</div>
      </div>
      {bonusCount !== undefined && bonusCount > 0 && (
        <div className="flex items-center text-yellow-500">
          <Star className="w-4 h-4" />
          <span className="ml-1">{bonusCount}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center">NYT Puzzle Competition Scoreboard</h2>
        <div className="mt-4 text-center">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="p-2 border rounded"
          />
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-6">
          {/* Player Names Input */}
          <div className="flex space-x-4">
            <input
              type="text"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              className="p-2 border rounded flex-1"
              placeholder="Player 1 Name"
            />
            <input
              type="text"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              className="p-2 border rounded flex-1"
              placeholder="Player 2 Name"
            />
          </div>

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
              {player1Name}'s Entry
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
              {player2Name}'s Entry
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
              <h3 className="text-xl font-bold">{player1Name}</h3>
              <ScoreCard 
                title="Total Score" 
                score={scores.player1.total} 
                icon={Trophy}
              />
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
              <h3 className="text-xl font-bold">{player2Name}</h3>
              <ScoreCard 
                title="Total Score" 
                score={scores.player2.total} 
                icon={Trophy}
              />
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
        </div>
      </div>
    </div>
  );
};

export default PuzzleScoreboard;