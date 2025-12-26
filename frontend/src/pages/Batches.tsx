import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const Batches: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', departmentId: '', semester: '1', batchSize: '60' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchRes, deptRes] = await Promise.all([api.get('/batches'), api.get('/departments')]);
      setBatches(batchRes.data.batches);
      setDepartments(deptRes.data.departments);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/batches', { ...formData, semester: parseInt(formData.semester), batchSize: parseInt(formData.batchSize) });
      setFormData({ name: '', departmentId: '', semester: '1', batchSize: '60' });
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this batch?')) return;
    try {
      await api.delete(`/batches/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Batches</h1>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Add Batch</button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add Batch</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium">Name</label><input type="text" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><label className="block text-sm font-medium">Department</label><select required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium">Semester</label><input type="number" min="1" max="8" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} /></div>
            <div><label className="block text-sm font-medium">Batch Size</label><input type="number" min="1" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.batchSize} onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })} /></div>
            <div className="flex space-x-3">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded-md">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-md">
        {batches.length === 0 ? <div className="p-6 text-center text-gray-500">No batches found</div> : (
          <ul className="divide-y">
            {batches.map((batch) => (
              <li key={batch.id} className="px-6 py-4 flex justify-between">
                <div>
                  <h3 className="font-medium">{batch.name}</h3>
                  <p className="text-sm text-gray-500">{batch.department.name} • Semester {batch.semester}</p>
                  <p className="text-sm text-gray-400">Size: {batch.batchSize} students</p>
                </div>
                <button onClick={() => handleDelete(batch.id)} className="text-red-600">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Batches;
