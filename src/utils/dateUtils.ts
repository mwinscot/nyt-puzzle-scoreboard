export const getMonthDateRange = (month?: string) => {
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  let firstDay;
  if (month === '2023-12') {
    firstDay = new Date('2023-12-10'); // December starts from 10th
  } else {
    firstDay = new Date(pstDate.getFullYear(), pstDate.getMonth(), 1);
  }
  
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0]
  };
};