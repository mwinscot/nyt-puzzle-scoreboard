import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import ScoreCharts from '@/components/ScoreCharts';
import { PlayerScores } from '@/types';
import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getArchiveData(month: string): Promise<PlayerScores> {
  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');

  const res = await fetch(`${protocol}://${host}/api/scores?month=${month}`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to fetch archive data');
  }

  return res.json();
}

export default async function Page({ params }: { params: { month: string } }) {
  const scores = await getArchiveData(params.month);
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
