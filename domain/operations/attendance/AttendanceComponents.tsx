'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';
import type { AttendanceSummary } from './types';

interface AttendanceStats {
  total_days: number;
  on_time_count: number;
  late_count: number;
  early_leave_count: number;
  absent_count: number;
  avg_work_hours: number;
}

export function AttendanceStatsCard() {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/attendance/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  if (!stats) {
    return null;
  }

  const onTimePercentage = stats.total_days > 0 
    ? ((stats.on_time_count / stats.total_days) * 100).toFixed(1)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Hari Kerja</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_days}</div>
          <p className="text-xs text-muted-foreground">Bulan ini</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kehadiran Tepat Waktu</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{onTimePercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.on_time_count} dari {stats.total_days} hari
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Keterlambatan</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.late_count}</div>
          <p className="text-xs text-muted-foreground">
            {stats.early_leave_count} kali pulang cepat
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rata-rata Jam Kerja</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avg_work_hours.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">jam per hari</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AttendanceHistoryTable() {
  const [attendances, setAttendances] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendances();
  }, []);

  const fetchAttendances = async () => {
    try {
      const response = await fetch('/api/attendance?limit=30');
      if (response.ok) {
        const data = await response.json();
        setAttendances(data.data);
      }
    } catch (error) {
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: AttendanceSummary['attendance_status']) => {
    const variants: Record<typeof status, { variant: any; className?: string }> = {
      'On Time': { variant: 'default', className: 'bg-green-600' },
      'Late': { variant: 'destructive' },
      'Early Leave': { variant: 'destructive' },
      'Late & Early Leave': { variant: 'destructive' },
      'Auto Checkout (Forgot)': { variant: 'outline' },
      'Absent': { variant: 'secondary' },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Absensi</CardTitle>
        <CardDescription>30 hari terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : attendances.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Belum ada data absensi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tanggal</th>
                  <th className="text-left p-2">Clock In</th>
                  <th className="text-left p-2">Clock Out</th>
                  <th className="text-center p-2">Jam Kerja</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-left p-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((attendance) => (
                  <tr key={attendance.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {new Date(attendance.date).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="p-2 font-mono text-sm">
                      {attendance.clock_in_time
                        ? new Date(attendance.clock_in_time).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="p-2 font-mono text-sm">
                      {attendance.clock_out_time
                        ? new Date(attendance.clock_out_time).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="p-2 text-center font-semibold">
                      {attendance.total_work_hours !== null
                        ? `${attendance.total_work_hours.toFixed(1)}h`
                        : '-'}
                    </td>
                    <td className="p-2 text-center">
                      {getStatusBadge(attendance.attendance_status)}
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {attendance.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
