// pages/archive/[month].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import ScoreCharts from '@/components/ScoreCharts';

interface ArchiveData {
 month: string;
 scores: {
   player1: number;
   player2: number;
   player3: number;
 };
 bonuses: {
   player1: {wordle: number; connections: number; strands: number;};
   player2: {wordle: number; connections: number; strands: number;};
   player3: {wordle: number; connections: number; strands: number;};
 };
}

export default function ArchivePage() {
 const router = useRouter();
 const { month } = router.query;
 const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);

 useEffect(() => {
   if (!month) return;

   const fetchArchiveData = async () => {
     const { data, error } = await supabase
       .from('monthly_archives')
       .select('*')
       .eq('month', month);

     if (error) {
       console.error('Error fetching archive:', error);
       return;
     }

     const processedData: ArchiveData = {
       month: month as string,
       scores: {
         player1: data.find(d => d.player_id === 1)?.total_score || 0,
         player2: data.find(d => d.player_id === 2)?.total_score || 0,
         player3: data.find(d => d.player_id === 3)?.total_score || 0
       },
       bonuses: {
         player1: {
           wordle: data.find(d => d.player_id === 1)?.total_wordle_bonus || 0,
           connections: data.find(d => d.player_id === 1)?.total_connections_bonus || 0,
           strands: data.find(d => d.player_id === 1)?.total_strands_bonus || 0
         },
         player2: {
           wordle: data.find(d => d.player_id === 2)?.total_wordle_bonus || 0,
           connections: data.find(d => d.player_id === 2)?.total_connections_bonus || 0,
           strands: data.find(d => d.player_id === 2)?.total_strands_bonus || 0
         },
         player3: {
           wordle: data.find(d => d.player_id === 3)?.total_wordle_bonus || 0,
           connections: data.find(d => d.player_id === 3)?.total_connections_bonus || 0,
           strands: data.find(d => d.player_id === 3)?.total_strands_bonus || 0
         }
       }
     };

     setArchiveData(processedData);
   };

   fetchArchiveData();
 }, [month]);

 if (!archiveData) return <div>Loading...</div>;

 const monthDate = new Date(archiveData.month + '-01');
 const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

 return (
   <div className="w-full max-w-4xl mx-auto p-6">
     <h1 className="text-2xl font-bold mb-6">{monthName} Archive</h1>
     <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
       <div className="grid grid-cols-3 gap-8 text-center">
         {['Keith', 'Mike', 'Colleen'].map((name, idx) => (
           <div key={name}>
             <div className="text-lg font-semibold text-gray-800">{name}</div>
             <div className="text-5xl font-bold mt-2">
               {archiveData.scores[`player${idx + 1}` as keyof typeof archiveData.scores]}
             </div>
             <div className="mt-2 text-sm text-gray-600">
               <div>Wordle Bonuses: {archiveData.bonuses[`player${idx + 1}` as keyof typeof archiveData.bonuses].wordle}</div>
               <div>Connections Bonuses: {archiveData.bonuses[`player${idx + 1}` as keyof typeof archiveData.bonuses].connections}</div>
               <div>Strands Bonuses: {archiveData.bonuses[`player${idx + 1}` as keyof typeof archiveData.bonuses].strands}</div>
             </div>
           </div>
         ))}
       </div>
       <div className="mt-4 flex justify-center items-center">
         <Trophy className="w-5 h-5 text-yellow-600 mr-2" />
         <span className="text-sm text-gray-800 font-medium">Monthly Total Points</span>
       </div>
     </Card>
   </div>
 );
}