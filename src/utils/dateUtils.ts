export const getMonthDateRange = () => {
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const firstDay = new Date(pstDate.getFullYear(), pstDate.getMonth(), 1);
  const lastDay = new Date(pstDate.getFullYear(), pstDate.getMonth() + 1, 0);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0]
  };
};