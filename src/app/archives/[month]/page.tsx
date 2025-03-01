import dynamic from 'next/dynamic';

const ArchivePageClient = dynamic(() => import('./page.client'), {
  ssr: false
});

export default function Page({ params }: { params: { month: string } }) {
  return <ArchivePageClient month={params.month} />;
}
