import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import ScoreCharts from '@/components/ScoreCharts';
import { PlayerScores } from '@/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMonthScores } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { month: string } }) {
  if (!/^\d{4}-\d{2}$/.test(params.month)) {
    notFound();
  }

  const data = await getMonthScores(params.month);
  if (!data) notFound();

  const scores: PlayerScores = {
    player1: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
    player2: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
    player3: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } },
    player4: { dailyScores: {}, total: 0, totalBonuses: { wordle: 0, connections: 0, strands: 0 } }
  };

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
        wordleQuick: !!score.bonus_wordle,
        connectionsPerfect: !!score.bonus_connections,
        strandsSpanagram: !!score.bonus_strands
      },
      finalized: !!score.finalized
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
