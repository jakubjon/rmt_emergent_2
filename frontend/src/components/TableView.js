import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRequirements } from '../hooks/useRequirements';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  Table as TableIcon,
  FileText,
  Eye,
  Edit,
  Trash2,
  Clock,
  Users,
  Link
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TableView = ({ activeProject, activeGroup, groups }) => {
  const {
    requirements,
    loading,
    loadRequirements,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    fetchChangeLog,
    setRequirements,
  } = useRequirements();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [editRequirement, setEditRequirement] = useState(null);
  const [parentRequirements, setParentRequirements] = useState([]);
  const [childRequirements, setChildRequirements] = useState([]);
  const [changeLog, setChangeLog] = useState([]);
  const [newRequirement, setNewRequirement] = useState({
    title: '',
    text: '',
    status: 'Draft',
    verification_methods: [],
    group_id: '',
    chapter_id: ''
  });

  useEffect(() => {
    if (activeProject?.id) {
      loadRequirements({ projectId: activeProject.id, groupId: activeGroup?.id });
    }
  }, [activeProject, activeGroup, loadRequirements]);

  // Filter requirements based on search, status, and verification
  const filteredRequirements = requirements.filter((req) => {
    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesText =
        req.req_id?.toLowerCase().includes(query) ||
        req.title.toLowerCase().includes(query) ||
        req.text.toLowerCase().includes(query);
      if (!matchesText) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && req.status !== statusFilter) {
      return false;
    }

    // Verification filter
    if (
      verificationFilter !== 'ALL' &&
      !(req.verification_methods || []).includes(verificationFilter)
    ) {
      return false;
    }

    return true;
  });

  const allVisibleSelected =
    filteredRequirements.length > 0 &&
    filteredRequirements.every((req) => selectedIds.includes(req.id));

  // Legacy fetchRequirements kept for reference; data loading now handled via useRequirements.loadRequirements

  const handleCreateRequirement = async () => {
    if (!newRequirement.title.trim() || !newRequirement.text.trim()) {
      toast.error('Please fill in both title and text');
      return;
    }

    if (!activeProject?.id) {
      toast.error('No active project selected');
      return;
    }

    // Use active group or first available group
    const groupId = activeGroup?.id || groups[0]?.id;
    if (!groupId) {
      toast.error('Please create a group first');
      return;
    }

    try {
      const requirementData = {
        ...newRequirement,
        project_id: activeProject.id,
        group_id: groupId,
        verification_methods: newRequirement.verification_methods.filter(Boolean)
      };

      await createRequirement(requirementData);
      
      // Reset form
      setNewRequirement({
        title: '',
        text: '',
        status: 'Draft',
        verification_methods: [],
        group_id: '',
        chapter_id: ''
      });
      
      setShowCreateDialog(false);
      toast.success('Requirement created successfully!');
    } catch (error) {
      console.error('Error creating requirement:', error);
      toast.error('Failed to create requirement');
    }
  };

  const handleExport = () => {
    if (!requirements || requirements.length === 0) {
      toast.error('No requirements to export');
      return;
    }

    const headers = [
      'req_id',
      'title',
      'text',
      'status',
      'verification_methods',
      'project_id',
      'group_id',
      'chapter_id',
      'parent_ids',
      'child_ids',
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = requirements.map((req) => {
      const verification = (req.verification_methods || []).join('|');
      const parents = (req.parent_ids || []).join('|');
      const children = (req.child_ids || []).join('|');

      const values = [
        req.req_id || '',
        req.title || '',
        req.text || '',
        req.status || '',
        verification,
        req.project_id || '',
        req.group_id || '',
        req.chapter_id || '',
        parents,
        children,
      ];

      return values.map(escapeCsv).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `requirements-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!activeProject?.id) {
      toast.error('No active project selected for import');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          toast.error('Failed to read CSV file');
          return;
        }

        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) {
          toast.error('CSV file appears to be empty');
          return;
        }

        const [headerLine, ...dataLines] = lines;
        const headers = headerLine.split(',').map((h) => h.trim());

        const getIndex = (name) => headers.indexOf(name);
        const idxTitle = getIndex('title');
        const idxText = getIndex('text');
        const idxStatus = getIndex('status');
        const idxVerification = getIndex('verification_methods');
        const idxGroup = getIndex('group_id');
        const idxChapter = getIndex('chapter_id');

        if (idxTitle === -1) {
          toast.error('CSV must contain at least a "title" column');
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const line of dataLines) {
          if (!line.trim()) continue;
          const cols = line.split(',');
          const title = (cols[idxTitle] || '').replace(/^"|"$/g, '').trim();
          if (!title) {
            failCount++;
            continue;
          }

          const textValue = idxText !== -1 ? (cols[idxText] || '').replace(/^"|"$/g, '') : '';
          const statusValue = idxStatus !== -1 ? (cols[idxStatus] || 'Draft').replace(/^"|"$/g, '') : 'Draft';
          const verificationRaw = idxVerification !== -1 ? (cols[idxVerification] || '').replace(/^"|"$/g, '') : '';
          const groupIdValue =
            idxGroup !== -1 && cols[idxGroup]
              ? cols[idxGroup].replace(/^"|"$/g, '')
              : activeGroup?.id || groups[0]?.id;
          const chapterIdValue =
            idxChapter !== -1 && cols[idxChapter]
              ? cols[idxChapter].replace(/^"|"$/g, '')
              : undefined;

          if (!groupIdValue) {
            failCount++;
            continue;
          }

          const verificationMethods = verificationRaw
            ? verificationRaw.split('|').map((v) => v.trim()).filter(Boolean)
            : [];

          const payload = {
            title,
            text: textValue,
            status: statusValue || 'Draft',
            verification_methods: verificationMethods,
            project_id: activeProject.id,
            group_id: groupIdValue,
            chapter_id: chapterIdValue || undefined,
            parent_ids: [],
          };

          try {
            await createRequirement(payload);
            successCount++;
          } catch (err) {
            console.error('Error importing requirement row:', err);
            failCount++;
          }
        }

        toast.success(`Import finished: ${successCount} created, ${failCount} failed`);
      } catch (err) {
        console.error('Error processing import:', err);
        toast.error('Failed to import CSV file');
      }
    };

    reader.readAsText(file);
  };

  const handleVerificationMethodChange = (method, checked) => {
    setNewRequirement(prev => ({
      ...prev,
      verification_methods: checked 
        ? [...prev.verification_methods, method]
        : prev.verification_methods.filter(m => m !== method)
    }));
  };

  const handleViewRequirement = async (requirement) => {
    try {
      setSelectedRequirement(requirement);
      setShowViewDialog(true);
      
      // Fetch parent and child details if they exist
      const parentIds = requirement.parent_ids || [];
      const childIds = requirement.child_ids || [];
      
      if (parentIds.length === 0 && childIds.length === 0) {
        setParentRequirements([]);
        setChildRequirements([]);
        return;
      }
      
      const allRequests = [];
      
      // Fetch parent requirements
      parentIds.forEach(id => {
        allRequests.push(
          axios.get(`${API}/requirements/${id}`)
            .then(res => ({ type: 'parent', data: res.data }))
            .catch(err => ({ type: 'parent', error: err, id }))
        );
      });
      
      // Fetch child requirements  
      childIds.forEach(id => {
        allRequests.push(
          axios.get(`${API}/requirements/${id}`)
            .then(res => ({ type: 'child', data: res.data }))
            .catch(err => ({ type: 'child', error: err, id }))
        );
      });
      
      const results = await Promise.all(allRequests);
      
      const parentDetails = results
        .filter(r => r.type === 'parent' && r.data)
        .map(r => r.data);
      
      const childDetails = results
        .filter(r => r.type === 'child' && r.data)
        .map(r => r.data);
      
      setParentRequirements(parentDetails);
      setChildRequirements(childDetails);
      
      // Fetch change log via shared hook
      try {
        const logEntries = await fetchChangeLog(requirement.id);
        setChangeLog(logEntries);
      } catch (changeLogError) {
        console.error('Error fetching change log:', changeLogError);
        setChangeLog([]);
      }
      
    } catch (error) {
      console.error('Error in handleViewRequirement:', error);
      toast.error('Failed to load requirement details');
      setParentRequirements([]);
      setChildRequirements([]);
      setChangeLog([]);
    }
  };

  const handleEditRequirement = (requirement) => {
    setEditRequirement({
      ...requirement,
      verification_methods: requirement.verification_methods || []
    });
    setShowEditDialog(true);
  };

  const handleUpdateRequirement = async () => {
    if (!editRequirement.title.trim() || !editRequirement.text.trim()) {
      toast.error('Please fill in both title and text');
      return;
    }

    try {
      const updateData = {
        title: editRequirement.title,
        text: editRequirement.text,
        status: editRequirement.status,
        verification_methods: editRequirement.verification_methods.filter(Boolean)
      };

      await updateRequirement(editRequirement.id, updateData);
      
      setShowEditDialog(false);
      setEditRequirement(null);
      toast.success('Requirement updated successfully!');
    } catch (error) {
      console.error('Error updating requirement:', error);
      toast.error('Failed to update requirement');
    }
  };

  const handleDeleteRequirement = async (requirement) => {
    if (!confirm(`Are you sure you want to delete "${requirement.req_id}: ${requirement.title}"?\n\nThis will also remove all its relationships.`)) {
      return;
    }

    try {
      await deleteRequirement(requirement.id);
      
      toast.success('Requirement deleted successfully!');
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast.error('Failed to delete requirement');
    }
  };

  const handleEditVerificationMethodChange = (method, checked) => {
    setEditRequirement(prev => ({
      ...prev,
      verification_methods: checked 
        ? [...prev.verification_methods, method]
        : prev.verification_methods.filter(m => m !== method)
    }));
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'In Review': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Accepted': return 'bg-green-100 text-green-700 border-green-300';
      case 'Implemented': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Tested': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getVerificationBadgeClass = (method) => {
    switch (method) {
      case 'Analysis': return 'bg-orange-100 text-orange-700';
      case 'Review': return 'bg-indigo-100 text-indigo-700';
      case 'Inspection': return 'bg-teal-100 text-teal-700';
      case 'Test': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <TableIcon className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Project Selected</h3>
          <p className="text-slate-500">
            Please create or select a project from the sidebar to view requirements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-auto" data-testid="table-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Table View</h1>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-slate-600">{activeProject.name}</p>
            {activeGroup && (
              <>
                <span className="text-slate-400">•</span>
                <Badge variant="outline">{activeGroup.name}</Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept=".csv"
            id="requirements-import-input"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            data-testid="import-button"
            onClick={() => {
              const input = document.getElementById('requirements-import-input');
              if (input) {
                input.value = '';
                input.click();
              }
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="export-button"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="create-requirement-button">
                <Plus className="h-4 w-4 mr-2" />
                New Requirement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Requirement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="req-title">Title *</Label>
                  <Input
                    id="req-title"
                    value={newRequirement.title}
                    onChange={(e) => setNewRequirement(prev => ({...prev, title: e.target.value}))}
                    placeholder="Enter requirement title"
                    data-testid="requirement-title-input"
                  />
                </div>
                
                <div>
                  <Label htmlFor="req-text">Description *</Label>
                  <Textarea
                    id="req-text"
                    value={newRequirement.text}
                    onChange={(e) => setNewRequirement(prev => ({...prev, text: e.target.value}))}
                    placeholder="Enter detailed requirement description (supports Markdown)"
                    rows={4}
                    data-testid="requirement-text-input"
                  />
                </div>

                <div>
                  <Label htmlFor="req-status">Status</Label>
                  <Select 
                    value={newRequirement.status} 
                    onValueChange={(value) => setNewRequirement(prev => ({...prev, status: value}))}
                  >
                    <SelectTrigger data-testid="requirement-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                      <SelectItem value="Implemented">Implemented</SelectItem>
                      <SelectItem value="Tested">Tested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Verification Methods</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['Analysis', 'Review', 'Inspection', 'Test'].map(method => (
                      <label key={method} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newRequirement.verification_methods.includes(method)}
                          onChange={(e) => handleVerificationMethodChange(method, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>Project: {activeProject?.name}</span>
                  <span>Group: {activeGroup?.name || groups[0]?.name || 'Default'}</span>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="cancel-requirement-button"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateRequirement}
                    data-testid="submit-requirement-button"
                  >
                    Create Requirement
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* View Requirement Dialog */}
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-3">
                  <Badge variant="outline" className="font-mono">
                    {selectedRequirement?.req_id}
                  </Badge>
                  <span>{selectedRequirement?.title}</span>
                </DialogTitle>
              </DialogHeader>
              
              {selectedRequirement && (
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="relationships">Relationships</TabsTrigger>
                    <TabsTrigger value="history">Change Log</TabsTrigger>
                    <TabsTrigger value="verification">Verification</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Status</Label>
                      <div className="mt-1">
                        <Badge className={getStatusBadgeClass(selectedRequirement.status)}>
                          {selectedRequirement.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Description</Label>
                      <div className="mt-2 p-4 bg-slate-50 rounded-lg">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>
                            {selectedRequirement.text || 'No description provided'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Created</Label>
                        <div className="mt-1 flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {selectedRequirement.created_at ? 
                              new Date(selectedRequirement.created_at).toLocaleDateString() : 
                              'Unknown'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Last Updated</Label>
                        <div className="mt-1 flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {selectedRequirement.updated_at ? 
                              new Date(selectedRequirement.updated_at).toLocaleDateString() : 
                              'Unknown'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="relationships" className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Link className="h-4 w-4 text-blue-600" />
                          <Label className="font-medium">Parent Requirements</Label>
                          <Badge variant="secondary">{parentRequirements.length}</Badge>
                        </div>
                        
                        {parentRequirements.length === 0 ? (
                          <p className="text-sm text-slate-500 italic">No parent requirements</p>
                        ) : (
                          <div className="space-y-2">
                            {parentRequirements.map(parent => (
                              <Card key={parent.id} className="p-3 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Badge variant="outline" className="text-xs mb-1">
                                      {parent.req_id}
                                    </Badge>
                                    <p className="font-medium text-sm">{parent.title}</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">
                                      {parent.text}
                                    </p>
                                  </div>
                                  <Badge className={getStatusBadgeClass(parent.status)}>
                                    {parent.status}
                                  </Badge>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Link className="h-4 w-4 text-green-600" />
                          <Label className="font-medium">Child Requirements</Label>
                          <Badge variant="secondary">{childRequirements.length}</Badge>
                        </div>
                        
                        {childRequirements.length === 0 ? (
                          <p className="text-sm text-slate-500 italic">No child requirements</p>
                        ) : (
                          <div className="space-y-2">
                            {childRequirements.map(child => (
                              <Card key={child.id} className="p-3 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Badge variant="outline" className="text-xs mb-1">
                                      {child.req_id}
                                    </Badge>
                                    <p className="font-medium text-sm">{child.title}</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">
                                      {child.text}
                                    </p>
                                  </div>
                                  <Badge className={getStatusBadgeClass(child.status)}>
                                    {child.status}
                                  </Badge>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="space-y-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-slate-600" />
                          <Label className="font-medium">Complete Change History</Label>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {changeLog.length} changes
                        </Badge>
                      </div>
                      
                      {changeLog.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">No change history available</p>
                          <p className="text-xs text-slate-400 mt-1">Changes will appear here as the requirement is modified</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {changeLog.map((change, index) => {
                            const getChangeIcon = (changeType) => {
                              switch (changeType) {
                                case 'created': return { icon: '✨', color: 'bg-green-500' };
                                case 'updated': return { icon: '✏️', color: 'bg-blue-500' };
                                case 'relationship_added': return { icon: '🔗', color: 'bg-purple-500' };
                                case 'relationship_removed': return { icon: '💔', color: 'bg-red-500' };
                                default: return { icon: '📝', color: 'bg-gray-500' };
                              }
                            };
                            
                            const changeDisplay = getChangeIcon(change.change_type);
                            
                            return (
                              <div key={change.id || index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className={`w-8 h-8 ${changeDisplay.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                  {changeDisplay.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-sm text-slate-900 capitalize">
                                      {change.change_type.replace('_', ' ')}
                                    </p>
                                    <span className="text-xs text-slate-500 flex-shrink-0">
                                      {new Date(change.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  <p className="text-xs text-slate-600 mb-2">
                                    {change.change_description}
                                  </p>
                                  
                                  {change.field_name && change.old_value && change.new_value && (
                                    <div className="text-xs bg-white p-2 rounded border-l-2 border-blue-200">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className="font-medium text-slate-700">Field:</span>
                                        <code className="bg-slate-100 px-1 rounded">{change.field_name}</code>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-red-600 font-medium">Before:</span>
                                          <div className="bg-red-50 p-1 rounded mt-1 text-red-800">
                                            {change.old_value}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-green-600 font-medium">After:</span>
                                          <div className="bg-green-50 p-1 rounded mt-1 text-green-800">
                                            {change.new_value}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {change.changed_by && (
                                    <div className="flex items-center space-x-1 mt-2">
                                      <Users className="h-3 w-3 text-slate-400" />
                                      <span className="text-xs text-slate-500">by {change.changed_by}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="verification" className="space-y-4">
                    <div>
                      <Label className="font-medium mb-3 block">Verification Methods</Label>
                      
                      {selectedRequirement.verification_methods?.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No verification methods assigned</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {['Analysis', 'Review', 'Inspection', 'Test'].map(method => (
                            <Card 
                              key={method} 
                              className={`p-4 ${
                                selectedRequirement.verification_methods?.includes(method) 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div 
                                  className={`w-3 h-3 rounded-full ${
                                    selectedRequirement.verification_methods?.includes(method)
                                      ? 'bg-green-500' 
                                      : 'bg-slate-300'
                                  }`}
                                />
                                <span className="font-medium text-sm">{method}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-2">
                                {selectedRequirement.verification_methods?.includes(method)
                                  ? 'Applied to this requirement'
                                  : 'Not applied'
                                }
                              </p>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
              
              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Requirement Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Requirement - {editRequirement?.req_id}</DialogTitle>
              </DialogHeader>
              
              {editRequirement && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title">Title *</Label>
                    <Input
                      id="edit-title"
                      value={editRequirement.title}
                      onChange={(e) => setEditRequirement(prev => ({...prev, title: e.target.value}))}
                      data-testid="edit-requirement-title-input"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-text">Description *</Label>
                    <Textarea
                      id="edit-text"
                      value={editRequirement.text}
                      onChange={(e) => setEditRequirement(prev => ({...prev, text: e.target.value}))}
                      rows={4}
                      data-testid="edit-requirement-text-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select 
                      value={editRequirement.status} 
                      onValueChange={(value) => setEditRequirement(prev => ({...prev, status: value}))}
                    >
                      <SelectTrigger data-testid="edit-requirement-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="In Review">In Review</SelectItem>
                        <SelectItem value="Accepted">Accepted</SelectItem>
                        <SelectItem value="Implemented">Implemented</SelectItem>
                        <SelectItem value="Tested">Tested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Verification Methods</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {['Analysis', 'Review', 'Inspection', 'Test'].map(method => (
                        <label key={method} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editRequirement.verification_methods.includes(method)}
                            onChange={(e) => handleEditVerificationMethodChange(method, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEditDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateRequirement}
                      data-testid="update-requirement-button"
                    >
                      Update Requirement
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="text-sm text-blue-900">
            <span className="font-medium">{selectedIds.length}</span> requirement(s) selected
          </div>
          <div className="flex items-center space-x-2">
            <Select
              onValueChange={async (value) => {
                if (value === 'NO_CHANGE') return;
                try {
                  const payload = {
                    requirement_ids: selectedIds,
                    update: { status: value },
                  };
                  await axios.put(`${API}/requirements/batch`, payload);
                  // Refresh list
                  if (activeProject?.id) {
                    await loadRequirements({ projectId: activeProject.id, groupId: activeGroup?.id });
                  }
                  toast.success(`Status updated for ${selectedIds.length} requirement(s)`);
                } catch (err) {
                  console.error('Batch update failed', err);
                  toast.error('Failed to batch update requirements');
                }
              }}
            >
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="Batch set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO_CHANGE">Batch set status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="In Review">In Review</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Implemented">Implemented</SelectItem>
                <SelectItem value="Tested">Tested</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(`Delete ${selectedIds.length} selected requirement(s)? This cannot be undone.`)) {
                  return;
                }
                try {
                  for (const id of selectedIds) {
                    const req = requirements.find((r) => r.id === id);
                    if (req) {
                      await deleteRequirement(req.id);
                    }
                  }
                  setSelectedIds([]);
                  toast.success('Selected requirements deleted');
                } catch (err) {
                  console.error('Batch delete failed', err);
                  toast.error('Failed to delete some requirements');
                }
              }}
            >
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search requirements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          {/* Simple Status filter to support batch update use cases */}
          <div className="flex items-center space-x-2">
            <Label className="text-xs text-slate-500">Status</Label>
            <Select
              onValueChange={(value) => {
                // Inline filter: delegate to search + status combination by updating searchQuery and letting backend keep full list
                // For now, we just append status text to the search to keep behavior simple.
                if (value === 'ALL') {
                  setSearchQuery('');
                } else {
                  setSearchQuery(value);
                }
              }}
              defaultValue="ALL"
            >
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="In Review">In Review</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Implemented">Implemented</SelectItem>
                <SelectItem value="Tested">Tested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Requirements Table */}
      <Card className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={allVisibleSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredRequirements.map((req) => req.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Parents
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Children
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-8"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-8"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-200 rounded w-24"></div></td>
                  </tr>
                ))
              ) : filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-slate-300 mb-4" />
                      <h3 className="text-lg font-medium text-slate-600 mb-2">
                        {searchQuery ? 'No requirements found' : 'No requirements yet'}
                      </h3>
                      <p className="text-slate-500 mb-4">
                        {searchQuery 
                          ? 'Try adjusting your search query.'
                          : 'Get started by creating your first requirement.'
                        }
                      </p>
                      {!searchQuery && (
                        <Button 
                          size="sm" 
                          onClick={() => setShowCreateDialog(true)}
                          data-testid="empty-state-create-button"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Requirement
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequirements.map((requirement) => (
                  <tr 
                    key={requirement.id} 
                    className="table-row hover:bg-slate-50 transition-colors"
                    data-testid={`requirement-row-${requirement.id}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(requirement.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) => [...prev, requirement.id]);
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== requirement.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {requirement.req_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div className="max-w-xs">
                        <p className="font-medium text-overflow" title={requirement.title}>
                          {requirement.title}
                        </p>
                        <p className="text-slate-500 text-xs multiline-overflow mt-1" title={requirement.text}>
                          {requirement.text}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant="outline" 
                        className={getStatusBadgeClass(requirement.status)}
                      >
                        {requirement.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {requirement.verification_methods?.map((method, index) => (
                          <Badge 
                            key={index}
                            variant="secondary"
                            className={`text-xs ${getVerificationBadgeClass(method)}`}
                          >
                            {method.charAt(0)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                      {requirement.parent_ids?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                      {requirement.child_ids?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewRequirement(requirement)}
                          data-testid={`view-requirement-${requirement.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditRequirement(requirement)}
                          data-testid={`edit-requirement-${requirement.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteRequirement(requirement)}
                          data-testid={`delete-requirement-${requirement.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default TableView;