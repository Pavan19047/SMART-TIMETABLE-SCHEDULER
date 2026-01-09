import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const GenerateTimetable: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', departmentId: '', semester: '1' });
  const [departments, setDepartments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timetables, setTimetables] = useState<any[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchDepartments();
  }, []);

  React.useEffect(() => {
    if (formData.departmentId && formData.semester) {
      fetchBatches();
    } else {
      setBatches([]);
    }
  }, [formData.departmentId, formData.semester]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get('/batches');
      const filteredBatches = response.data.batches.filter(
        (batch: any) => 
          batch.departmentId === formData.departmentId && 
          batch.semester === parseInt(formData.semester)
      );
      setBatches(filteredBatches);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (batches.length === 0) {
      setError('No batches found for the selected branch and semester. Please add batches first.');
      return;
    }

    setError('');
    setLoading(true);
    setTimetables([]);

    try {
      const response = await api.post('/timetables/generate', {
        name: formData.name,
        semester: parseInt(formData.semester),
        departmentId: formData.departmentId,
      });

      setTimetables(response.data.timetables);
      setFormData({ name: '', departmentId: '', semester: '1' });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to generate timetables');
      if (error.response?.data?.details) {
        console.error('Constraint violations:', error.response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Generate Timetable</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Timetable Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Spring 2024 Timetable"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Branch/Department</label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            >
              <option value="">Select Branch</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Semester</label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
          </div>

          {formData.departmentId && formData.semester && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">📚 Available Batches</h4>
              {batches.length > 0 ? (
                <ul className="text-sm text-blue-800 space-y-1">
                  {batches.map(batch => (
                    <li key={batch.id}>• {batch.name} (Size: {batch.batchSize})</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-orange-700">⚠️ No batches found for this branch and semester</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !formData.departmentId}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? 'Generating...' : 'Generate Timetables'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating timetable options...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      )}

      {timetables.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Generated Timetables</h2>
          <div className="space-y-4">
            {timetables.map((timetable, index) => (
              <div key={timetable.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{timetable.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Semester {timetable.semester} • {timetable.entries.length} classes scheduled
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Score: {timetable.score?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/timetable/${timetable.id}`)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    View Details
                  </button>
                </div>
                {timetable.metadata && (
                  <div className="text-sm text-gray-600 mt-4">
                    <p>Generated at: {new Date(timetable.metadata.generatedAt).toLocaleString()}</p>
                    {timetable.metadata.constraintsViolated > 0 && (
                      <p className="text-orange-600">
                        Warning: {timetable.metadata.constraintsViolated} constraint violations
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateTimetable;
