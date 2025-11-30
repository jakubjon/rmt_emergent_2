import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TableView = ({ activeProject, activeGroup, groups }) => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
      fetchRequirements();
    }
  }, [activeProject, activeGroup]);

  useEffect(() => {
    // Filter requirements based on search query
    if (searchQuery) {
      const filtered = requirements.filter(req => 
        req.req_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRequirements(filtered);
    } else {
      setFilteredRequirements(requirements);
    }
  }, [requirements, searchQuery]);

  const fetchRequirements = async () => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      let url = `${API}/requirements?project_id=${activeProject.id}`;
      if (activeGroup?.id) {
        url += `&group_id=${activeGroup.id}`;
      }
      
      const response = await axios.get(url);
      setRequirements(response.data);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      toast.error('Failed to load requirements');
    } finally {
      setLoading(false);
    }
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
          <Button variant="outline" size="sm" data-testid="import-button">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" data-testid="export-button">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" data-testid="create-requirement-button">
            <Plus className="h-4 w-4 mr-2" />
            New Requirement
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
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
                        <Button size="sm" data-testid="empty-state-create-button">
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
                          data-testid={`view-requirement-${requirement.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`edit-requirement-${requirement.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
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