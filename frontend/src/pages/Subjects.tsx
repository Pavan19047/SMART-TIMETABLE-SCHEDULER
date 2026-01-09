import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Subjects: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
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

  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartment(deptId);
    setSelectedSemester(null); // Reset semester when department changes
  };

  const handleSemesterClick = (semester: number) => {
    setSelectedSemester(semester);
    setShowForm(false); // Hide form when switching semesters
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subjects', { 
        ...formData, 
        departmentId: selectedDepartment,
        semester: selectedSemester,
        weeklyClassesRequired: parseInt(formData.weeklyClassesRequired),
        courseDurationWeeks: parseInt(formData.courseDurationWeeks),
        totalHoursRequired: parseInt(formData.totalHoursRequired)
      });
      setFormData({ name: '', code: '', weeklyClassesRequired: '3', courseDurationWeeks: '16', totalHoursRequired: '48' });
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

  // Always show all 8 semesters when department is selected
  const allSemesters = [1, 2, 3, 4, 5, 6, 7, 8];

  // Get count of subjects per semester for badge display
  const getSubjectCount = (semester: number) => {
    return subjects.filter(s => s.departmentId === selectedDepartment && s.semester === semester).length;
  };

  const filteredSubjects = subjects.filter(sub => {
    if (!selectedDepartment) return false;
    if (selectedSemester === null) return false;
    return sub.departmentId === selectedDepartment && sub.semester === selectedSemester;
  });



  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Subjects</h1>
        <p className="text-gray-600 mt-2">View subjects by selecting a branch and semester</p>
      </div>

      {/* Step 1: Branch Selection */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Step 1: Select Branch</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => handleDepartmentChange(dept.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedDepartment === dept.id
                  ? 'border-indigo-600 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:border-indigo-300 hover:shadow'
              }`}
            >
              <h3 className="font-semibold text-lg">{dept.code}</h3>
              <p className="text-sm text-gray-600">{dept.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Semester Selection - Always show all 8 semesters */}
      {selectedDepartment && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Step 2: Select Semester</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {allSemesters.map(sem => {
              const subjectCount = getSubjectCount(sem);
              return (
                <button
                  key={sem}
                  onClick={() => handleSemesterClick(sem)}
                  className={`p-4 rounded-lg border-2 transition-all text-center relative ${
                    selectedSemester === sem
                      ? 'border-indigo-600 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow'
                  }`}
                >
                  <div className="text-2xl font-bold text-indigo-600">{sem}</div>
                  <div className="text-xs text-gray-600">Semester</div>
                  {subjectCount > 0 && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {subjectCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Display Subjects */}
      {selectedSemester !== null && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Subjects - Semester {selectedSemester}
            </h2>
            {user?.role === 'ADMIN' && (
              <button 
                onClick={() => setShowForm(!showForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                {showForm ? 'Cancel' : '+ Add Subject'}
              </button>
            )}
          </div>

          {/* Add Subject Form */}
          {showForm && user?.role === 'ADMIN' && (
            <div className="mb-6 border border-indigo-200 rounded-lg p-6 bg-indigo-50">
              <h3 className="text-md font-semibold mb-4">Add New Subject</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject Name</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      placeholder="e.g., Data Structures"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject Code</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2" 
                      value={formData.code} 
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                      placeholder="e.g., CSE301"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Weekly Classes</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="10" 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2" 
                      value={formData.weeklyClassesRequired} 
                      onChange={(e) => setFormData({ ...formData, weeklyClassesRequired: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (Weeks)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20" 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2" 
                      value={formData.courseDurationWeeks} 
                      onChange={(e) => setFormData({ ...formData, courseDurationWeeks: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Hours</label>
                    <input 
                      type="number" 
                      min="1" 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2" 
                      value={formData.totalHoursRequired} 
                      onChange={(e) => setFormData({ ...formData, totalHoursRequired: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button 
                    type="submit" 
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Add Subject
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    className="bg-gray-300 px-6 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {filteredSubjects.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {user?.role === 'ADMIN' 
                ? 'No subjects found for this semester. Click "Add Subject" to add one.'
                : 'No subjects found for this semester. Please contact admin to add subjects.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubjects.map((sub) => (
                <div key={sub.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-indigo-900">{sub.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">Code: {sub.code}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                          📅 {sub.weeklyClassesRequired} classes/week
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800">
                          ⏱️ {sub.courseDurationWeeks || 16} weeks
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                          🎯 {sub.totalHoursRequired || (sub.weeklyClassesRequired * 16)} total hours
                        </span>
                      </div>
                      {sub.conceptsCovered && sub.conceptsCovered.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Course Topics:</p>
                          <div className="flex flex-wrap gap-2">
                            {sub.conceptsCovered.map((c: any, i: number) => (
                              <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                                {c.topic} <span className="text-gray-500">({c.estimatedHours}h)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {user?.role === 'ADMIN' && (
                      <button 
                        onClick={() => handleDelete(sub.id)} 
                        className="text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-300 hover:bg-red-50 ml-4"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Subjects;