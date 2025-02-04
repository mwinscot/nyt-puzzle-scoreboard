import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PlayerScores, PlayerData, PlayerName } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ScoreRecord {
  date: string;
  wordle: number;
  connections: number;
  strands: number;
  total: number;
  bonus_wordle: boolean;
  bonus_connections: boolean;
  bonus_strands: boolean;
  finalized: boolean;
  players: {
    name: PlayerName;
  };
}

const initialPlayerData = (): PlayerData => ({
  dailyScores: {},
  total: 0,
  totalBonuses: { wordle: 0, connections: 0, strands: 0 }
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month format' }, { status: 400 });
  }

  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const { data: scoresData, error } = await supabase
    .from('daily_scores')
    .select(`*, players (name)`)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const scores: PlayerScores = {
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData(),
    player4: initialPlayerData()
  };

  const playerMap: Record<PlayerName, keyof PlayerScores> = {
    'Keith': 'player1',
    'Mike': 'player2',
    'Colleen': 'player3',
    'Toby': 'player4'
  };

  (scoresData as ScoreRecord[])?.forEach((score) => {
    const playerKey = playerMap[score.players.name];
    if (!playerKey) return;

    scores[playerKey].dailyScores[score.date] = {
      date: score.date,
      wordle: score.wordle || 0,
      connections: score.connections || 0,
      strands: score.strands || 0,
      total: score.total || 0,
      bonusPoints: {
        wordleQuick: Boolean(score.bonus_wordle),
        connectionsPerfect: Boolean(score.bonus_connections),
        strandsSpanagram: Boolean(score.bonus_strands)
      },
      finalized: Boolean(score.finalized)
    };

    scores[playerKey].total += score.total || 0;
  });

  return NextResponse.json(scores);
}
