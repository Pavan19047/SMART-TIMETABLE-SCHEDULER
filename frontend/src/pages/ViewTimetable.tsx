import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { label: 'HOUR 1', start: '09:00', end: '10:00', isBreak: false },
  { label: 'HOUR 2', start: '10:00', end: '11:00', isBreak: false },
  { label: 'SHORT BREAK', start: '11:00', end: '11:15', isBreak: true },
  { label: 'HOUR 3', start: '11:15', end: '12:15', isBreak: false },
  { label: 'HOUR 4', start: '12:15', end: '13:15', isBreak: false },
  { label: 'LUNCH BREAK', start: '13:15', end: '14:00', isBreak: true },
  { label: 'HOUR 5', start: '14:00', end: '15:00', isBreak: false },
  { label: 'HOUR 6', start: '15:00', end: '16:00', isBreak: false },
  { label: 'SHORT BREAK', start: '16:00', end: '16:15', isBreak: true },
  { label: 'HOUR 7', start: '16:15', end: '17:15', isBreak: false },
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
    return timetable.entries.find((entry: any) => 
      entry.dayOfWeek === dayIndex && 
      entry.startTime === timeSlot.start
    );
  };

  const getCardColor = (index: number) => {
    const colors = [
      'bg-emerald-100 border-emerald-300',
      'bg-cyan-100 border-cyan-300',
      'bg-teal-100 border-teal-300',
      'bg-blue-100 border-blue-300',
      'bg-indigo-100 border-indigo-300',
      'bg-purple-100 border-purple-300',
    ];
    return colors[index % colors.length];
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
              {DAYS.map((day, dayIndex) => (
                <tr key={dayIndex} className="border-b border-gray-200">
                  <td className="px-4 py-4 border-r border-gray-300 bg-gray-50">
                    <div className="text-sm font-semibold text-gray-900">{day}</div>
                  </td>
                  {TIME_SLOTS.map((slot, slotIndex) => {
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
                    return (
                      <td 
                        key={slotIndex} 
                        className="p-2 border-r border-gray-200 align-top"
                      >
                        {classEntry ? (
                          <div className={`rounded-lg p-3 border-2 shadow-sm hover:shadow-md transition-shadow ${getCardColor(slotIndex)}`}>
                            <div className="text-sm font-bold text-gray-900 mb-1">
                              {classEntry.subject.code}
                            </div>
                            <div className="text-xs text-gray-700 font-medium mb-1">
                              {classEntry.faculty.name}
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              {classEntry.batch.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
                              {slot.start} - {slot.end}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewTimetable;
