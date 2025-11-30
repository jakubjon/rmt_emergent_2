import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  BarChart3, 
  FileText, 
  CheckCircle, 
  Clock, 
  Users, 
  AlertCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ activeProject, activeGroup, groups }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeProject?.id) {
      fetchDashboardStats();
    }
  }, [activeProject]);

  const fetchDashboardStats = async () => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/dashboard/stats?project_id=${activeProject.id}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500';
      case 'In Review': return 'bg-yellow-500';
      case 'Accepted': return 'bg-green-500';
      case 'Implemented': return 'bg-blue-500';
      case 'Tested': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'Draft': return 'text-gray-700';
      case 'In Review': return 'text-yellow-700';
      case 'Accepted': return 'text-green-700';
      case 'Implemented': return 'text-blue-700';
      case 'Tested': return 'text-purple-700';
      default: return 'text-gray-700';
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Project Selected</h3>
          <p className="text-slate-500">
            Please create or select a project from the sidebar to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 h-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600">{activeProject.name}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-auto" data-testid="dashboard-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" data-testid="dashboard-title">
            Dashboard
          </h1>
          <div className="flex items-center space-x-2 mt-2">
            <p className="text-slate-600" data-testid="project-name">
              {activeProject.name}
            </p>
            {activeGroup && (
              <>
                <span className="text-slate-400">•</span>
                <Badge variant="outline" data-testid="active-group">
                  {activeGroup.name}
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            <BarChart3 className="h-3 w-3 mr-1" />
            Analytics
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Requirements */}
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Requirements
            </CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900" data-testid="total-requirements">
              {stats?.total_requirements || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active in this project
            </p>
          </CardContent>
        </Card>

        {/* Children Assignment */}
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Children Assignment
            </CardTitle>
            <Target className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900" data-testid="children-percentage">
              {stats?.children_assignment_percentage || 0}%
            </div>
            <Progress 
              value={stats?.children_assignment_percentage || 0} 
              className="mt-2 h-2" 
            />
            <p className="text-xs text-slate-500 mt-1">
              Requirements with children
            </p>
          </CardContent>
        </Card>

        {/* Verification Methods */}
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Verification Coverage
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900" data-testid="verification-percentage">
              {stats?.verification_methods_percentage || 0}%
            </div>
            <Progress 
              value={stats?.verification_methods_percentage || 0} 
              className="mt-2 h-2" 
            />
            <p className="text-xs text-slate-500 mt-1">
              Requirements with verification
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.status_percentages ? 
                Math.round((stats.status_percentages['Implemented'] || 0) + (stats.status_percentages['Tested'] || 0)) : 0}%
            </div>
            <Progress 
              value={stats?.status_percentages ? 
                Math.round((stats.status_percentages['Implemented'] || 0) + (stats.status_percentages['Tested'] || 0)) : 0} 
              className="mt-2 h-2" 
            />
            <p className="text-xs text-slate-500 mt-1">
              Implemented + Tested
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Requirements Status Breakdown */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Requirements Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.status_percentages && Object.entries(stats.status_percentages).map(([status, percentage]) => (
              <div key={status} className="flex items-center justify-between" data-testid={`status-${status.toLowerCase().replace(' ', '-')}`}>
                <div className="flex items-center space-x-3">
                  <div 
                    className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}
                  />
                  <span className={`font-medium ${getStatusTextColor(status)}`}>
                    {status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getStatusColor(status)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-600 w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions & Insights */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Project Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {stats?.total_requirements === 0 ? (
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-blue-700">
                    <strong>Get Started:</strong> Create your first requirement to begin managing your project.
                  </p>
                </div>
              ) : (
                <>
                  {stats?.status_percentages?.['Draft'] > 50 && (
                    <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                      <p className="text-sm text-amber-700">
                        <strong>Action Needed:</strong> {Math.round(stats.status_percentages['Draft'])}% of requirements are still in draft. Consider reviewing and updating statuses.
                      </p>
                    </div>
                  )}
                  
                  {stats?.verification_methods_percentage < 30 && (
                    <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                      <p className="text-sm text-red-700">
                        <strong>Low Coverage:</strong> Only {stats.verification_methods_percentage}% of requirements have verification methods assigned.
                      </p>
                    </div>
                  )}
                  
                  {stats?.children_assignment_percentage > 80 && (
                    <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <p className="text-sm text-green-700">
                        <strong>Great Progress:</strong> {stats.children_assignment_percentage}% of requirements have child relationships defined.
                      </p>
                    </div>
                  )}
                  
                  {(stats?.status_percentages?.['Implemented'] || 0) + (stats?.status_percentages?.['Tested'] || 0) > 75 && (
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-blue-700">
                        <strong>Excellent:</strong> Your project is {Math.round((stats.status_percentages['Implemented'] || 0) + (stats.status_percentages['Tested'] || 0))}% complete!
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;