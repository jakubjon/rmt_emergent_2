import { useState, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function useRequirements() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRequirements = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const { projectId, groupId, chapterId, status } = filters;

      if (projectId) params.append('project_id', projectId);
      if (groupId) params.append('group_id', groupId);
      if (chapterId) params.append('chapter_id', chapterId);
      if (status) params.append('status', status);

      const url = `${API}/requirements?${params.toString()}`;
      const response = await axios.get(url);
      setRequirements(response.data || []);
    } catch (err) {
      console.error('Error loading requirements:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequirement = useCallback(async (payload) => {
    const response = await axios.post(`${API}/requirements`, payload);
    const created = response.data;
    setRequirements(prev => [created, ...prev]);
    return created;
  }, []);

  const updateRequirement = useCallback(async (id, payload) => {
    const response = await axios.put(`${API}/requirements/${id}`, payload);
    const updated = response.data;
    setRequirements(prev => prev.map(r => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const deleteRequirement = useCallback(async (id) => {
    await axios.delete(`${API}/requirements/${id}`);
    setRequirements(prev => prev.filter(r => r.id !== id));
  }, []);

  const fetchChangeLog = useCallback(async (id) => {
    const response = await axios.get(`${API}/requirements/${id}/changelog`);
    return response.data || [];
  }, []);

  return {
    requirements,
    loading,
    error,
    loadRequirements,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    fetchChangeLog,
    setRequirements,
  };
}
