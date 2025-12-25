import { AttendanceConfigCard } from './attendance-config-card'
import { AttendanceRosterCard } from './attendance-roster-card'

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Absensi</h1>
        <p className="text-gray-500 mt-1">Konfigurasi kontrol kehadiran teknisi & helper</p>
      </div>

      <AttendanceConfigCard />

      <AttendanceRosterCard />
    </div>
  );
}
