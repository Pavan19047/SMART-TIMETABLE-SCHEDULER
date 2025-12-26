import React, { useEffect, useState } from 'react';
import api from '../lib/api';

interface Department {
  id: string;
  name: string;
  code: string;
  _count?: {
    faculties: number;
    subjects: number;
    batches: number;
  };
}

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await api.put(`/departments/${editingId}`, formData);
      } else {
        await api.post('/departments', formData);
      }
      setFormData({ name: '', code: '' });
      setShowForm(false);
      setEditingId(null);
      fetchDepartments();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (dept: Department) => {
    setFormData({ name: dept.name, code: dept.code });
    setEditingId(dept.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      await api.delete(`/departments/${id}`);
      fetchDepartments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', code: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Add Department
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Department' : 'Add Department'}
          </h2>
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {departments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No departments found</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {departments.map((dept) => (
              <li key={dept.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{dept.name}</h3>
                    <p className="text-sm text-gray-500">Code: {dept.code}</p>
                    {dept._count && (
                      <p className="text-sm text-gray-400 mt-1">
                        {dept._count.faculties} faculties • {dept._count.subjects} subjects • {dept._count.batches} batches
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Departments;
