import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getLiveCalls, getStats } from '@/lib/api';
import { toast } from 'sonner';
import { Activity, RefreshCw, Phone, Clock, Globe, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const LiveMonitor = () => {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({ total_calls: 0, active_calls: 0, completed_calls: 0, demo_intents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [callsRes, statsRes] = await Promise.all([getLiveCalls(), getStats()]);
      setCalls(callsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch live calls:', error);
      toast.error('Failed to fetch live data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => fetchData(), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const languageLabels = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div data-testid="live-monitor-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Live Call Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time view of active calls (read-only)</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          data-testid="refresh-btn"
        >
          <RefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} size={14} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm" data-testid="stat-active-calls">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Active Calls</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.active_calls}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="text-green-600" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm" data-testid="stat-total-calls">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Calls</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total_calls}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Phone className="text-blue-600" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm" data-testid="stat-completed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.completed_calls}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="text-gray-600" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm" data-testid="stat-demo-intents">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Demo Intents</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.demo_intents}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="text-purple-600" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Calls List */}
      <Card className="shadow-sm" data-testid="live-calls-card">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Active Calls
                {calls.length > 0 && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </CardTitle>
              <CardDescription>Live calls currently in progress</CardDescription>
            </div>
            <Badge variant="outline">{calls.length} active</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {calls.length === 0 ? (
            <div className="text-center py-12 text-gray-400" data-testid="no-active-calls">
              <Phone className="mx-auto mb-3 opacity-50" size={32} />
              <p className="text-sm">No active calls at the moment</p>
              <p className="text-xs mt-1">Calls will appear here in real-time</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                  data-testid={`call-item-${call.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Phone className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Session {call.session_id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-500">
                          Started {formatDistanceToNow(new Date(call.start_time), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={`state-${call.fsm_state}`} data-testid={`call-state-${call.id}`}>
                        {call.fsm_state.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{languageLabels[call.language] || call.language}</Badge>
                      <span className="text-xs text-gray-500">{call.turn_count} turns</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveMonitor;
