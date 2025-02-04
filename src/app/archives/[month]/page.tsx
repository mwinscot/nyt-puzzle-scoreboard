import { cookies } from 'next/headers';
import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import ScoreCharts from '@/components/ScoreCharts';
import { PlayerScores, PlayerData } from '@/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const initialPlayerData = (): PlayerData => ({
  dailyScores: {},
  total: 0,
  totalBonuses: { wordle: 0, connections: 0, strands: 0 }
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: { month: string } }) {
  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(params.month)) {
    notFound();
  }

  const [year, month] = params.month.split('-').map(Number);
  const startDate = `${params.month}-01`;
  const endDate = `${params.month}-${new Date(year, month, 0).getDate().toString().padStart(2, '0')}`;

  // Fetch data
  const { data: scoresData } = await supabase
    .from('daily_scores')
    .select(`*, players (name)`)
    .gte('date', startDate)
    .lte('date', endDate);

  if (!scoresData?.length) {
    notFound();
  }

  // Initialize scores object
  const scores: PlayerScores = {
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData(),
    player4: initialPlayerData()
  };

  // Process scores
  scoresData.forEach((score) => {
    const playerMap = {
      'Keith': 'player1',
      'Mike': 'player2',
      'Colleen': 'player3',
      'Toby': 'player4'
    } as const;

    const playerKey = playerMap[score.players.name as keyof typeof playerMap];
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

  const monthDate = new Date(`${params.month}-01`);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{monthName} Archive</h1>
        <Link href="/" className="text-blue-500 hover:text-blue-600">
          Return to Current Month
        </Link>
      </div>

      <TotalScoreHeader
        player1Score={scores.player1.total}
        player2Score={scores.player2.total}
        player3Score={scores.player3.total}
        player4Score={scores.player4.total}
        player1Name="Keith"
        player2Name="Mike"
        player3Name="Colleen"
        player4Name="Toby"
      />

      <div className="mt-8">
        <ScoreCharts scores={scores} />
      </div>
    </div>
  );
}
