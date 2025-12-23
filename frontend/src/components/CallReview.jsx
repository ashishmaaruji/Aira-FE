import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCalls, getCallDetail } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Search, Filter, ChevronLeft, ChevronRight, Volume2, Loader2, Calendar, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const CallReview = () => {
  const [calls, setCalls] = useState([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [exitReasonFilter, setExitReasonFilter] = useState('');
  const [demoIntentFilter, setDemoIntentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Call Detail Modal
  const [selectedCall, setSelectedCall] = useState(null);
  const [callDetail, setCallDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      };
      if (exitReasonFilter) params.exit_reason = exitReasonFilter;
      if (demoIntentFilter) params.demo_intent = demoIntentFilter === 'true';
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await getCalls(params);
      setCalls(response.data.calls);
      setTotalCalls(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Failed to fetch calls:', error);
      toast.error('Failed to fetch call history');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, exitReasonFilter, demoIntentFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleViewDetail = async (call) => {
    setSelectedCall(call);
    setIsDetailLoading(true);
    try {
      const response = await getCallDetail(call.id);
      setCallDetail(response.data);
    } catch (error) {
      console.error('Failed to fetch call detail:', error);
      toast.error('Failed to fetch call details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedCall(null);
    setCallDetail(null);
  };

  const clearFilters = () => {
    setExitReasonFilter('');
    setDemoIntentFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = exitReasonFilter || demoIntentFilter || dateFrom || dateTo;

  const exitReasonLabels = {
    completed: 'Completed',
    user_hangup: 'User Hangup',
    timeout: 'Timeout',
    error: 'Error',
    transferred: 'Transferred',
    no_response: 'No Response'
  };

  const languageLabels = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German'
  };

  return (
    <div data-testid="call-review-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Call Review</h1>
        <p className="text-sm text-gray-500 mt-1">Browse and review call history (high volume ready)</p>
      </div>

      {/* Filters */}
      <Card className="shadow-sm mb-6" data-testid="filters-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <Select value={exitReasonFilter} onValueChange={setExitReasonFilter}>
              <SelectTrigger className="w-40 h-9" data-testid="exit-reason-filter">
                <SelectValue placeholder="Exit Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="user_hangup">User Hangup</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="no_response">No Response</SelectItem>
              </SelectContent>
            </Select>

            <Select value={demoIntentFilter} onValueChange={setDemoIntentFilter}>
              <SelectTrigger className="w-36 h-9" data-testid="demo-intent-filter">
                <SelectValue placeholder="Demo Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">With Intent</SelectItem>
                <SelectItem value="false">No Intent</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 h-9"
                placeholder="From"
                data-testid="date-from-input"
              />
              <span className="text-gray-400">-</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 h-9"
                placeholder="To"
                data-testid="date-to-input"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters-btn">
                <X size={14} className="mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="shadow-sm" data-testid="calls-list-card">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Call History</CardTitle>
              <CardDescription>{totalCalls.toLocaleString()} total calls</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-spinner">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12 text-gray-400" data-testid="no-calls">
              <FileText className="mx-auto mb-3 opacity-50" size={32} />
              <p className="text-sm">No calls found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(call)}
                    data-testid={`call-row-${call.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          call.status === 'active' ? 'bg-green-100' :
                          call.status === 'completed' ? 'bg-gray-100' :
                          'bg-red-100'
                        }`}>
                          <FileText className={`${
                            call.status === 'active' ? 'text-green-600' :
                            call.status === 'completed' ? 'text-gray-600' :
                            'text-red-600'
                          }`} size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {call.session_id.slice(0, 12)}...
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(call.start_time), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {call.demo_intent && (
                          <Badge className="bg-purple-100 text-purple-700">Demo Intent</Badge>
                        )}
                        <Badge className={`state-${call.fsm_state}`}>
                          {call.fsm_state.replace('_', ' ')}
                        </Badge>
                        {call.exit_reason && (
                          <Badge variant="outline">
                            {exitReasonLabels[call.exit_reason] || call.exit_reason}
                          </Badge>
                        )}
                        <Badge variant="outline">{languageLabels[call.language] || call.language}</Badge>
                        <span className="text-xs text-gray-500 w-16 text-right">{call.turn_count} turns</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCalls)} of {totalCalls}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="prev-page-btn"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    data-testid="next-page-btn"
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Call Detail Modal */}
      <Dialog open={!!selectedCall} onOpenChange={handleCloseDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="call-detail-modal">
          <DialogHeader>
            <DialogTitle>Call Timeline</DialogTitle>
            <DialogDescription>
              {selectedCall && `Session: ${selectedCall.session_id.slice(0, 12)}...`}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : callDetail ? (
            <ScrollArea className="h-[50vh]">
              <div className="space-y-4 pr-4">
                {callDetail.turns.map((turn, idx) => (
                  <div
                    key={turn.id || idx}
                    className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`turn-${idx}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        turn.speaker === 'user'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{turn.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs opacity-60">
                          {format(new Date(turn.timestamp), 'h:mm:ss a')}
                        </span>
                        {turn.fsm_state && (
                          <Badge variant="outline" className="text-xs py-0 h-5">
                            {turn.fsm_state}
                          </Badge>
                        )}
                        {turn.audio_url && turn.speaker === 'aira' && (
                          <button className="opacity-60 hover:opacity-100" title="Play audio">
                            <Volume2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : null}

          {callDetail && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge className={`status-${callDetail.status} mt-1`}>
                    {callDetail.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500">Duration</p>
                  <p className="font-medium mt-1">
                    {callDetail.end_time
                      ? formatDistanceToNow(new Date(callDetail.start_time), { addSuffix: false })
                      : 'In progress'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Demo Intent</p>
                  <p className="font-medium mt-1">{callDetail.demo_intent ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallReview;
