// src/components/ArchiveLinks.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { listArchivedMonths } from '@/services/archiveService';

export const ArchiveLinks = () => {
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    const fetchMonths = async () => {
      const archivedMonths = await listArchivedMonths();
      setMonths(archivedMonths);
    };
    fetchMonths();
  }, []);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-4">Previous Months</h2>
      <div className="space-y-2">
        {months.map((month) => (
          <Link
            key={month}
            href={`/archives/${month}`}
            className="block p-3 bg-white hover:bg-gray-50 rounded-lg shadow border transition-colors"
          >
            {formatMonth(month)}
          </Link>
        ))}
      </div>
    </div>
  );
};