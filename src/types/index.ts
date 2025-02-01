// src/types/index.ts

export interface ArchivedScores {
  month: string;
  archive_data: PlayerScores;
  created_at: string;
}

export interface ArchiveRecord {
  id: number;
  month: string;
  archive_data: PlayerScores;
  created_at: string;
}

export interface BonusPoints {
    wordleQuick: boolean;
    connectionsPerfect: boolean;
    strandsSpanagram: boolean;
  }
  
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

  export interface DailyScore {
    date: string;
    wordle: number;
    connections: number;
    strands: number;
    total: number;
    bonusPoints: BonusPoints;
    finalized: boolean;
    archived?: boolean; // Add this field
  }
  
  export interface PlayerData {
    dailyScores: { [date: string]: DailyScore };
    total: number;
    totalBonuses: {
      wordle: number;
      connections: number;
      strands: number;
    };
  }
  
  export interface PlayerScores {
    player1: PlayerData;
    player2: PlayerData;
    player3: PlayerData;
    player4: PlayerData;
  }
  
  export interface PlayerTotals {
    [key: number]: {
      score: number;
      wordle: number;
      connections: number;
      strands: number;
    };
  }
  
  export type PlayerKey = 'player1' | 'player2' | 'player3' | 'player4';
  export type PlayerName = 'Keith' | 'Mike' | 'Colleen' | 'Toby';