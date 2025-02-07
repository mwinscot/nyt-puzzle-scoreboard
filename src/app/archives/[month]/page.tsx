import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import ScoreCharts from '@/components/ScoreCharts';
import { PlayerScores } from '@/types';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Force dynamic rendering to avoid static build issues
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Helper function to initialize scores
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

// Main page component
export default async function Page({ params }: { params: { month: string } }) {
  const scores = initScores();
  
  try {
    const [year, month] = params.month.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    
    const { data } = await supabase
      .from('daily_scores')
      .select('*, players (name)')
      .gte('date', `${params.month}-01`)
      .lte('date', `${params.month}-${String(lastDay).padStart(2, '0')}`);

    if (data) {
      data.forEach(score => {
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
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }

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
