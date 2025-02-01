// src/components/ArchivedMonthView.tsx
import React, { useEffect, useState } from 'react';
import { PlayerScores } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import ScoreCharts from '@/components/ScoreCharts';
import { TotalScoreHeader } from '@/components/TotalScoreHeader';
import { publicSupabase } from '@/lib/supabase';

interface ArchivedMonthViewProps {
  month: string;  // Format: "YYYY-MM"
}

export const ArchivedMonthView: React.FC<ArchivedMonthViewProps> = ({ month }) => {
  const [archivedScores, setArchivedScores] = useState<PlayerScores | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArchivedMonth = async () => {
      try {
        const { data, error } = await publicSupabase
          .from('monthly_archives')
          .select('archive_data')
          .eq('month', month)
          .single();

        if (error) throw error;
        setArchivedScores(data?.archive_data || null);
      } catch (err) {
        console.error('Error fetching archived month:', err);
        setError('Failed to load archived scores');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchivedMonth();
  }, [month]);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              Loading archived scores...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !archivedScores) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-500">
              {error || `No archived scores found for ${month}`}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format the month for display (e.g., "January 2024")
  const displayMonth = new Date(month + '-01').toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{displayMonth} Archive</h1>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <TotalScoreHeader 
            player1Score={archivedScores.player1.total}
            player2Score={archivedScores.player2.total}
            player3Score={archivedScores.player3.total}
            player4Score={archivedScores.player4.total}
            player1Name="Keith"
            player2Name="Mike"
            player3Name="Colleen"
            player4Name="Player 4"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <ScoreCharts scores={archivedScores} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivedMonthView;