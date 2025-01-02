// src/utils/dateUtils.ts
export const getCurrentDatePST = (): string => {
  const date = new Date();
  const pstDate = new Date(date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles'
  }));
  return pstDate.getFullYear() + '-' + 
    String(pstDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(pstDate.getDate()).padStart(2, '0');
};

export const convertToPST = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};