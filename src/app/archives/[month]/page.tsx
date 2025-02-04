import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import ScoreCharts from '@/components/ScoreCharts';
import { createClient } from '@supabase/supabase-js';
import { PlayerScores, PlayerData, PlayerName } from '@/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const initialPlayerData = (): PlayerData => ({
  dailyScores: {},
  total: 0,
  totalBonuses: { wordle: 0, connections: 0, strands: 0 }
});

function getPlayerKeyFromName(name: PlayerName): keyof PlayerScores {
  switch (name) {
    case 'Keith': return 'player1';
    case 'Mike': return 'player2';
    case 'Colleen': return 'player3';
    case 'Toby': return 'player4';
    default: throw new Error('Invalid player name');
  }
}

export default async function Page({ params }: { params: { month: string } }) {
  if (!/^\d{4}-\d{2}$/.test(params.month)) {
    notFound();
  }

  const [yearStr, monthStr] = params.month.split('-');
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);
  
  // Get last day of month correctly
  const nextMonth = new Date(year, monthNum, 1);
  const lastDay = new Date(nextMonth.getTime() - 1).getDate();
  
  // Format dates properly for SQL query
  const startDate = params.month + '-01';
  const endDate = params.month + '-' + String(lastDay).padStart(2, '0');

  console.log('Fetching scores from', startDate, 'to', endDate); // Debug log

  const { data: scoresData } = await supabase
    .from('daily_scores')
    .select(`*, players (name)`)
    .gte('date', startDate)
    .lte('date', endDate);

  if (!scoresData || scoresData.length === 0) {
    console.log('No scores found for date range'); // Debug log
    notFound();
  }

  const scores: PlayerScores = {
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData(),
    player4: initialPlayerData()
  };

  // Process scores
  scoresData.forEach((score) => {
    const playerKey = getPlayerKeyFromName(score.players.name as PlayerName);
    
    if (!scores[playerKey].dailyScores[score.date]) {
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
    }
  });

  const monthName = new Date(`${params.month}-01`).toLocaleString('default', { 
    month: 'long',
    year: 'numeric'
  });

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
