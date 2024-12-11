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
}): JSX.Element => {
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

const ScoreCard: React.FC<ScoreCardProps> = ({ 
  title, 
  score, 
  icon: Icon, 
  bonusCount 
}): JSX.Element => (
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

const PuzzleScoreboard: React.FC = (): JSX.Element => {
  return (
    <div>
      {/* Your JSX content here */}
    </div>
  );
};

export default PuzzleScoreboard;