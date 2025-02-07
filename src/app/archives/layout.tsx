import { Suspense } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6">Loading archive...</div>}>
      {children}
    </Suspense>
  );
}
