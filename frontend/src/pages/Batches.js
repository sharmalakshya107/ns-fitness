import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Plus, Edit, Trash2, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    capacity: 30,
    description: ''
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/batches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched batches data:', data); // Debug log
        if (data.success && data.data && data.data.batches) {
          setBatches(data.data.batches);
          console.log('Batches set:', data.data.batches); // Debug log
        } else {
          console.error('Unexpected data structure:', data);
          setBatches([]);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch batches:', errorData);
        toast.error(errorData.message || 'Failed to fetch batches');
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      toast.error('Failed to fetch batches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/batches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Batch created successfully');
        setShowAddModal(false);
        resetForm();
        fetchBatches();
      } else {
        toast.error(data.message || 'Failed to create batch');
      }
    } catch (error) {
      console.error('Failed to create batch:', error);
      toast.error('Failed to create batch');
    }
  };

  const handleEditBatch = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/batches/${selectedBatch.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Batch updated successfully');
        setShowEditModal(false);
        setSelectedBatch(null);
        resetForm();
        fetchBatches();
      } else {
        toast.error(data.message || 'Failed to update batch');
      }
    } catch (error) {
      console.error('Failed to update batch:', error);
      toast.error('Failed to update batch');
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/batches/${batchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Batch deleted successfully');
        fetchBatches();
      } else {
        toast.error(data.message || 'Failed to delete batch');
      }
    } catch (error) {
      console.error('Failed to delete batch:', error);
      toast.error('Failed to delete batch');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startTime: '',
      endTime: '',
      capacity: 30,
      description: ''
    });
  };

  const openEditModal = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name,
      startTime: batch.start_time || batch.startTime,
      endTime: batch.end_time || batch.endTime,
      capacity: batch.capacity,
      description: batch.description || ''
    });
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage gym batches and timings
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Batch
        </button>
      </div>

      {/* Batches Grid */}
      {batches.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No batches</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new batch.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center mx-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Batch
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
          <div key={batch.id} className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{batch.name}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(batch)}
                  className="text-primary-600 hover:text-primary-900"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteBatch(batch.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  {batch.start_time || batch.startTime} - {batch.end_time || batch.endTime}
                </span>
              </div>
              
              <div className="flex items-center">
                <Users className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  {batch.currentMemberCount || 0} / {batch.capacity} members
                </span>
              </div>
              
              {batch.description && (
                <p className="text-sm text-gray-500">{batch.description}</p>
              )}
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((batch.currentMemberCount || 0) / batch.capacity) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Batch</h3>
              <form onSubmit={handleAddBatch} className="space-y-4">
                <div>
                  <label className="label">Batch Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Morning Batch"
                  />
                </div>
                <div>
                  <label className="label">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Batch description..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Batch
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Batch</h3>
              <form onSubmit={handleEditBatch} className="space-y-4">
                <div>
                  <label className="label">Batch Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="input-field"
                    rows="3"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedBatch(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Batch
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;
