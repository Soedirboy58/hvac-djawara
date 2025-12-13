'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { DailyAttendance } from './types';

export function ClockInOutCard() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<DailyAttendance | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance
  useEffect(() => {
    fetchTodayAttendance();
  }, [user]);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?technician_id=${user.id}&date=${today}`);
      
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data.data?.[0] || null);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: user.id,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data.data);
        setNotes('');
        alert('Clock in berhasil!');
      } else {
        const error = await response.json();
        alert(error.error || 'Clock in gagal');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Terjadi kesalahan saat clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: todayAttendance.id,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data.data);
        setNotes('');
        alert('Clock out berhasil!');
      } else {
        const error = await response.json();
        alert(error.error || 'Clock out gagal');
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Terjadi kesalahan saat clock out');
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = todayAttendance?.clock_in_time && !todayAttendance?.clock_out_time;
  const isClockedOut = todayAttendance?.clock_out_time;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Absensi Hari Ini
        </CardTitle>
        <CardDescription>
          {currentTime.toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Time Display */}
        <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="text-4xl font-bold text-gray-900">
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-sm text-gray-500 mt-1">Waktu Sekarang</div>
        </div>

        {/* Attendance Status */}
        {todayAttendance && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Clock In:</span>
              <div className="flex items-center gap-2">
                {todayAttendance.clock_in_time ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-mono">
                      {new Date(todayAttendance.clock_in_time).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {todayAttendance.is_late && (
                      <Badge variant="error">Terlambat</Badge>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Belum clock in</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Clock Out:</span>
              <div className="flex items-center gap-2">
                {todayAttendance.clock_out_time ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-mono">
                      {new Date(todayAttendance.clock_out_time).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {todayAttendance.is_early_leave && (
                      <Badge variant="error">Pulang Cepat</Badge>
                    )}
                    {todayAttendance.is_auto_checkout && (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Auto Checkout
                      </Badge>
                    )}
                  </>
                ) : isClockedIn ? (
                  <>
                    <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span className="text-blue-600">Sedang bekerja...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Belum clock out</span>
                  </>
                )}
              </div>
            </div>

            {todayAttendance.total_work_hours !== null && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Total Jam Kerja:</span>
                <span className="text-lg font-bold text-blue-600">
                  {todayAttendance.total_work_hours.toFixed(1)} jam
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notes Input */}
        {!isClockedOut && (
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Tambahkan catatan jika diperlukan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Action Buttons */}
        {!isClockedOut && (
          <div className="flex gap-3">
            {!isClockedIn ? (
              <Button 
                onClick={handleClockIn} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Clock In
              </Button>
            ) : (
              <Button 
                onClick={handleClockOut} 
                disabled={loading}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Clock Out
              </Button>
            )}
          </div>
        )}

        {isClockedOut && (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-700 font-medium">Absensi hari ini sudah selesai</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
