// src/components/ScoreCard.tsx
import React from 'react';
import { Star } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ElementType;
  bonusCount?: number;
  playerName?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ 
  title, 
  score, 
  icon: Icon, 
  bonusCount,
  playerName 
}) => (
  <div className="flex flex-col p-4 bg-gray-100 rounded-lg">
    {playerName && (
      <div className="text-lg font-semibold text-gray-900 mb-2">{playerName}</div>
    )}
    <div className="flex items-center space-x-2">
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
  </div>
);

export type { ScoreCardProps };