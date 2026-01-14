import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const Faculties: React.FC = () => {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', departmentId: '', maxClassesPerDay: '4', weeklyLoadLimit: '20' });
  const [managingFaculty, setManagingFaculty] = useState<any>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [facRes, deptRes, subjRes] = await Promise.all([
        api.get('/faculties'), 
        api.get('/departments'),
        api.get('/subjects')
      ]);
      setFaculties(facRes.data.faculties);
      setDepartments(deptRes.data.departments);
      setSubjects(subjRes.data.subjects);
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

  const handleAddSubject = async () => {
    if (!selectedSubjectId || !managingFaculty) return;
    try {
      console.log('Adding subject:', selectedSubjectId, 'to faculty:', managingFaculty.id);
      await api.post(`/faculties/${managingFaculty.id}/subjects`, { subjectId: selectedSubjectId });
      setSelectedSubjectId('');
      alert('Subject added successfully!');
      fetchData();
      const res = await api.get(`/faculties/${managingFaculty.id}`);
      setManagingFaculty(res.data.faculty);
    } catch (error: any) {
      console.error('Failed to add subject:', error);
      alert(error.response?.data?.error || 'Failed to add subject');
    }
  };

  const handleRemoveSubject = async (facultyId: string, subjectId: string) => {
    if (!confirm('Remove this subject from the faculty?')) return;
    try {
      await api.delete(`/faculties/${facultyId}/subjects/${subjectId}`);
      fetchData();
      const res = await api.get(`/faculties/${facultyId}`);
      setManagingFaculty(res.data.faculty);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove subject');
    }
  };

  const openManageSubjects = async (faculty: any) => {
    try {
      console.log('Opening manage subjects for faculty:', faculty.id);
      const res = await api.get(`/faculties/${faculty.id}`);
      console.log('Faculty details received:', res.data);
      setManagingFaculty(res.data.faculty);
    } catch (error: any) {
      console.error('Failed to load faculty details:', error);
      alert('Failed to load faculty details: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Faculties</h1>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Add Faculty</button>
      </div>

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

      {managingFaculty && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Manage Subjects - {managingFaculty.name}</h2>
            <button onClick={() => setManagingFaculty(null)} className="text-gray-600">✕ Close</button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Add Subject</label>
            <div className="flex space-x-2">
              <select 
                className="flex-1 rounded-md border px-3 py-2" 
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects
                  .filter(s => s.departmentId === managingFaculty.departmentId)
                  .filter(s => !managingFaculty.subjects.some((fs: any) => fs.subject.id === s.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name} (Semester {s.semester})</option>
                  ))}
              </select>
              <button 
                onClick={handleAddSubject}
                disabled={!selectedSubjectId}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:bg-gray-300"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Current Subjects ({managingFaculty.subjects.length})</h3>
            {managingFaculty.subjects.length === 0 ? (
              <p className="text-sm text-gray-500">No subjects assigned</p>
            ) : (
              <ul className="space-y-2">
                {managingFaculty.subjects.map((fs: any) => (
                  <li key={fs.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                    <div>
                      <span className="font-medium">{fs.subject.code}</span>
                      <span className="text-gray-600 ml-2">{fs.subject.name}</span>
                      <span className="text-xs ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded">Sem {fs.subject.semester}</span>
                      <span className="text-xs ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">{fs.subject.type}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveSubject(managingFaculty.id, fs.subject.id)}
                      className="text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
              <li key={fac.id} className="px-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{fac.name}</h3>
                    <p className="text-sm text-gray-500">{fac.email} • {fac.department.name}</p>
                    <p className="text-sm text-gray-400">Max: {fac.maxClassesPerDay}/day • Weekly: {fac.weeklyLoadLimit}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openManageSubjects(fac)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Manage Subjects
                    </button>
                    <button onClick={() => handleDelete(fac.id)} className="text-red-600">Delete</button>
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

export default Faculties;
