// src/types/index.ts

export interface BonusPoints {
    wordleQuick: boolean;
    connectionsPerfect: boolean;
    strandsSpanagram: boolean;
  }
  
  export interface DailyScore {
    date: string;
    wordle: number;
    connections: number;
    strands: number;
    total: number;
    bonusPoints: BonusPoints;
    finalized: boolean;
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
  
  export type PlayerKey = 'player1' | 'player2' | 'player3' | 'player4';
  export type PlayerName = 'Keith' | 'Mike' | 'Colleen' | 'Toby';