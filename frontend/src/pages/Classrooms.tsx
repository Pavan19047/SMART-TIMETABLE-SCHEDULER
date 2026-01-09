import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ roomId: '', capacity: '', type: 'CLASSROOM' });

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await api.get('/classrooms');
      setClassrooms(response.data.classrooms);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        roomId: formData.roomId,
        capacity: parseInt(formData.capacity),
        type: formData.type,
      };
      
      if (editingId) {
        await api.put(`/classrooms/${editingId}`, payload);
      } else {
        await api.post('/classrooms', payload);
      }
      setFormData({ roomId: '', capacity: '', type: 'CLASSROOM' });
      setShowForm(false);
      setEditingId(null);
      fetchClassrooms();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this classroom?')) return;
    try {
      await api.delete(`/classrooms/${id}`);
      fetchClassrooms();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Classrooms</h1>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md">
          Add Classroom
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit' : 'Add'} Classroom</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Room ID</label>
              <input type="text" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.roomId} onChange={(e) => setFormData({ ...formData, roomId: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium">Capacity</label>
              <input type="number" required className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium">Type</label>
              <select className="mt-1 block w-full rounded-md border px-3 py-2" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="CLASSROOM">Classroom</option>
                <option value="LAB">Lab</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-gray-300 px-4 py-2 rounded-md">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-md">
        {classrooms.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No classrooms found</div>
        ) : (
          <ul className="divide-y">
            {classrooms.map((room) => (
              <li key={room.id} className="px-6 py-4 flex justify-between">
                <div>
                  <h3 className="font-medium">{room.roomId}</h3>
                  <p className="text-sm text-gray-500">Capacity: {room.capacity} • Type: {room.type}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => { setFormData({ roomId: room.roomId, capacity: room.capacity.toString(), type: room.type }); setEditingId(room.id); setShowForm(true); }} className="text-indigo-600">Edit</button>
                  <button onClick={() => handleDelete(room.id)} className="text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Classrooms;
