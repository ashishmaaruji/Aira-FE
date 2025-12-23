import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getCalls, getCallQualification } from '@/lib/api';
import { toast } from 'sonner';
import { ClipboardList, ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const QualificationSnapshot = () => {
  const [calls, setCalls] = useState([]);
  const [selectedQualification, setSelectedQualification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Filters
  const [demoIntentFilter, setDemoIntentFilter] = useState('');

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: 15,
      };
      if (demoIntentFilter && demoIntentFilter !== 'all') params.demo_intent = demoIntentFilter === 'true';

      const response = await getCalls(params);
      setCalls(response.data.calls);
      setTotalCalls(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Failed to fetch calls:', error);
      toast.error('Failed to fetch calls');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, demoIntentFilter]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleSelectCall = async (call) => {
    setDrawerOpen(true);
    setIsDetailLoading(true);
    try {
      const response = await getCallQualification(call.id);
      setSelectedQualification(response.data);
    } catch (error) {
      console.error('Failed to fetch qualification:', error);
      toast.error('Failed to fetch qualification data');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedQualification(null), 200);
  };

  return (
    <div data-testid="qualification-snapshot-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Qualification Snapshot</h1>
        <p className="text-sm text-gray-500 mt-0.5">View captured answers, objections, and demo intent (read-only)</p>
      </div>

      {/* Read-Only Notice */}
      <div className="mb-5 bg-gray-50 border border-gray-100 rounded-md px-4 py-3 flex items-start gap-3" data-testid="readonly-notice">
        <ClipboardList className="text-gray-500 mt-0.5 flex-shrink-0" size={16} />
        <div>
          <p className="text-sm font-medium text-gray-700">CRM Payload View</p>
          <p className="text-xs text-gray-500 mt-0.5">This data represents what would be sent to CRM. View only — no writeback.</p>
        </div>
      </div>

      {/* Calls List */}
      <Card className="shadow-sm border-gray-100" data-testid="calls-list">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Calls</h2>
            <p className="text-xs text-gray-400">{totalCalls} total</p>
          </div>
          <Select value={demoIntentFilter} onValueChange={setDemoIntentFilter}>
            <SelectTrigger className="w-36 h-8 text-xs" data-testid="demo-filter">
              <SelectValue placeholder="All Intents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="true">With Demo Intent</SelectItem>
              <SelectItem value="false">No Demo Intent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-gray-300" size={24} />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="mx-auto mb-3 opacity-30" size={24} />
              <p className="text-sm">No calls found</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => handleSelectCall(call)}
                    data-testid={`call-item-${call.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 font-mono">
                          {call.sessionId?.slice(0, 10) || call.id.slice(0, 10)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(call.startTime), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{call.language}</Badge>
                        {call.demoIntent ? (
                          <CheckCircle className="text-green-500" size={16} />
                        ) : (
                          <XCircle className="text-gray-300" size={16} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7"
                    data-testid="prev-page"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-7"
                    data-testid="next-page"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Qualification Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px]" data-testid="qualification-drawer">
          <SheetHeader>
            <SheetTitle className="text-base">Qualification Data</SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {selectedQualification?.callId?.slice(0, 12)}
            </SheetDescription>
          </SheetHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-gray-300" size={24} />
            </div>
          ) : selectedQualification ? (
            <div className="py-6 space-y-5">
              {/* Demo Intent & Confirmed */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-md p-3" data-testid="demo-intent-card">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Demo Intent</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {selectedQualification.demoIntent ? (
                      <>
                        <CheckCircle className="text-green-500" size={16} />
                        <span className="text-sm font-medium text-green-700">Yes</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-gray-400" size={16} />
                        <span className="text-sm font-medium text-gray-500">No</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-3" data-testid="demo-confirmed-card">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Demo Confirmed</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {selectedQualification.demoConfirmed ? (
                      <>
                        <CheckCircle className="text-green-500" size={16} />
                        <span className="text-sm font-medium text-green-700">Confirmed</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-gray-400" size={16} />
                        <span className="text-sm font-medium text-gray-500">Not Confirmed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="bg-gray-50 rounded-md p-3" data-testid="language-card">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Language</p>
                <Badge variant="outline" className="mt-1.5">
                  {selectedQualification.language}
                </Badge>
              </div>

              {/* Captured Answers */}
              <div data-testid="captured-answers">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={14} className="text-gray-400" />
                  <h3 className="text-xs font-medium text-gray-700">Captured Answers</h3>
                </div>
                {Object.keys(selectedQualification.capturedAnswers || {}).length === 0 ? (
                  <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-400">
                    No answers captured
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md divide-y divide-gray-100">
                    {Object.entries(selectedQualification.capturedAnswers).map(([key, value]) => (
                      <div key={key} className="px-3 py-2.5 flex justify-between">
                        <span className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-medium text-gray-900">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Objections */}
              <div data-testid="objections">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-gray-400" />
                  <h3 className="text-xs font-medium text-gray-700">Objections Raised</h3>
                </div>
                {(selectedQualification.objections || []).length === 0 ? (
                  <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-400">
                    No objections recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedQualification.objections.map((objection, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-100 rounded-md p-2.5">
                        <p className="text-xs text-red-700">{objection}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-[10px] text-gray-400 pt-4 border-t border-gray-100 flex items-center gap-1">
                <Calendar size={10} />
                Captured: {format(new Date(selectedQualification.timestamp), 'MMM d, yyyy h:mm:ss a')}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default QualificationSnapshot;
