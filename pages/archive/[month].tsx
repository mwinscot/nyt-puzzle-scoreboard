import { useRouter } from 'next/router';
import ArchivedMonthView from '@/components/ArchivedMonthView';

const ArchivedMonthPage = () => {
  const router = useRouter();
  const { month } = router.query;

  if (!month || typeof month !== 'string') {
    return <div>Invalid month parameter</div>;
  }

  return <ArchivedMonthView month={month} />;
};

export default ArchivedMonthPage;