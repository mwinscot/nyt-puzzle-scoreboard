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

function initScores(): PlayerScores {
  const emptyPlayerData = {
    dailyScores: {},
    total: 0,
    totalBonuses: { wordle: 0, connections: 0, strands: 0 }
  };
  
  return {
    player1: { ...emptyPlayerData },
    player2: { ...emptyPlayerData },
    player3: { ...emptyPlayerData },
    player4: { ...emptyPlayerData }
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  console.log('API Request for month:', month);

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();

  const { data, error } = await supabase
    .from('daily_scores')
    .select('*, players (name)')
    .gte('date', `${month}-01`)
    .lte('date', `${month}-${String(lastDay).padStart(2, '0')}`);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  console.log('Found scores:', data?.length);

  const scores = initScores();

  data?.forEach(score => {
    const playerKey = score.players.name === 'Keith' ? 'player1'
      : score.players.name === 'Mike' ? 'player2'
      : score.players.name === 'Colleen' ? 'player3'
      : 'player4';

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
    if (score.bonus_wordle) scores[playerKey].totalBonuses.wordle++;
    if (score.bonus_connections) scores[playerKey].totalBonuses.connections++;
    if (score.bonus_strands) scores[playerKey].totalBonuses.strands++;
  });

  return NextResponse.json(scores);
}
