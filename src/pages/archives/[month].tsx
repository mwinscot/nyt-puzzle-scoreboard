import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { publicSupabase } from '@/lib/supabase';
import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import ScoreCharts from '@/components/ScoreCharts';
import { PlayerScores, PlayerData, PlayerName, ScoreRecord } from '@/types';
import Link from 'next/link';

const initialPlayerData = (): PlayerData => ({
  dailyScores: {},
  total: 0,
  totalBonuses: {
    wordle: 0,
    connections: 0,
    strands: 0
  }
});

const ArchivePage = () => {
  const router = useRouter();
  const { month } = router.query;
  const [scores, setScores] = useState<PlayerScores>({
    player1: initialPlayerData(),
    player2: initialPlayerData(),
    player3: initialPlayerData(),
    player4: initialPlayerData()
  });

  useEffect(() => {
    if (!month) return;

    const fetchArchivedScores = async () => {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      const { data: scoresData, error } = await publicSupabase
        .from('daily_scores')
        .select(`*, players (name)`)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('archived', true);

      if (error) {
        console.error('Error fetching archived scores:', error);
        return;
      }

      if (!scoresData) return;

      const newScores: PlayerScores = {
        player1: initialPlayerData(),
        player2: initialPlayerData(),
        player3: initialPlayerData(),
        player4: initialPlayerData()
      };

      scoresData.forEach((score: ScoreRecord) => {
        const playerKey = getPlayerKeyFromName(score.players.name as PlayerName);
        
        newScores[playerKey].dailyScores[score.date] = {
          date: score.date,
          wordle: score.wordle,
          connections: score.connections,
          strands: score.strands,
          total: score.total,
          bonusPoints: {
            wordleQuick: score.bonus_wordle,
            connectionsPerfect: score.bonus_connections,
            strandsSpanagram: score.bonus_strands
          },
          finalized: score.finalized
        };

        newScores[playerKey].total += score.total;
        if (score.bonus_wordle) newScores[playerKey].totalBonuses.wordle++;
        if (score.bonus_connections) newScores[playerKey].totalBonuses.connections++;
        if (score.bonus_strands) newScores[playerKey].totalBonuses.strands++;
      });

      setScores(newScores);
    };

    fetchArchivedScores();
  }, [month]);

  const monthDate = month ? new Date(`${month}-01`) : new Date();
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{monthName} Archive</h1>
        <Link 
          href="/"
          className="text-blue-500 hover:text-blue-600"
        >
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
};

export default ArchivePage;

const getPlayerKeyFromName = (name: PlayerName) => {
  switch (name) {
    case 'Keith': return 'player1';
    case 'Mike': return 'player2';
    case 'Colleen': return 'player3';
    case 'Toby': return 'player4';
    default: throw new Error('Invalid player name');
  }
};
