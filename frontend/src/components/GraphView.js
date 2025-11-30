import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Network,
  ZoomIn,
  ZoomOut,
  Maximize,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Layout
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom node component for requirements
const RequirementNode = ({ data, selected }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return '#6b7280';
      case 'In Review': return '#f59e0b';
      case 'Accepted': return '#10b981';
      case 'Implemented': return '#3b82f6';
      case 'Tested': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <div 
      className={`px-4 py-3 rounded-lg border-2 bg-white shadow-lg transition-all duration-200 min-w-[200px] ${
        selected ? 'border-blue-500 shadow-xl' : 'border-slate-200 hover:border-slate-300'
      }`}
      style={{ 
        borderLeftColor: getStatusColor(data.status),
        borderLeftWidth: '4px'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs font-mono">
          {data.req_id}
        </Badge>
        <Badge 
          variant="secondary" 
          className="text-xs"
          style={{ 
            backgroundColor: `${getStatusColor(data.status)}20`,
            color: getStatusColor(data.status)
          }}
        >
          {data.status}
        </Badge>
      </div>
      <div className="text-sm font-medium text-slate-900 mb-1 line-clamp-2">
        {data.title}
      </div>
      {data.verification_methods?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.verification_methods.map((method, idx) => (
            <span 
              key={idx}
              className="text-xs px-1 py-0.5 bg-slate-100 text-slate-600 rounded"
            >
              {method.charAt(0)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Define custom node types
const nodeTypes = {
  requirement: RequirementNode,
};

const GraphView = ({ activeProject, activeGroup, groups }) => {
  const [requirements, setRequirements] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [firstSelectedNode, setFirstSelectedNode] = useState(null);
  const [secondSelectedNode, setSecondSelectedNode] = useState(null);

  useEffect(() => {
    if (activeProject?.id) {
      fetchRequirements();
      // Initialize selected groups with active group
      if (activeGroup?.id) {
        setSelectedGroups([activeGroup.id]);
      }
    }
  }, [activeProject, activeGroup]);

  // Add keyboard event listeners for Ctrl key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Control' || event.key === 'Meta') {
        setIsCtrlPressed(true);
      }
      if (event.key === 'Delete' && firstSelectedNode) {
        // Handle edge deletion if an edge is selected
        handleDeleteSelectedEdge();
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Control' || event.key === 'Meta') {
        setIsCtrlPressed(false);
        setFirstSelectedNode(null);
        setSecondSelectedNode(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [firstSelectedNode]);

  useEffect(() => {
    if (requirements.length > 0) {
      generateGraphData();
    }
  }, [requirements, selectedGroups]);

  const fetchRequirements = async () => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/requirements?project_id=${activeProject.id}`);
      setRequirements(response.data);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      toast.error('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  };

  const generateGraphData = () => {
    // Filter requirements by selected groups
    const filteredRequirements = requirements.filter(req => {
      if (selectedGroups.length === 0) return true;
      return selectedGroups.includes(req.group_id);
    });

    console.log('Selected groups:', selectedGroups);
    console.log('Filtered requirements:', filteredRequirements.length);
    console.log('All requirements:', requirements.length);

    // Create nodes with selection highlighting
    const newNodes = filteredRequirements.map((req, index) => ({
      id: req.id,
      type: 'requirement',
      position: { 
        x: (index % 5) * 300 + Math.random() * 50, 
        y: Math.floor(index / 5) * 200 + Math.random() * 50 
      },
      data: {
        ...req,
        label: req.title,
      },
      selected: firstSelectedNode?.id === req.id,
      style: {
        border: firstSelectedNode?.id === req.id ? '3px solid #3b82f6' : undefined,
        boxShadow: firstSelectedNode?.id === req.id ? '0 0 10px rgba(59, 130, 246, 0.5)' : undefined,
      }
    }));

    // Create edges from parent-child relationships - FIXED VERSION
    const newEdges = [];
    filteredRequirements.forEach(req => {
      if (req.child_ids && req.child_ids.length > 0) {
        req.child_ids.forEach(childId => {
          // Only create edge if both parent and child are in filtered requirements
          const childVisible = filteredRequirements.some(r => r.id === childId);
          
          if (childVisible) {
            const edge = {
              id: `edge-${req.id}-${childId}`,
              source: req.id,
              target: childId,
              type: 'default',
              animated: false,
              style: { 
                stroke: '#10b981', 
                strokeWidth: 2 
              },
              markerEnd: {
                type: 'arrowclosed',
                color: '#10b981',
                width: 20,
                height: 20
              },
              label: '',
            };
            newEdges.push(edge);
            console.log('Created edge:', edge);
          }
        });
      }
    });

    console.log('Total edges created:', newEdges.length);
    console.log('All edges:', newEdges);

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node clicks for relationship creation
  const handleNodeClick = useCallback(async (event, node) => {
    if (!isCtrlPressed) return;

    if (!firstSelectedNode) {
      // First node selection
      setFirstSelectedNode(node);
      toast.info(`Selected parent: ${node.data.req_id}. Now select child requirement.`);
    } else if (firstSelectedNode.id !== node.id) {
      // Second node selection - create relationship
      setSecondSelectedNode(node);
      
      try {
        const relationshipData = {
          parent_id: firstSelectedNode.id,
          child_id: node.id
        };
        
        await axios.post(`${API}/requirements/relationships`, relationshipData);
        
        // Add the new edge to the graph
        const newEdge = {
          id: `${firstSelectedNode.id}-${node.id}`,
          source: firstSelectedNode.id,
          target: node.id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#10b981', strokeWidth: 3 },
          markerEnd: {
            type: 'arrowclosed',
            color: '#10b981',
          },
        };
        
        setEdges((eds) => [...eds, newEdge]);
        
        toast.success(`Created relationship: ${firstSelectedNode.data.req_id} → ${node.data.req_id}`);
        
        // Reset selection
        setFirstSelectedNode(null);
        setSecondSelectedNode(null);
        
        // Refresh requirements to get updated parent/child data
        await fetchRequirements();
        
      } catch (error) {
        console.error('Error creating relationship:', error);
        toast.error('Failed to create relationship');
        setFirstSelectedNode(null);
        setSecondSelectedNode(null);
      }
    }
  }, [isCtrlPressed, firstSelectedNode, setEdges]);

  // Handle edge deletion
  const handleDeleteSelectedEdge = async () => {
    // This would be called when user selects an edge and presses Delete
    // For now, we'll implement a simpler version
  };

  // Handle edge click for deletion
  const handleEdgeClick = useCallback((event, edge) => {
    if (event.key === 'Delete' || confirm('Delete this relationship?')) {
      deleteRelationship(edge.source, edge.target);
    }
  }, []);

  const deleteRelationship = async (parentId, childId) => {
    try {
      await axios.delete(`${API}/requirements/relationships/${parentId}/${childId}`);
      
      // Remove the edge from the graph
      setEdges((eds) => eds.filter(e => !(e.source === parentId && e.target === childId)));
      
      toast.success('Relationship deleted');
      
      // Refresh requirements to get updated parent/child data
      await fetchRequirements();
      
    } catch (error) {
      console.error('Error deleting relationship:', error);
      toast.error('Failed to delete relationship');
    }
  };

  const handleGroupSelection = (groupIds) => {
    setSelectedGroups(groupIds);
  };

  const fitView = () => {
    // This would normally use the ReactFlow instance fitView method
    toast.info('Fit view functionality would center all nodes');
  };

  const autoLayout = () => {
    // Simple auto-layout: arrange nodes in a grid
    const updatedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 6) * 280,
        y: Math.floor(index / 6) * 180,
      },
    }));
    setNodes(updatedNodes);
    toast.success('Auto-layout applied');
  };

  if (!activeProject) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <Network className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Project Selected</h3>
          <p className="text-slate-500">
            Please create or select a project from the sidebar to view the relationship graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex" data-testid="graph-view">
      {/* Sidebar Controls */}
      <div className="w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Graph Controls</h2>
        
        {/* Project Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-900">{activeProject.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {requirements.length} total requirements
            </p>
          </CardContent>
        </Card>

        {/* Group Selection */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Visible Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedGroups([])}
                className="flex-1"
                data-testid="show-all-groups"
              >
                <Eye className="h-4 w-4 mr-2" />
                All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedGroups([])}
                className="flex-1"
                data-testid="hide-all-groups"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                None
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
              {groups.map(group => (
                <label key={group.id} className="flex items-center space-x-2 text-sm cursor-pointer p-2 hover:bg-white rounded transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroups(prev => [...prev, group.id]);
                      } else {
                        setSelectedGroups(prev => prev.filter(id => id !== group.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-slate-700 font-medium">{group.name}</span>
                    <div className="text-xs text-slate-500">
                      {requirements.filter(req => req.group_id === group.id).length} requirements
                    </div>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getGroupColor(group.id) }}
                  />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* View Controls */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">View Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fitView}
              className="w-full"
              data-testid="fit-view-button"
            >
              <Maximize className="h-4 w-4 mr-2" />
              Fit to View
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={autoLayout}
              className="w-full"
              data-testid="auto-layout-button"
            >
              <Layout className="h-4 w-4 mr-2" />
              Auto Layout
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchRequirements}
              className="w-full"
              data-testid="refresh-graph-button"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <label className="flex items-center space-x-2 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={showMinimap}
                onChange={(e) => setShowMinimap(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">Show Minimap</span>
            </label>
          </CardContent>
        </Card>

        {/* Graph Statistics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Graph Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Visible Nodes:</span>
              <span className="font-medium" data-testid="visible-nodes-count">{nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Relationships:</span>
              <span className="font-medium" data-testid="edges-count">{edges.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Selected Groups:</span>
              <span className="font-medium">{selectedGroups.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graph Area */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading graph data...</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Network className="mx-auto h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No Requirements to Display</h3>
              <p className="text-slate-500">
                {selectedGroups.length === 0 
                  ? 'Create requirements or select groups to view the relationship graph.'
                  : 'The selected groups don\'t contain any requirements yet.'
                }
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-50"
          >
            <Controls className="bg-white shadow-lg border border-slate-200" />
            {showMinimap && (
              <MiniMap 
                className="bg-white border border-slate-200 shadow-lg"
                nodeColor="#3b82f6"
                maskColor="rgba(0, 0, 0, 0.1)"
              />
            )}
            <Background color="#e2e8f0" gap={16} />
            
            <Panel position="top-right" className="bg-white p-3 shadow-lg rounded-lg border border-slate-200">
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isCtrlPressed ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span>Hold Ctrl + Click to create relationships</span>
                </div>
                <div>Click arrow + Confirm to remove relationships</div>
                <div>Drag nodes to reposition</div>
                {firstSelectedNode && (
                  <div className="text-blue-600 font-medium">
                    Selected: {firstSelectedNode.data.req_id} → Select child
                  </div>
                )}
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default GraphView;