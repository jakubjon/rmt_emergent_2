import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  User,
  LogOut,
  Settings,
  FolderPlus,
  Folder,
  Plus,
  LayoutDashboard,
  Table,
  FileText,
  Network,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
const SectionHeader = ({ section, title, children, expandedSections, toggleSection }) => (
  <div className="mb-4">
    <button
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full p-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
      data-testid={`section-${section}-toggle`}
    >
      <span>{title}</span>
      {expandedSections[section] ? 
        <ChevronDown className="h-4 w-4" /> : 
        <ChevronRight className="h-4 w-4" />
      }
    </button>
    {expandedSections[section] && children}
  </div>
);



const SideNavigation = ({ 
  activeProject, 
  activeGroup, 
  projects, 
  groups, 
  currentView, 
  setCurrentView,
  onCreateProject,
  onActivateProject,
  onCreateGroup,
  onActivateGroup
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    user: true,
    admin: false,
    project: true,
    group: true,
    system: true,
    requirements: true
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      await onCreateProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined
      });
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateProject(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !activeProject) return;
    
    try {
      await onCreateGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        project_id: activeProject.id
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateGroup(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    navigate(`/${view}`);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="w-80 bg-white border-r border-slate-200 h-screen overflow-y-auto shadow-lg">
      <div className="p-6">
        {/* App Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold gradient-text" data-testid="app-title">
            RequiMan
          </h1>
          <p className="text-sm text-slate-500">Requirement Management</p>
        </div>

        {/* User Section */}
        <SectionHeader section="user" title="User" expandedSections={expandedSections} toggleSection={toggleSection}>
          <div className="space-y-2 ml-2">
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50">
              <User className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium" data-testid="current-user">Current User</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start"
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </SectionHeader>

        {/* Admin Section */}
        <SectionHeader section="admin" title="Admin" expandedSections={expandedSections} toggleSection={toggleSection}>
          <div className="space-y-2 ml-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start"
              data-testid="admin-view-button"
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin View
            </Button>
          </div>
        </SectionHeader>

        <Separator className="my-6" />

        {/* Project Section */}
        <SectionHeader section="project" title="Project">
          <div className="space-y-3 ml-2">
            {activeProject && (
              <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900" data-testid="active-project-name">
                      {activeProject.name}
                    </p>
                    <p className="text-sm text-blue-600">Active Project</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Active
                  </Badge>
                </div>
                {activeProject.description && (
                  <p className="text-sm text-blue-700 mt-2">
                    {activeProject.description}
                  </p>
                )}
              </div>
            )}
            
            <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid="create-project-button"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                      data-testid="project-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-description">Description (Optional)</Label>
                    <Input
                      id="project-description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                      data-testid="project-description-input"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateProject(false)}
                      data-testid="cancel-project-button"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateProject}
                      data-testid="submit-create-project-button"
                    >
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {projects.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-500">Switch Project</Label>
                <Select 
                  value={activeProject?.id || ''} 
                  onValueChange={onActivateProject}
                >
                  <SelectTrigger className="w-full" data-testid="project-selector">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center space-x-2">
                          <Folder className="h-4 w-4" />
                          <span>{project.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </SectionHeader>

        {/* Group Section */}
        <SectionHeader section="group" title="Group">
          <div className="space-y-3 ml-2">
            {activeGroup && (
              <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900" data-testid="active-group-name">
                      {activeGroup.name}
                    </p>
                    <p className="text-sm text-green-600">Active Group</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
                {activeGroup.description && (
                  <p className="text-sm text-green-700 mt-2">
                    {activeGroup.description}
                  </p>
                )}
              </div>
            )}
            
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  disabled={!activeProject}
                  data-testid="create-group-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="group-name">Group Name</Label>
                    <Input
                      id="group-name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name"
                      data-testid="group-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="group-description">Description (Optional)</Label>
                    <Input
                      id="group-description"
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Enter group description"
                      data-testid="group-description-input"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateGroup(false)}
                      data-testid="cancel-group-button"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateGroup}
                      data-testid="submit-create-group-button"
                    >
                      Create Group
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {groups.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-500">Switch Group</Label>
                <Select 
                  value={activeGroup?.id || ''} 
                  onValueChange={onActivateGroup}
                >
                  <SelectTrigger className="w-full" data-testid="group-selector">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center space-x-2">
                          <Folder className="h-4 w-4" />
                          <span>{group.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </SectionHeader>

        <Separator className="my-6" />

        {/* System Architecture Section */}
        <SectionHeader section="system" title="System Architecture">
          <div className="ml-2">
            <Button 
              variant={currentView === 'graph' ? 'default' : 'ghost'}
              size="sm" 
              className="w-full justify-start"
              onClick={() => handleViewChange('graph')}
              data-testid="graph-view-button"
            >
              <Network className="h-4 w-4 mr-2" />
              Graph View
            </Button>
          </div>
        </SectionHeader>

        {/* Requirement Management Section */}
        <SectionHeader section="requirements" title="Requirement Management">
          <div className="space-y-2 ml-2">
            <Button 
              variant={currentView === 'dashboard' ? 'default' : 'ghost'}
              size="sm" 
              className="w-full justify-start"
              onClick={() => handleViewChange('dashboard')}
              data-testid="dashboard-view-button"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button 
              variant={currentView === 'table' ? 'default' : 'ghost'}
              size="sm" 
              className="w-full justify-start"
              onClick={() => handleViewChange('table')}
              data-testid="table-view-button"
            >
              <Table className="h-4 w-4 mr-2" />
              Table View
            </Button>
            <Button 
              variant={currentView === 'document' ? 'default' : 'ghost'}
              size="sm" 
              className="w-full justify-start"
              onClick={() => handleViewChange('document')}
              data-testid="document-view-button"
            >
              <FileText className="h-4 w-4 mr-2" />
              Document View
            </Button>
          </div>
        </SectionHeader>
      </div>
    </div>
  );
};

export default SideNavigation;