import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const Faculties: React.FC = () => {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', departmentId: '', maxClassesPerDay: '4', weeklyLoadLimit: '20' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [facRes, deptRes] = await Promise.all([api.get('/faculties'), api.get('/departments')]);
      setFaculties(facRes.data.faculties);
      setDepartments(deptRes.data.departments);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const filteredFaculties = selectedDepartment 
    ? faculties.filter(fac => fac.departmentId === selectedDepartment)
    : faculties;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/faculties', { ...formData, maxClassesPerDay: parseInt(formData.maxClassesPerDay), weeklyLoadLimit: parseInt(formData.weeklyLoadLimit) });
      setFormData({ name: '', email: '', departmentId: '', maxClassesPerDay: '4', weeklyLoadLimit: '20' });
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this faculty?')) return;
    try {
      await api.delete(`/faculties/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Faculties</h1>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Add Faculty</button>
      </div>

      {/* Branch Filter */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">Filter by Branch/Department</label>
        <select 
          className="block w-full rounded-md border px-3 py-2"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="">All Branches</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add Faculty</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium">Name</label><input type="text" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><label className="block text-sm font-medium">Email</label><input type="email" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div><label className="block text-sm font-medium">Department</label><select required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium">Max Classes/Day</label><input type="number" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.maxClassesPerDay} onChange={(e) => setFormData({ ...formData, maxClassesPerDay: e.target.value })} /></div>
            <div><label className="block text-sm font-medium">Weekly Load Limit</label><input type="number" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.weeklyLoadLimit} onChange={(e) => setFormData({ ...formData, weeklyLoadLimit: e.target.value })} /></div>
            <div className="flex space-x-3">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded-md">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-md">
        {filteredFaculties.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {selectedDepartment ? 'No faculties found for this branch' : 'No faculties found'}
          </div>
        ) : (
          <ul className="divide-y">
            {filteredFaculties.map((fac) => (
              <li key={fac.id} className="px-6 py-4 flex justify-between">
                <div>
                  <h3 className="font-medium">{fac.name}</h3>
                  <p className="text-sm text-gray-500">{fac.email} • {fac.department.name}</p>
                  <p className="text-sm text-gray-400">Max: {fac.maxClassesPerDay}/day • Weekly: {fac.weeklyLoadLimit}</p>
                </div>
                <button onClick={() => handleDelete(fac.id)} className="text-red-600">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Faculties;
