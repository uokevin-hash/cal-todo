import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/client';
import type { AttendanceRow } from '../../types';

export type AttendanceFilters = {
  from: string;
  to: string;
  group: string;
  name: string;
  status: string;
  capacity: string;
};

export function useAttendance(filters: AttendanceFilters) {
  // 빈 값은 보내지 않는다(PRD 9장)
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => api<AttendanceRow[]>(`/attendance?${query}`),
  });
}
