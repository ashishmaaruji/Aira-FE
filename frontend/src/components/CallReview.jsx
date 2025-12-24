import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCalls, getCallDetail, getAudioUrl } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Filter, ChevronLeft, ChevronRight, Loader2, Calendar, X, Play, Pause, VolumeX, Volume2, VolumeOff, PhoneOff, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// Activity type labels and icons
const ACTIVITY_LABELS = {
  activity_detected: 'Activity detected',
  silence: 'Silence',
  hangup: 'Hangup',
  timeout: 'Timeout'
};

// Audio Player for timeline
const AudioPlayer = ({ audioUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fullUrl = getAudioUrl(audioUrl);

  const togglePlay = () => {
    if (!audioRef.current || !fullUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setHasError(true));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setHasError(true);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  if (!fullUrl) return null;

  return (
    <div className="inline-flex items-center">
      <audio ref={audioRef} src={fullUrl} preload="none" />
      <button
        onClick={togglePlay}
        disabled={hasError}
        className={`p-1 rounded hover:bg-gray-200 transition-colors ${hasError ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={hasError ? 'Audio unavailable' : isPlaying ? 'Pause' : 'Play audio'}
      >
        {hasError ? (
          <VolumeX size={14} className="text-gray-400" />
        ) : isPlaying ? (
          <Pause size={14} className="text-gray-600" />
        ) : (
          <Play size={14} className="text-gray-600" />
        )}
      </button>
    </div>
  );
};

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

  // Side Drawer State
  const [selectedCall, setSelectedCall] = useState(null);
  const [callDetail, setCallDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      };
      if (exitReasonFilter && exitReasonFilter !== 'all') params.exit_reason = exitReasonFilter;
      if (demoIntentFilter && demoIntentFilter !== 'all') params.demo_intent = demoIntentFilter === 'true';
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await getCalls(params);
      setCalls(response.data.calls);
      setTotalCalls(response.data.total);
      setTotalPages(response.data.totalPages);
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
    setDrawerOpen(true);
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

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedCall(null);
      setCallDetail(null);
    }, 200);
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

  return (
    <div data-testid="call-review-page" className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Call Review</h1>
          <p className="text-sm text-gray-500 mt-0.5">Browse and review call history</p>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-gray-100 mb-5" data-testid="filters-card">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter size={14} />
                <span className="text-xs font-medium">Filters</span>
              </div>

              <Select value={exitReasonFilter} onValueChange={setExitReasonFilter}>
                <SelectTrigger className="w-36 h-8 text-xs" data-testid="exit-reason-filter">
                  <SelectValue placeholder="Exit Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="user_hangup">User Hangup</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>

              <Select value={demoIntentFilter} onValueChange={setDemoIntentFilter}>
                <SelectTrigger className="w-32 h-8 text-xs" data-testid="demo-intent-filter">
                  <SelectValue placeholder="Demo Intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intents</SelectItem>
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
                  className="w-32 h-8 text-xs"
                  data-testid="date-from-input"
                />
                <span className="text-gray-300">—</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-32 h-8 text-xs"
                  data-testid="date-to-input"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs" data-testid="clear-filters-btn">
                  <X size={12} className="mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="shadow-sm border-gray-100" data-testid="calls-list-card">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Call History</h2>
              <p className="text-xs text-gray-400">{totalCalls.toLocaleString()} total calls</p>
            </div>
            <span className="text-xs text-gray-400">
              Page {currentPage} of {totalPages || 1}
            </span>
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16" data-testid="loading-spinner">
                <Loader2 className="animate-spin text-gray-300" size={24} />
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-16 text-gray-400" data-testid="no-calls">
                <FileText className="mx-auto mb-3 opacity-30" size={24} />
                <p className="text-sm">No calls found</p>
                <p className="text-xs mt-0.5">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {calls.map((call) => (
                    <div
                      key={call.id}
                      className={`px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                        selectedCall?.id === call.id ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => handleViewDetail(call)}
                      data-testid={`call-row-${call.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            call.status === 'active' ? 'bg-green-50' :
                            call.exitReason === 'completed' ? 'bg-gray-50' :
                            'bg-red-50'
                          }`}>
                            <FileText className={`${
                              call.status === 'active' ? 'text-green-500' :
                              call.exitReason === 'completed' ? 'text-gray-400' :
                              'text-red-400'
                            }`} size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 font-mono">
                              {call.sessionId?.slice(0, 12) || call.id.slice(0, 12)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(call.startTime), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {call.demoIntent && (
                            <Badge className="bg-green-50 text-green-700 text-[10px]">Demo Intent</Badge>
                          )}
                          <Badge className={`state-${call.fsmState} text-[10px]`}>
                            {call.fsmState?.replace('_', ' ')}
                          </Badge>
                          {call.exitReason && (
                            <Badge variant="outline" className="text-[10px]">
                              {exitReasonLabels[call.exitReason] || call.exitReason}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">{call.language}</Badge>
                          <span className="text-xs text-gray-400 w-14 text-right">{call.turnCount} turns</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCalls)} of {totalCalls}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="prev-page-btn"
                      className="h-7 text-xs"
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      data-testid="next-page-btn"
                      className="h-7 text-xs"
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
      </div>

      {/* Side Drawer for Call Detail */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] p-0" data-testid="call-detail-drawer">
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <SheetTitle className="text-base font-medium">Call Timeline</SheetTitle>
            <SheetDescription className="text-xs font-mono">
              {selectedCall?.sessionId?.slice(0, 12) || selectedCall?.id?.slice(0, 12)}
            </SheetDescription>
          </SheetHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-gray-300" size={24} />
            </div>
          ) : callDetail ? (
            <div className="flex flex-col h-[calc(100vh-100px)]">
              {/* Call Info */}
              <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400">Status</p>
                    <Badge className={`status-${callDetail.status} mt-1`}>
                      {callDetail.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-400">Duration</p>
                    <p className="font-medium mt-1">
                      {callDetail.endTime
                        ? formatDistanceToNow(new Date(callDetail.startTime), { addSuffix: false })
                        : 'In progress'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Demo Intent</p>
                    <p className={`font-medium mt-1 ${callDetail.demoIntent ? 'text-green-600' : 'text-gray-500'}`}>
                      {callDetail.demoIntent ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conversation Timeline */}
              <ScrollArea className="flex-1 px-5 py-4">
                <div className="space-y-3">
                  {callDetail.turns?.map((turn, idx) => (
                    <div
                      key={turn.id || idx}
                      className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`turn-${idx}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2.5 ${
                          turn.speaker === 'user'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-[13px] leading-relaxed">{turn.text}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] ${turn.speaker === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
                            {format(new Date(turn.timestamp), 'h:mm:ss a')}
                          </span>
                          {turn.fsmState && turn.speaker === 'aira' && (
                            <span className="text-[10px] text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded">
                              {turn.fsmState}
                            </span>
                          )}
                          {turn.audioUrl && turn.speaker === 'aira' && (
                            <AudioPlayer audioUrl={turn.audioUrl} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CallReview;
