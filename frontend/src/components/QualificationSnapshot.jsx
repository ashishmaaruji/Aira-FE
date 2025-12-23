import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCalls, getCallQualification } from '@/lib/api';
import { toast } from 'sonner';
import { ClipboardList, Search, ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const QualificationSnapshot = () => {
  const [calls, setCalls] = useState([]);
  const [selectedQualification, setSelectedQualification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  
  // Filters
  const [demoIntentFilter, setDemoIntentFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: 15,
      };
      if (demoIntentFilter) params.demo_intent = demoIntentFilter === 'true';

      const response = await getCalls(params);
      setCalls(response.data.calls);
      setTotalCalls(response.data.total);
      setTotalPages(response.data.total_pages);
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

  const languageLabels = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German'
  };

  return (
    <div data-testid="qualification-snapshot-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Qualification Snapshot</h1>
        <p className="text-sm text-gray-500 mt-1">View captured answers, objections, and demo intent (read-only)</p>
      </div>

      {/* Read-Only Notice */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3" data-testid="readonly-notice">
        <ClipboardList className="text-gray-600 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-medium text-gray-800">CRM Payload View</p>
          <p className="text-xs text-gray-600 mt-0.5">
            This data represents what would be sent to CRM. View only - no writeback.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calls List */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm" data-testid="calls-list">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg">Calls</CardTitle>
              <CardDescription>{totalCalls} total calls</CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {/* Filters */}
              <div className="p-3 border-b border-gray-100">
                <Select value={demoIntentFilter} onValueChange={setDemoIntentFilter}>
                  <SelectTrigger className="h-9" data-testid="demo-filter">
                    <SelectValue placeholder="All Demo Intents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Calls</SelectItem>
                    <SelectItem value="true">With Demo Intent</SelectItem>
                    <SelectItem value="false">No Demo Intent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-gray-400" size={24} />
                </div>
              ) : calls.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardList className="mx-auto mb-3 opacity-50" size={24} />
                  <p className="text-sm">No calls found</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {calls.map((call) => (
                      <div
                        key={call.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          selectedQualification?.call_id === call.id
                            ? 'bg-gray-100'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectCall(call)}
                        data-testid={`call-item-${call.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {call.session_id.slice(0, 10)}...
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(call.start_time), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {call.demo_intent ? (
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
                  <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="prev-page"
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
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
        </div>

        {/* Qualification Detail */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm h-full" data-testid="qualification-detail">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg">Qualification Data</CardTitle>
              <CardDescription>
                {selectedQualification
                  ? `Call: ${selectedQualification.call_id.slice(0, 12)}...`
                  : 'Select a call to view qualification data'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {isDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
              ) : !selectedQualification ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardList className="mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm">Select a call from the list</p>
                  <p className="text-xs mt-1">Qualification data will appear here</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Demo Intent Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4" data-testid="demo-intent-card">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Demo Intent</p>
                      <div className="flex items-center gap-2">
                        {selectedQualification.demo_intent ? (
                          <>
                            <CheckCircle className="text-green-500" size={20} />
                            <span className="font-medium text-green-700">Yes</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="text-gray-400" size={20} />
                            <span className="font-medium text-gray-600">No</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4" data-testid="demo-confirmed-card">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Demo Confirmed</p>
                      <div className="flex items-center gap-2">
                        {selectedQualification.demo_confirmed ? (
                          <>
                            <CheckCircle className="text-green-500" size={20} />
                            <span className="font-medium text-green-700">Confirmed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="text-gray-400" size={20} />
                            <span className="font-medium text-gray-600">Not Confirmed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="bg-gray-50 rounded-lg p-4" data-testid="language-card">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Language</p>
                    <Badge variant="outline">
                      {languageLabels[selectedQualification.language] || selectedQualification.language}
                    </Badge>
                  </div>

                  {/* Captured Answers */}
                  <div data-testid="captured-answers">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <ClipboardList size={16} />
                      Captured Answers
                    </h3>
                    {Object.keys(selectedQualification.captured_answers).length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
                        No answers captured
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                        {Object.entries(selectedQualification.captured_answers).map(([key, value]) => (
                          <div key={key} className="p-4 flex justify-between">
                            <span className="text-sm text-gray-600">{key.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Objections */}
                  <div data-testid="objections">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Objections Raised
                    </h3>
                    {selectedQualification.objections.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
                        No objections recorded
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedQualification.objections.map((objection, idx) => (
                          <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-3">
                            <p className="text-sm text-red-800">{objection}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-400 pt-4 border-t border-gray-100">
                    <Calendar size={12} className="inline mr-1" />
                    Captured: {format(new Date(selectedQualification.timestamp), 'MMM d, yyyy h:mm:ss a')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QualificationSnapshot;
