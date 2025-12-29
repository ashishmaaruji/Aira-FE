import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getLiveCalls, getStats } from '@/lib/api';
import { toast } from 'sonner';
import { Activity, RefreshCw, Phone, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const LiveMonitor = () => {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({ totalCalls: 0, activeCalls: 0, completedCalls: 0, demoIntents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [callsRes, statsRes] = await Promise.all([getLiveCalls(), getStats()]);
      // Ensure calls is always an array - handle different response structures
      const callsData = callsRes.data;
      const callsArray = Array.isArray(callsData) 
        ? callsData 
        : (callsData?.calls && Array.isArray(callsData.calls) 
          ? callsData.calls 
          : []);
      setCalls(callsArray);
      setStats(statsRes.data || {});
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch live calls:', error);
      // Ensure calls is always an array even on error
      setCalls([]);
      // Don't show error toast on auto-refresh
      if (showRefreshIndicator) {
        toast.error('Failed to fetch live data');
      }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  return (
    <div data-testid="live-monitor-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Live Call Monitor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time view of active calls (read-only)</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            data-testid="refresh-btn"
            className="h-8"
          >
            <RefreshCw className={`mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm border-gray-100" data-testid="stat-active-calls">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Active</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.activeCalls}</p>
              </div>
              <div className="w-9 h-9 bg-green-50 rounded-md flex items-center justify-center">
                <Activity className="text-green-500" size={18} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100" data-testid="stat-total-calls">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalCalls}</p>
              </div>
              <div className="w-9 h-9 bg-gray-50 rounded-md flex items-center justify-center">
                <Phone className="text-gray-400" size={18} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100" data-testid="stat-completed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.completedCalls}</p>
              </div>
              <div className="w-9 h-9 bg-gray-50 rounded-md flex items-center justify-center">
                <Clock className="text-gray-400" size={18} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100" data-testid="stat-demo-intents">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Demo Intents</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">{stats.demoIntents}</p>
              </div>
              <div className="w-9 h-9 bg-green-50 rounded-md flex items-center justify-center">
                <span className="text-green-500 text-sm font-semibold">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Calls List */}
      <Card className="shadow-sm border-gray-100" data-testid="live-calls-card">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-900">Active Calls</h2>
            {calls.length > 0 && (
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-slow" />
            )}
          </div>
          <Badge variant="outline" className="text-xs">{calls.length} active</Badge>
        </div>

        <CardContent className="p-0">
          {calls.length === 0 ? (
            <div className="text-center py-16 text-gray-400" data-testid="no-active-calls">
              <Phone className="mx-auto mb-3 opacity-30" size={24} />
              <p className="text-sm">No active calls</p>
              <p className="text-xs mt-0.5">Calls will appear here in real-time</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="px-4 py-3 hover:bg-gray-50/50 transition-colors"
                  data-testid={`call-item-${call.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                        <Phone className="text-green-500" size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 font-mono">
                          {call.sessionId?.slice(0, 8) || call.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Started {formatDistanceToNow(new Date(call.startTime), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={`state-${call.fsmState} text-[10px]`} data-testid={`call-state-${call.id}`}>
                        {call.fsmState?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {call.language}
                      </Badge>
                      <span className="text-xs text-gray-400 w-16 text-right">
                        {call.turnCount} turns
                      </span>
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
