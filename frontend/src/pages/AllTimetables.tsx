import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Timetable {
  id: string;
  name: string;
  semester: number;
  status: string;
  score: number;
  createdAt: string;
  approvedAt?: string;
  metadata?: any;
}

export default function AllTimetables() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [filteredTimetables, setFilteredTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTimetables();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [timetables, searchTerm, filterStatus, filterSemester]);

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const response = await api.get('/timetables');
      setTimetables(response.data.timetables || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch timetables');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...timetables];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tt =>
        tt.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(tt => tt.status === filterStatus);
    }

    // Semester filter
    if (filterSemester !== 'ALL') {
      filtered = filtered.filter(tt => tt.semester === parseInt(filterSemester));
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredTimetables(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'LOCKED':
        return 'bg-gray-100 text-gray-800';
      case 'DRAFT':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this timetable?')) return;

    try {
      await api.delete(`/timetables/${id}`);
      setTimetables(timetables.filter(tt => tt.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete timetable');
    }
  };

  const uniqueSemesters = Array.from(new Set(timetables.map(tt => tt.semester))).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading timetables...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">All Timetables</h1>
        <button
          onClick={() => navigate('/generate-timetable')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Generate New Timetable
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>
        <div>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="ALL">All Semesters</option>
            {uniqueSemesters.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredTimetables.length} of {timetables.length} timetables
      </div>

      {/* Timetables Grid */}
      {filteredTimetables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No timetables found</p>
          <p className="text-gray-400 mt-2">Try adjusting your filters or generate a new timetable</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTimetables.map((timetable) => (
            <div
              key={timetable.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">
                    {timetable.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(timetable.status)}`}>
                    {timetable.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-medium">Semester:</span>
                    <span>{timetable.semester}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Score:</span>
                    <span className="font-semibold text-indigo-600">
                      {timetable.score?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created:</span>
                    <span>{formatDate(timetable.createdAt)}</span>
                  </div>
                  {timetable.approvedAt && (
                    <div className="flex justify-between">
                      <span className="font-medium">Approved:</span>
                      <span>{formatDate(timetable.approvedAt)}</span>
                    </div>
                  )}
                  {timetable.metadata?.totalEntries && (
                    <div className="flex justify-between">
                      <span className="font-medium">Total Classes:</span>
                      <span>{timetable.metadata.totalEntries}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-200">
                <button
                  onClick={() => navigate(`/timetable/${timetable.id}`)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                >
                  View Details →
                </button>
                <button
                  onClick={() => handleDelete(timetable.id)}
                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
