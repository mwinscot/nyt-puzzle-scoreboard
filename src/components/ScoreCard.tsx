// src/components/ScoreCard.tsx
import React from 'react';
import { Star } from 'lucide-react';
import { PlayerData } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ScoreCardProps {
  playerName: string;
  score: PlayerData;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ playerName, score }) => (
  <Card>
    <CardHeader>
      <CardTitle>{playerName}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total Score:</span>
          <span className="font-bold">{score.total}</span>
        </div>
        <div className="flex justify-between">
          <span>Bonus Points:</span>
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-500 mr-1" />
            <span>{score.totalBonuses.wordle + score.totalBonuses.connections + score.totalBonuses.strands}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export type { ScoreCardProps };