import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Move,
  Download,
  BookOpen,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentView = ({ activeProject, activeGroup, groups }) => {
  const [requirements, setRequirements] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [expandedChapters, setExpandedChapters] = useState({});

  useEffect(() => {
    if (activeProject?.id) {
      fetchData();
    }
  }, [activeProject, activeGroup]);

  const fetchData = async () => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      // Fetch requirements
      let reqUrl = `${API}/requirements?project_id=${activeProject.id}`;
      if (activeGroup?.id) {
        reqUrl += `&group_id=${activeGroup.id}`;
      }
      
      const [requirementsResponse, chaptersResponse] = await Promise.all([
        axios.get(reqUrl),
        activeGroup?.id ? axios.get(`${API}/chapters?group_id=${activeGroup.id}`) : Promise.resolve({ data: [] })
      ]);
      
      setRequirements(requirementsResponse.data);
      setChapters(chaptersResponse.data);
      
      // Initialize all chapters as expanded
      const expanded = {};
      chaptersResponse.data.forEach(chapter => {
        expanded[chapter.id] = true;
      });
      setExpandedChapters(expanded);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load document data');
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const toggleAllChapters = () => {
    const allExpanded = Object.values(expandedChapters).every(expanded => expanded);
    const newState = {};
    chapters.forEach(chapter => {
      newState[chapter.id] = !allExpanded;
    });
    setExpandedChapters(newState);
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

  const handleEditRequirement = (requirement) => {
    setEditingRequirement({ ...requirement });
    setShowEditDialog(true);
  };

  const handleUpdateRequirement = async () => {
    if (!editingRequirement?.title?.trim() || !editingRequirement?.text?.trim()) {
      toast.error('Please fill in both title and text');
      return;
    }

    try {
      const updatePayload = {
        title: editingRequirement.title,
        text: editingRequirement.text,
        status: editingRequirement.status,
        verification_methods: editingRequirement.verification_methods || [],
      };

      const response = await axios.put(
        `${API}/requirements/${editingRequirement.id}`,
        updatePayload
      );

      // Update local requirements state
      setRequirements((prev) =>
        prev.map((req) => (req.id === editingRequirement.id ? response.data : req))
      );

      setEditingRequirement(null);
      setShowEditDialog(false);
      toast.success('Requirement updated successfully');
    } catch (error) {
      console.error('Error updating requirement from DocumentView:', error);
      toast.error('Failed to update requirement');
    }
  };

  const groupRequirementsByChapter = () => {
    const grouped = {};
    
    // Initialize with chapters
    chapters.forEach(chapter => {
      grouped[chapter.id] = {
        chapter,
        requirements: []
      };
    });
    
    // Add requirements without chapters to a special group
    grouped['no-chapter'] = {
      chapter: { id: 'no-chapter', name: 'Unassigned Requirements', description: null },
      requirements: []
    };
    
    // Group requirements
    requirements.forEach(req => {
      const chapterId = req.chapter_id || 'no-chapter';
      if (grouped[chapterId]) {
        grouped[chapterId].requirements.push(req);
      }
    });
    
    return grouped;
  };

  if (!activeProject) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Project Selected</h3>
          <p className="text-slate-500">
            Please create or select a project from the sidebar to view the document.
          </p>
        </div>
      </div>
    );
  }

  const groupedRequirements = groupRequirementsByChapter();

  return (
    <div className="p-8 h-full overflow-auto" data-testid="document-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Document View</h1>
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleAllChapters}
            data-testid="toggle-all-chapters"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            {Object.values(expandedChapters).every(e => e) ? 'Collapse All' : 'Expand All'}
          </Button>
          <Button variant="outline" size="sm" data-testid="export-document">
            <Download className="h-4 w-4 mr-2" />
            Export Document
          </Button>
          <Button size="sm" data-testid="create-chapter-button">
            <Plus className="h-4 w-4 mr-2" />
            New Chapter
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(groupedRequirements).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <BookOpen className="h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Content Available</h3>
          <p className="text-slate-500 mb-6 text-center max-w-md">
            Create chapters and requirements to build your document structure.
          </p>
          <div className="flex items-center space-x-3">
            <Button variant="outline" data-testid="empty-create-chapter">
              <Plus className="h-4 w-4 mr-2" />
              Create Chapter
            </Button>
            <Button data-testid="empty-create-requirement">
              <Plus className="h-4 w-4 mr-2" />
              Create Requirement
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedRequirements).map(([chapterId, { chapter, requirements }]) => {
            if (requirements.length === 0 && chapterId === 'no-chapter') return null;
            
            return (
              <Card 
                key={chapterId} 
                className="document-chapter shadow-soft"
                data-testid={`chapter-${chapterId}`}
              >
                <Collapsible 
                  open={expandedChapters[chapterId]}
                  onOpenChange={() => toggleChapter(chapterId)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {expandedChapters[chapterId] ? 
                            <ChevronDown className="h-5 w-5 text-slate-500" /> :
                            <ChevronRight className="h-5 w-5 text-slate-500" />
                          }
                          <div>
                            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center">
                              <Hash className="h-5 w-5 text-blue-600 mr-2" />
                              {chapter.name}
                            </CardTitle>
                            {chapter.description && (
                              <p className="text-sm text-slate-600 mt-1">{chapter.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {requirements.length} requirements
                          </Badge>
                          {chapterId !== 'no-chapter' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit chapter
                              }}
                              data-testid={`edit-chapter-${chapterId}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {requirements.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p className="text-sm">No requirements in this chapter</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            data-testid={`add-requirement-${chapterId}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Requirement
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {requirements
                            .sort((a, b) => a.req_id?.localeCompare(b.req_id) || 0)
                            .map((requirement) => (
                            <div 
                              key={requirement.id} 
                              className="document-requirement border-l-2 border-slate-200 pl-6 py-4 hover:border-blue-300 transition-colors group"
                              data-testid={`requirement-${requirement.id}`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {requirement.req_id}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={getStatusBadgeClass(requirement.status)}
                                  >
                                    {requirement.status}
                                  </Badge>
                                  {requirement.verification_methods?.length > 0 && (
                                    <div className="flex space-x-1">
                                      {requirement.verification_methods.map((method, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {method}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    data-testid={`move-requirement-${requirement.id}`}
                                  >
                                    <Move className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditRequirement(requirement)}
                                    data-testid={`edit-requirement-${requirement.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                                {requirement.title}
                              </h3>
                              
                              <div className="prose prose-sm max-w-none text-slate-700">
                                <ReactMarkdown>{requirement.text}</ReactMarkdown>
                              </div>
                              
                              {(requirement.parent_ids?.length > 0 || requirement.child_ids?.length > 0) && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                  <div className="flex items-center space-x-6 text-xs text-slate-500">
                                    {requirement.parent_ids?.length > 0 && (
                                      <span>
                                        <strong>Parents:</strong> {requirement.parent_ids.length}
                                      </span>
                                    )}
                                    {requirement.child_ids?.length > 0 && (
                                      <span>
                                        <strong>Children:</strong> {requirement.child_ids.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Requirement Dialog */}
      {editingRequirement && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Edit Requirement - {editingRequirement.req_id}
              </h2>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setEditingRequirement(null);
                  setShowEditDialog(false);
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={editingRequirement.title}
                  onChange={(e) =>
                    setEditingRequirement((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  rows={4}
                  value={editingRequirement.text}
                  onChange={(e) =>
                    setEditingRequirement((prev) => ({ ...prev, text: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-48 border border-slate-300 rounded px-2 py-1 text-sm"
                  value={editingRequirement.status}
                  onChange={(e) =>
                    setEditingRequirement((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="Draft">Draft</option>
                  <option value="In Review">In Review</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Implemented">Implemented</option>
                  <option value="Tested">Tested</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Verification Methods</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {['Analysis', 'Review', 'Inspection', 'Test'].map((method) => (
                    <label key={method} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={editingRequirement.verification_methods?.includes(method)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditingRequirement((prev) => ({
                            ...prev,
                            verification_methods: checked
                              ? [...(prev.verification_methods || []), method]
                              : (prev.verification_methods || []).filter((m) => m !== method),
                          }));
                        }}
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateRequirement}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentView;