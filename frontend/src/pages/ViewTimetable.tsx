import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
// Structure: 2 slots | SHORT BREAK | 2 slots | LUNCH | 1 slot | SHORT BREAK | 2 slots
const TIME_SLOTS = [
  { label: 'HOUR 1',       start: '09:00', end: '09:50', isBreak: false },
  { label: 'HOUR 2',       start: '09:55', end: '10:45', isBreak: false },
  { label: 'SHORT BREAK',  start: '10:45', end: '11:00', isBreak: true  },
  { label: 'HOUR 3',       start: '11:00', end: '11:50', isBreak: false },
  { label: 'HOUR 4',       start: '11:55', end: '12:45', isBreak: false },
  { label: 'LUNCH BREAK',  start: '12:45', end: '13:30', isBreak: true  },
  { label: 'HOUR 5',       start: '13:30', end: '14:20', isBreak: false },
  { label: 'SHORT BREAK',  start: '14:20', end: '14:35', isBreak: true  },
  { label: 'HOUR 6',       start: '14:35', end: '15:25', isBreak: false },
  { label: 'HOUR 7',       start: '15:30', end: '16:20', isBreak: false },
];

const ViewTimetable: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTimetable();
  }, [id]);

  const fetchTimetable = async () => {
    try {
      const response = await api.get(`/timetables/${id}`);
      setTimetable(response.data.timetable);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      setError('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this timetable? This action cannot be undone.')) return;

    try {
      await api.post(`/timetables/${id}/approve`);
      fetchTimetable();
      alert('Timetable approved successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to approve timetable');
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await api.get(`/timetables/${id}/export/${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable-${timetable.name}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to export timetable');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !timetable) {
    return (
      <div className="text-center text-red-600">
        {error || 'Timetable not found'}
      </div>
    );
  }

  // Group entries by day and time for grid display
  const getClassForSlot = (dayIndex: number, timeSlot: any) => {
    return timetable.entries.find((entry: any) => {
      if (entry.dayOfWeek !== dayIndex) return false;
      
      // Check if this slot falls within the entry's time range
      const entryStart = entry.startTime;
      const entryEnd = entry.endTime;
      const slotStart = timeSlot.start;
      
      // Convert times to minutes for comparison
      const toMinutes = (time: string) => {
        const [hours, mins] = time.split(':').map(Number);
        return hours * 60 + mins;
      };
      
      const entryStartMin = toMinutes(entryStart);
      const entryEndMin = toMinutes(entryEnd);
      const slotStartMin = toMinutes(slotStart);
      
      // Check if slot start time falls within entry's time range
      return slotStartMin >= entryStartMin && slotStartMin < entryEndMin;
    });
  };

  // Check if a class spans multiple slots (for proper display)
  const getColSpan = (entry: any) => {
    if (!entry) return 1;
    const toMinutes = (time: string) => {
      const [hours, mins] = time.split(':').map(Number);
      return hours * 60 + mins;
    };
    const duration = toMinutes(entry.endTime) - toMinutes(entry.startTime);
    // Lab sessions are 105 min (1h45m) and span 2 slots
    if (duration >= 100) return 2;
    return 1;
  };

  // Stable color per subject so Theory and Lab sessions of same subject match
  const getSubjectColor = (subjectId: string, subjectType: string) => {
    const theoryColors = [
      'bg-blue-100 border-blue-300',
      'bg-indigo-100 border-indigo-300',
      'bg-sky-100 border-sky-300',
      'bg-violet-100 border-violet-300',
      'bg-cyan-100 border-cyan-300',
      'bg-slate-100 border-slate-300',
    ];
    const labColors = [
      'bg-orange-100 border-orange-300',
      'bg-amber-100 border-amber-300',
      'bg-rose-100 border-rose-300',
      'bg-fuchsia-100 border-fuchsia-300',
      'bg-pink-100 border-pink-300',
      'bg-red-100 border-red-300',
    ];
    // Hash subject ID to a stable index
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) hash = (hash * 31 + subjectId.charCodeAt(i)) & 0xffffff;
    const idx = Math.abs(hash) % 6;
    if (subjectType === 'PRACTICAL') return labColors[idx];
    if (subjectType === 'THEORY_CUM_PRACTICAL') return theoryColors[idx]; // same color for both theory+lab sessions
    return theoryColors[idx];
  };

  return (
    <div className="px-4 sm:px-0 max-w-[1600px] mx-auto">
      {/* Header with Title and Actions */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{timetable.name}</h1>
            <p className="text-gray-600 mt-1">Semester {timetable.semester}</p>
            <div className="mt-3 flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  timetable.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : timetable.status === 'LOCKED'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {timetable.status}
              </span>
              {timetable.score && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Score: {timetable.score.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            {user?.role === 'ADMIN' && timetable.status === 'DRAFT' && (
              <button
                onClick={handleApprove}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
              >
                Approve
              </button>
            )}
            <button
              onClick={() => handleExport('pdf')}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
            >
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 w-32">
                  DAY/HOUR
                </th>
                {TIME_SLOTS.map((slot, idx) => (
                  <th 
                    key={idx} 
                    className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[180px]"
                  >
                    {slot.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIndex) => {
                const renderedSlots = new Set<number>();
                
                return (
                  <tr key={dayIndex} className="border-b border-gray-200">
                    <td className="px-4 py-4 border-r border-gray-300 bg-gray-50">
                      <div className="text-sm font-semibold text-gray-900">{day}</div>
                    </td>
                    {TIME_SLOTS.map((slot, slotIndex) => {
                      // Skip if already rendered as part of a colspan
                      if (renderedSlots.has(slotIndex)) {
                        return null;
                      }

                      if (slot.isBreak) {
                        return (
                          <td 
                            key={slotIndex} 
                            className="p-2 border-r border-gray-200 align-middle bg-amber-50"
                          >
                            <div className="text-center">
                              <div className="text-xs font-semibold text-amber-700 mb-1">
                                {slot.label}
                              </div>
                              <div className="text-xs text-amber-600">
                                {slot.start} - {slot.end}
                              </div>
                            </div>
                          </td>
                        );
                      }
                      
                      const classEntry = getClassForSlot(dayIndex, slot);
                      const colSpan = classEntry ? getColSpan(classEntry) : 1;
                      
                      // Mark subsequent slots as rendered if this is a multi-column entry
                      if (colSpan > 1) {
                        for (let i = 1; i < colSpan; i++) {
                          const nextSlotIndex = slotIndex + i;
                          if (nextSlotIndex < TIME_SLOTS.length && !TIME_SLOTS[nextSlotIndex].isBreak) {
                            renderedSlots.add(nextSlotIndex);
                          }
                        }
                      }
                      
                      return (
                        <td 
                          key={slotIndex} 
                          colSpan={colSpan}
                          className="p-2 border-r border-gray-200 align-top"
                        >
                          {classEntry ? (
                            <div className={`rounded-lg p-3 border-2 shadow-sm hover:shadow-md transition-shadow ${getSubjectColor(classEntry.subject.id, classEntry.subject.type)}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm font-bold text-gray-900">
                                  {classEntry.subject.code}
                                </div>
                                {(() => {
                                  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                                  const dur = toMin(classEntry.endTime) - toMin(classEntry.startTime);
                                  const isLabSession =
                                    classEntry.subject.type === 'PRACTICAL' ||
                                    (classEntry.subject.type === 'THEORY_CUM_PRACTICAL' && dur > 60);
                                  return (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      isLabSession ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'
                                    }`}>
                                      {isLabSession ? 'LAB' : 'TH'}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="text-xs text-gray-700 font-medium mb-1">
                                {classEntry.faculty.name}
                              </div>
                              <div className="text-xs text-gray-600 mb-1.5">
                                {classEntry.subject.name}
                              </div>
                              <div className="text-xs text-gray-600 mb-1">
                                {classEntry.batch.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
                                {classEntry.startTime} - {classEntry.endTime}
                              </div>
                              <div className="text-xs text-gray-500">
                                Room: {classEntry.classroom.roomId}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full min-h-[100px]"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewTimetable;
