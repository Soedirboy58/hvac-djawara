import { ClockInOutCard } from '@/domain/operations/attendance/ClockInOutCard';
import { AttendanceStatsCard, AttendanceHistoryTable } from '@/domain/operations/attendance/AttendanceComponents';

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Absensi</h1>
        <p className="text-gray-500 mt-1">Kelola absensi dan kehadiran teknisi</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <ClockInOutCard />
        </div>
        <div className="md:col-span-2">
          <AttendanceStatsCard />
        </div>
      </div>

      <AttendanceHistoryTable />
    </div>
  );
}
