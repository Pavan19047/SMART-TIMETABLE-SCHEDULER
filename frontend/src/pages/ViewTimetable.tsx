import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

  // Group entries by day
  const entriesByDay = new Map<number, typeof timetable.entries>();
  timetable.entries.forEach((entry: any) => {
    if (!entriesByDay.has(entry.dayOfWeek)) {
      entriesByDay.set(entry.dayOfWeek, []);
    }
    entriesByDay.get(entry.dayOfWeek)!.push(entry);
  });

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{timetable.name}</h1>
            <p className="text-gray-600 mt-2">Semester {timetable.semester}</p>
            <div className="mt-3 flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
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
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                  Score: {timetable.score.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            {user?.role === 'ADMIN' && timetable.status === 'DRAFT' && (
              <button
                onClick={handleApprove}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Approve
              </button>
            )}
            <button
              onClick={() => handleExport('pdf')}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Schedule</h2>
        {entriesByDay.size === 0 ? (
          <p className="text-gray-500">No classes scheduled</p>
        ) : (
          <div className="space-y-6">
            {Array.from(entriesByDay.entries())
              .sort(([a], [b]) => a - b)
              .map(([day, entries]) => (
                <div key={day}>
                  <h3 className="text-lg font-semibold text-indigo-600 mb-3">
                    {DAYS[day]}
                  </h3>
                  <div className="space-y-2">
                    {entries
                      .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                      .map((entry: any, idx: number) => (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-900">
                                  {entry.startTime} - {entry.endTime}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="font-medium text-indigo-600">
                                  {entry.subject.code}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1">
                                {entry.subject.name}
                              </p>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <span>👥 {entry.batch.name}</span>
                                <span>👨‍🏫 {entry.faculty.name}</span>
                                <span>🏫 Room {entry.classroom.roomId}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewTimetable;
