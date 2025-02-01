// src/types/index.ts

export interface DailyBonusPoints {
  wordleQuick: boolean;
  connectionsPerfect: boolean;
  strandsSpanagram: boolean;
}

export interface BonusPoints {
  wordle: number;
  connections: number;
  strands: number;
}

export interface DailyScore {
  date: string;
  wordle: number;
  connections: number;
  strands: number;
  total: number;
  bonusPoints: DailyBonusPoints;
  finalized: boolean;
}

export interface PlayerData {
  dailyScores: {
    [key: string]: DailyScore;
  };
  total: number;
  totalBonuses: BonusPoints;
}

export interface PlayerScores {
  player1: PlayerData;
  player2: PlayerData;
  player3: PlayerData;
  player4: PlayerData;
}

export type PlayerName = 'Keith' | 'Mike' | 'Colleen' | 'Toby';
export type PlayerKey = 'player1' | 'player2' | 'player3' | 'player4';

export interface ScoreRecord {
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
  archived?: boolean;
  created_at?: string;
  players: {
    name: string;
  };
}