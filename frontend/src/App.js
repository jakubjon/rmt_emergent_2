import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import SideNavigation from './components/SideNavigation';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import DocumentView from './components/DocumentView';
import GraphView from './components/GraphView';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeProject, setActiveProject] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch projects
        const projectsResponse = await axios.get(`${API}/projects`);
        setProjects(projectsResponse.data);
        
        // Get active project
        const activeProjectResponse = await axios.get(`${API}/projects/active`);
        if (activeProjectResponse.data) {
          setActiveProject(activeProjectResponse.data);
          
          // Fetch groups for active project
          const groupsResponse = await axios.get(`${API}/groups?project_id=${activeProjectResponse.data.id}`);
          setGroups(groupsResponse.data);
          
          // Get active group
          const activeGroupResponse = await axios.get(`${API}/groups/active`);
          if (activeGroupResponse.data) {
            setActiveGroup(activeGroupResponse.data);
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const createProject = async (projectData) => {
    try {
      const response = await axios.post(`${API}/projects`, projectData);
      const newProject = response.data;
      setProjects(prev => [...prev, newProject]);
      setActiveProject(newProject);
      setGroups([]); // Reset groups when switching projects
      setActiveGroup(null);
      toast.success('Project created successfully');
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      throw error;
    }
  };

  const activateProject = async (projectId) => {
    try {
      await axios.put(`${API}/projects/${projectId}/activate`);
      const project = projects.find(p => p.id === projectId);
      setActiveProject(project);
      
      // Fetch groups for the activated project
      const groupsResponse = await axios.get(`${API}/groups?project_id=${projectId}`);
      setGroups(groupsResponse.data);
      setActiveGroup(null); // Reset active group
      
      toast.success('Project activated');
    } catch (error) {
      console.error('Error activating project:', error);
      toast.error('Failed to activate project');
    }
  };

  const createGroup = async (groupData) => {
    try {
      const response = await axios.post(`${API}/groups`, groupData);
      const newGroup = response.data;
      setGroups(prev => [...prev, newGroup]);
      setActiveGroup(newGroup);
      toast.success('Group created successfully');
      return newGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
      throw error;
    }
  };

  const activateGroup = async (groupId) => {
    try {
      await axios.put(`${API}/groups/${groupId}/activate`);
      const group = groups.find(g => g.id === groupId);
      setActiveGroup(group);
      toast.success('Group activated');
    } catch (error) {
      console.error('Error activating group:', error);
      toast.error('Failed to activate group');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading RequiMan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Router>
        <div className="flex h-screen">
          {/* Side Navigation */}
          <SideNavigation 
            activeProject={activeProject}
            activeGroup={activeGroup}
            projects={projects}
            groups={groups}
            currentView={currentView}
            setCurrentView={setCurrentView}
            onCreateProject={createProject}
            onActivateProject={activateProject}
            onCreateGroup={createGroup}
            onActivateGroup={activateGroup}
          />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard 
                    activeProject={activeProject} 
                    activeGroup={activeGroup}
                  />
                } 
              />
              <Route 
                path="/table" 
                element={
                  <TableView 
                    activeProject={activeProject} 
                    activeGroup={activeGroup}
                    groups={groups}
                  />
                } 
              />
              <Route 
                path="/document" 
                element={
                  <DocumentView 
                    activeProject={activeProject} 
                    activeGroup={activeGroup}
                  />
                } 
              />
              <Route 
                path="/graph" 
                element={
                  <GraphView 
                    activeProject={activeProject} 
                    activeGroup={activeGroup}
                    groups={groups}
                  />
                } 
              />
            </Routes>
          </div>
        </div>
      </Router>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
