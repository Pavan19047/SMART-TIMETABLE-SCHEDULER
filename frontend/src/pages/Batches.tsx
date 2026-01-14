import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const Batches: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', departmentId: '', semester: '1', batchSize: '60' });
  const [managingBatch, setManagingBatch] = useState<any>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchRes, deptRes, subjRes] = await Promise.all([
        api.get('/batches'), 
        api.get('/departments'),
        api.get('/subjects')
      ]);
      setBatches(batchRes.data.batches);
      setDepartments(deptRes.data.departments);
      setSubjects(subjRes.data.subjects);
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

  const handleAddSubject = async () => {
    if (!selectedSubjectId || !managingBatch) return;
    try {
      await api.post(`/batches/${managingBatch.id}/subjects`, { subjectId: selectedSubjectId });
      setSelectedSubjectId('');
      fetchData();
      const res = await api.get(`/batches/${managingBatch.id}`);
      setManagingBatch(res.data.batch);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add subject');
    }
  };

  const handleRemoveSubject = async (batchId: string, subjectId: string) => {
    if (!confirm('Remove this subject from the batch?')) return;
    try {
      await api.delete(`/batches/${batchId}/subjects/${subjectId}`);
      fetchData();
      const res = await api.get(`/batches/${batchId}`);
      setManagingBatch(res.data.batch);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove subject');
    }
  };

  const openManageSubjects = async (batch: any) => {
    try {
      const res = await api.get(`/batches/${batch.id}`);
      setManagingBatch(res.data.batch);
    } catch (error) {
      alert('Failed to load batch details');
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

      {managingBatch && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Manage Subjects - {managingBatch.name}</h2>
            <button onClick={() => setManagingBatch(null)} className="text-gray-600">✕ Close</button>
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
                  .filter(s => s.semester === managingBatch.semester && s.departmentId === managingBatch.departmentId)
                  .filter(s => !managingBatch.subjects.some((bs: any) => bs.subject.id === s.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
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
            <h3 className="text-sm font-medium mb-2">Current Subjects ({managingBatch.subjects.length})</h3>
            {managingBatch.subjects.length === 0 ? (
              <p className="text-sm text-gray-500">No subjects assigned</p>
            ) : (
              <ul className="space-y-2">
                {managingBatch.subjects.map((bs: any) => (
                  <li key={bs.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                    <div>
                      <span className="font-medium">{bs.subject.code}</span>
                      <span className="text-gray-600 ml-2">{bs.subject.name}</span>
                      <span className="text-xs ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">{bs.subject.type}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveSubject(managingBatch.id, bs.subject.id)}
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
        {batches.length === 0 ? <div className="p-6 text-center text-gray-500">No batches found</div> : (
          <ul className="divide-y">
            {batches.map((batch) => (
              <li key={batch.id} className="px-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{batch.name}</h3>
                    <p className="text-sm text-gray-500">{batch.department.name} • Semester {batch.semester}</p>
                    <p className="text-sm text-gray-400">Size: {batch.batchSize} students • {batch.subjects.length} subjects</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openManageSubjects(batch)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Manage Subjects
                    </button>
                    <button onClick={() => handleDelete(batch.id)} className="text-red-600">Delete</button>
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

export default Batches;
