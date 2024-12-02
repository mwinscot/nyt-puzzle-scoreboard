'use client'

import PuzzleScoreboard from '@/components/puzzle-scoreboard';    

export default function Home() {
  return (
    <main className="min-h-screen p-8 flex justify-center items-start bg-gray-50">
      <PuzzleScoreboard />
    </main>
  );
}