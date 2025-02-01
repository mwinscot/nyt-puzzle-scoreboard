// src/components/ArchiveButton.tsx
import React, { useState } from 'react';
import { supabase, publicSupabase } from '@/lib/supabase';

interface ArchiveButtonProps {
  onArchiveComplete?: () => void;
}

export const ArchiveButton: React.FC<ArchiveButtonProps> = ({ onArchiveComplete }) => {
  const [isArchiving, setIsArchiving] = useState(false);

  const archiveMonth = async () => {
    if (!confirm('Are you sure you want to archive the previous month?')) {
      return;
    }

    try {
      setIsArchiving(true);
      
      // Calculate the date range for the previous month
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startDate = previousMonth.toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString().split('T')[0];
      
      // Get month in YYYY-MM format
      const month = startDate.substring(0, 7);

      // 1. Fetch all scores for the month
      const { data: monthlyScores, error: fetchError } = await publicSupabase
        .from('daily_scores')
        .select(`
          *,
          players (
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      if (fetchError) throw fetchError;

      // 2. Calculate player totals
      const totals = {
        1: { score: 0, wordle: 0, connections: 0, strands: 0 },
        2: { score: 0, wordle: 0, connections: 0, strands: 0 },
        3: { score: 0, wordle: 0, connections: 0, strands: 0 }
      };

      monthlyScores?.forEach(score => {
        if (score.player_id in totals) {
          const player = totals[score.player_id];
          player.score += score.total;
          if (score.bonus_wordle) player.wordle++;
          if (score.bonus_connections) player.connections++;
          if (score.bonus_strands) player.strands++;
        }
      });

      // 3. Store in monthly_archives table
      const { error: archiveError } = await supabase
        .from('monthly_archives')
        .upsert(Object.entries(totals).map(([player_id, stats]) => ({
          month: month,
          player_id: parseInt(player_id),
          total_score: stats.score,
          total_wordle_bonus: stats.wordle,
          total_connections_bonus: stats.connections,
          total_strands_bonus: stats.strands,
          created_at: new Date().toISOString()
        })));

      if (archiveError) throw archiveError;

      // 4. Mark daily scores as archived
      const { error: updateError } = await supabase
        .from('daily_scores')
        .update({ archived: true })
        .gte('date', startDate)
        .lte('date', endDate);

      if (updateError) throw updateError;

      // 5. Call the completion handler
      if (onArchiveComplete) {
        onArchiveComplete();
      }

      alert(`Successfully archived scores for ${new Date(startDate).toLocaleString('default', { month: 'long', year: 'numeric' })}`);
    } catch (error) {
      console.error('Error archiving month:', error);
      alert('Failed to archive scores. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <button
      onClick={archiveMonth}
      disabled={isArchiving}
      className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
    >
      {isArchiving ? 'Archiving...' : 'Archive Previous Month'}
    </button>
  );
};

export default ArchiveButton;