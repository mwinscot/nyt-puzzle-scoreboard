// src/components/ArchiveButton.tsx

import React, { useState } from 'react';
import { supabase, publicSupabase } from '@/lib/supabase';
import { PlayerScores, ScoreRecord } from '@/types';

interface ArchiveButtonProps {
  onArchiveComplete?: () => void;
}

type PlayerTotals = {
  [key: number]: {
    score: number;
    wordle: number;
    connections: number;
    strands: number;
  }
};

interface ArchiveScoreRecord extends ScoreRecord {
  player_id: 1 | 2 | 3 | 4;
}

export const ArchiveButton: React.FC<ArchiveButtonProps> = ({ onArchiveComplete }) => {
  const [isArchiving, setIsArchiving] = useState(false);

  const archiveMonth = async (archiveCurrentMonth = false) => {
    const monthType = archiveCurrentMonth ? 'current' : 'previous';
    if (!confirm(`Are you sure you want to archive the ${monthType} month?`)) {
      return;
    }

    try {
      setIsArchiving(true);
      
      // Calculate the date range based on whether we're archiving current or previous month
      const now = new Date();
      let targetMonth;
      
      if (archiveCurrentMonth) {
        // For current month
        targetMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // For previous month
        targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      
      const startDate = targetMonth.toISOString().split('T')[0];
      const endDate = new Date(
        archiveCurrentMonth ? now.getFullYear() : now.getFullYear(), 
        archiveCurrentMonth ? now.getMonth() + 1 : now.getMonth(), 
        0
      ).toISOString().split('T')[0];
      
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
        .lte('date', endDate)
        .eq('archived', false);

      if (fetchError) throw fetchError;

      // 2. Calculate player totals
      const totals: PlayerTotals = {
        1: { score: 0, wordle: 0, connections: 0, strands: 0 },
        2: { score: 0, wordle: 0, connections: 0, strands: 0 },
        3: { score: 0, wordle: 0, connections: 0, strands: 0 },
        4: { score: 0, wordle: 0, connections: 0, strands: 0 }
      };

      monthlyScores?.forEach((score: ArchiveScoreRecord) => {
        const player = totals[score.player_id];
        player.score += score.total;
        if (score.bonus_wordle) player.wordle++;
        if (score.bonus_connections) player.connections++;
        if (score.bonus_strands) player.strands++;
      });

      // 3. Store in monthly_archives table
      const { error: archiveError } = await supabase
        .from('monthly_archives')
        .upsert({
          month: month,
          archive_data: totals,
          created_at: new Date().toISOString()
        });

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
    <div className="flex space-x-2">
      <button
        onClick={() => archiveMonth(false)}
        disabled={isArchiving}
        className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
      >
        {isArchiving ? 'Archiving...' : 'Archive Previous Month'}
      </button>
      <button
        onClick={() => archiveMonth(true)}
        disabled={isArchiving}
        className="p-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400"
      >
        {isArchiving ? 'Archiving...' : 'Archive Current Month'}
      </button>
    </div>
  );
};

export default ArchiveButton;