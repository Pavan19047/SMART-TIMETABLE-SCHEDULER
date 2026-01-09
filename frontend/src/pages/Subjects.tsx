import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    departmentId: '', 
    semester: '1', 
    weeklyClassesRequired: '3',
    courseDurationWeeks: '16',
    totalHoursRequired: '48'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, deptRes] = await Promise.all([api.get('/subjects'), api.get('/departments')]);
      setSubjects(subRes.data.subjects);
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
      await api.post('/subjects', { 
        ...formData, 
        semester: parseInt(formData.semester), 
        weeklyClassesRequired: parseInt(formData.weeklyClassesRequired),
        courseDurationWeeks: parseInt(formData.courseDurationWeeks),
        totalHoursRequired: parseInt(formData.totalHoursRequired)
      });
      setFormData({ name: '', code: '', departmentId: '', semester: '1', weeklyClassesRequired: '3', courseDurationWeeks: '16', totalHoursRequired: '48' });
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Subjects</h1>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Add Subject</button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add Subject</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input type="text" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium">Code</label>
                <input type="text" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Department</label>
              <select required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium">Semester</label>
                <input type="number" min="1" max="8" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium">Weekly Classes</label>
                <input type="number" min="1" max="10" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.weeklyClassesRequired} onChange={(e) => setFormData({ ...formData, weeklyClassesRequired: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium">Duration (Weeks)</label>
                <input type="number" min="1" max="20" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.courseDurationWeeks} onChange={(e) => setFormData({ ...formData, courseDurationWeeks: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Total Hours Required</label>
              <input type="number" min="1" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.totalHoursRequired} onChange={(e) => setFormData({ ...formData, totalHoursRequired: e.target.value })} />
              <p className="text-xs text-gray-500 mt-1">
                Suggested: {parseInt(formData.weeklyClassesRequired) * parseInt(formData.courseDurationWeeks)} hours 
                ({formData.weeklyClassesRequired} classes/week × {formData.courseDurationWeeks} weeks)
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">📚 Auto-Generated Concepts</h4>
              <p className="text-xs text-blue-800">
                The system will automatically break down the course into basic concepts covering:
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4">
                <li>• Introduction & Fundamentals (20%)</li>
                <li>• Core Concepts (40%)</li>
                <li>• Advanced Topics (25%)</li>
                <li>• Practical Applications & Review (15%)</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Create Subject</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-md">
        {subjects.length === 0 ? <div className="p-6 text-center text-gray-500">No subjects found</div> : (
          <ul className="divide-y">
            {subjects.map((sub) => (
              <li key={sub.id} className="px-6 py-4 flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{sub.name} ({sub.code})</h3>
                  <p className="text-sm text-gray-500">{sub.department.name} • Semester {sub.semester}</p>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="inline-block mr-4">📅 {sub.weeklyClassesRequired} classes/week</span>
                    <span className="inline-block mr-4">⏱️ {sub.courseDurationWeeks || 16} weeks</span>
                    <span className="inline-block">🎯 {sub.totalHoursRequired || (sub.weeklyClassesRequired * 16)} total hours</span>
                  </div>
                  {sub.conceptsCovered && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-semibold">Concepts: </span>
                      {sub.conceptsCovered.map((c: any, i: number) => (
                        <span key={i} className="inline-block mr-2">
                          {c.topic} ({c.estimatedHours}h)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(sub.id)} className="text-red-600 hover:text-red-800 ml-4">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Subjects;
