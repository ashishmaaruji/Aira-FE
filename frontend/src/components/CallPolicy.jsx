import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { getPolicy, updatePolicyDraft, publishPolicy } from '@/lib/api';
import { toast } from 'sonner';
import { Settings, Edit, Save, Check, Loader2, Clock, Phone, Volume2, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import { format } from 'date-fns';

const CallPolicy = () => {
  const [policy, setPolicy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);

  // Form state for editing
  const [formData, setFormData] = useState({});

  const fetchPolicy = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getPolicy();
      setPolicy(response.data);
    } catch (error) {
      console.error('Failed to fetch policy:', error);
      toast.error('Failed to fetch policy');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  // Get the display values (draft if exists, otherwise active)
  const getDisplayPolicy = () => {
    if (!policy) return null;
    return policy.draft || policy.active;
  };

  const hasDraft = policy?.draft !== null;

  const openEditDrawer = (section) => {
    const currentPolicy = getDisplayPolicy();
    if (!currentPolicy) return;

    setEditSection(section);
    
    // Initialize form data based on section
    switch (section) {
      case 'retry':
        setFormData({
          maxAttempts: currentPolicy.retryRules?.maxAttempts || 3,
          delayMinutes: currentPolicy.retryRules?.delayMinutes || 30
        });
        break;
      case 'hours':
        setFormData({
          startTime: currentPolicy.callingHours?.startTime || '09:00',
          endTime: currentPolicy.callingHours?.endTime || '20:00',
          sundayAllowed: currentPolicy.callingHours?.sundayAllowed || false,
          newLeadOverrideMinutes: currentPolicy.callingHours?.newLeadOverrideMinutes || 15
        });
        break;
      case 'health':
        setFormData({
          failureCountThreshold: currentPolicy.numberHealth?.failureCountThreshold || 5,
          answerRateThreshold: currentPolicy.numberHealth?.answerRateThreshold || 20,
          hangupDurationThreshold: currentPolicy.numberHealth?.hangupDurationThreshold || 3
        });
        break;
      case 'silence':
        setFormData({
          timeoutSeconds: currentPolicy.silenceRules?.timeoutSeconds || 8,
          maxSilenceStrikes: currentPolicy.silenceRules?.maxSilenceStrikes || 3
        });
        break;
      default:
        setFormData({});
    }
    
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setEditSection(null);
      setFormData({});
    }, 200);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const currentPolicy = getDisplayPolicy();
      let updatedPolicy = { ...currentPolicy };

      // Update the specific section
      switch (editSection) {
        case 'retry':
          updatedPolicy.retryRules = {
            maxAttempts: parseInt(formData.maxAttempts),
            delayMinutes: parseInt(formData.delayMinutes)
          };
          break;
        case 'hours':
          updatedPolicy.callingHours = {
            startTime: formData.startTime,
            endTime: formData.endTime,
            sundayAllowed: formData.sundayAllowed,
            newLeadOverrideMinutes: parseInt(formData.newLeadOverrideMinutes)
          };
          break;
        case 'health':
          updatedPolicy.numberHealth = {
            failureCountThreshold: parseInt(formData.failureCountThreshold),
            answerRateThreshold: parseInt(formData.answerRateThreshold),
            hangupDurationThreshold: parseInt(formData.hangupDurationThreshold)
          };
          break;
        case 'silence':
          updatedPolicy.silenceRules = {
            timeoutSeconds: parseInt(formData.timeoutSeconds),
            maxSilenceStrikes: parseInt(formData.maxSilenceStrikes)
          };
          break;
      }

      await updatePolicyDraft(updatedPolicy);
      
      // Update local state with draft
      setPolicy(prev => ({
        ...prev,
        draft: {
          ...updatedPolicy,
          updatedAt: new Date().toISOString()
        }
      }));

      toast.success('Draft saved');
      closeDrawer();
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publishPolicy();
      
      // Update local state - draft becomes active
      setPolicy(prev => ({
        ...prev,
        active: {
          ...prev.draft,
          publishedAt: new Date().toISOString()
        },
        draft: null
      }));

      toast.success('Policy published');
    } catch (error) {
      console.error('Failed to publish:', error);
      toast.error('Failed to publish policy');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscardDraft = () => {
    setPolicy(prev => ({
      ...prev,
      draft: null
    }));
    toast.info('Draft discarded');
  };

  const getSectionTitle = () => {
    switch (editSection) {
      case 'retry': return 'Retry Rules';
      case 'hours': return 'Calling Hours';
      case 'health': return 'Number Health Thresholds';
      case 'silence': return 'Silence Rules';
      default: return 'Edit Policy';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  const displayPolicy = getDisplayPolicy();
  const numberStatus = policy?.numberStatus;

  return (
    <div data-testid="call-policy-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Call Policy</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure retry, calling hours, and silence rules</p>
        </div>
        {hasDraft && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDiscardDraft}
              className="text-xs"
            >
              Discard Draft
            </Button>
            <Button 
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-gray-900 hover:bg-gray-800 text-xs"
              data-testid="publish-policy-btn"
            >
              {isPublishing ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Check className="mr-1.5" size={14} />}
              Publish Changes
            </Button>
          </div>
        )}
      </div>

      {/* Draft Notice */}
      {hasDraft && (
        <div className="mb-5 bg-amber-50/80 border border-amber-100 rounded-md px-4 py-3 flex items-start gap-3" data-testid="draft-notice">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
          <div>
            <p className="text-sm font-medium text-amber-800">Unpublished Changes</p>
            <p className="text-xs text-amber-600 mt-0.5">You have draft changes that are not yet active. Publish to apply them.</p>
          </div>
        </div>
      )}

      {/* FSM Read-Only Notice */}
      <div className="mb-5 bg-blue-50/80 border border-blue-100 rounded-md px-4 py-3 flex items-start gap-3" data-testid="fsm-notice">
        <Lock className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
        <div>
          <p className="text-sm font-medium text-blue-800">FSM Logic is Read-Only</p>
          <p className="text-xs text-blue-600 mt-0.5">These settings control call behavior, not FSM transitions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Retry Rules */}
        <Card className="shadow-sm border-gray-100" data-testid="retry-rules-card">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Retry Rules</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDrawer('retry')} className="h-7 text-xs" data-testid="edit-retry-btn">
              <Edit size={12} className="mr-1" />
              Edit
            </Button>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Max Attempts</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.retryRules?.maxAttempts || 3}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Delay Between Attempts</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.retryRules?.delayMinutes || 30} min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calling Hours */}
        <Card className="shadow-sm border-gray-100" data-testid="calling-hours-card">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Calling Hours</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDrawer('hours')} className="h-7 text-xs" data-testid="edit-hours-btn">
              <Edit size={12} className="mr-1" />
              Edit
            </Button>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Operating Hours</span>
                <span className="text-sm font-medium text-gray-900">
                  {displayPolicy?.callingHours?.startTime || '09:00'} – {displayPolicy?.callingHours?.endTime || '20:00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Sunday Calls</span>
                <Badge variant="outline" className={`text-[10px] ${displayPolicy?.callingHours?.sundayAllowed ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                  {displayPolicy?.callingHours?.sundayAllowed ? 'Allowed' : 'Not Allowed'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">New Lead Override</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.callingHours?.newLeadOverrideMinutes || 15} min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Number Health */}
        <Card className="shadow-sm border-gray-100" data-testid="number-health-card">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Number Health</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDrawer('health')} className="h-7 text-xs" data-testid="edit-health-btn">
              <Edit size={12} className="mr-1" />
              Edit
            </Button>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Failure Count Threshold</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.numberHealth?.failureCountThreshold || 5}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Answer Rate Threshold</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.numberHealth?.answerRateThreshold || 20}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Hangup Duration Threshold</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.numberHealth?.hangupDurationThreshold || 3}s</span>
              </div>
              
              {/* Current Number Status - Read Only */}
              {numberStatus && (
                <>
                  <Separator className="my-3" />
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Current Number Status</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-mono">{numberStatus.primaryNumber}</span>
                        <Badge className={`text-[10px] ${numberStatus.status === 'healthy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {numberStatus.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-gray-400">Failures</p>
                          <p className="text-sm font-medium">{numberStatus.failureCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Answer %</p>
                          <p className="text-sm font-medium">{numberStatus.answerRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Avg Hangup</p>
                          <p className="text-sm font-medium">{numberStatus.avgHangupDuration}s</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Silence Rules */}
        <Card className="shadow-sm border-gray-100" data-testid="silence-rules-card">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Silence Rules</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDrawer('silence')} className="h-7 text-xs" data-testid="edit-silence-btn">
              <Edit size={12} className="mr-1" />
              Edit
            </Button>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Silence Timeout</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.silenceRules?.timeoutSeconds || 8}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Max Silence Strikes</span>
                <span className="text-sm font-medium text-gray-900">{displayPolicy?.silenceRules?.maxSilenceStrikes || 3}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      {displayPolicy?.updatedAt && (
        <p className="text-[10px] text-gray-400 mt-5">
          Last updated: {format(new Date(displayPolicy.updatedAt), 'MMM d, yyyy h:mm a')}
          {displayPolicy.publishedAt && ` • Published: ${format(new Date(displayPolicy.publishedAt), 'MMM d, yyyy h:mm a')}`}
        </p>
      )}

      {/* Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px]" data-testid="policy-edit-drawer">
          <SheetHeader>
            <SheetTitle className="text-base">{getSectionTitle()}</SheetTitle>
            <SheetDescription>Changes are saved as draft until published.</SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-5">
            {editSection === 'retry' && (
              <>
                <div>
                  <Label className="text-xs">Max Attempts</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-max-attempts"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Number of retry attempts before giving up</p>
                </div>
                <div>
                  <Label className="text-xs">Delay Between Attempts (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    value={formData.delayMinutes}
                    onChange={(e) => setFormData({ ...formData, delayMinutes: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-delay-minutes"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Wait time before retrying</p>
                </div>
              </>
            )}

            {editSection === 'hours' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="mt-1.5"
                      data-testid="input-start-time"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="mt-1.5"
                      data-testid="input-end-time"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-xs">Allow Sunday Calls</Label>
                    <p className="text-[10px] text-gray-400 mt-0.5">Enable calling on Sundays</p>
                  </div>
                  <Switch
                    checked={formData.sundayAllowed}
                    onCheckedChange={(checked) => setFormData({ ...formData, sundayAllowed: checked })}
                    data-testid="toggle-sunday"
                  />
                </div>
                <div>
                  <Label className="text-xs">New Lead Override Window (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.newLeadOverrideMinutes}
                    onChange={(e) => setFormData({ ...formData, newLeadOverrideMinutes: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-override-minutes"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Call new leads outside hours within this window</p>
                </div>
              </>
            )}

            {editSection === 'health' && (
              <>
                <div>
                  <Label className="text-xs">Failure Count Threshold</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.failureCountThreshold}
                    onChange={(e) => setFormData({ ...formData, failureCountThreshold: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-failure-threshold"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Max failures before marking number unhealthy</p>
                </div>
                <div>
                  <Label className="text-xs">Answer Rate Threshold (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.answerRateThreshold}
                    onChange={(e) => setFormData({ ...formData, answerRateThreshold: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-answer-threshold"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Minimum answer rate required</p>
                </div>
                <div>
                  <Label className="text-xs">Hangup Duration Threshold (seconds)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.hangupDurationThreshold}
                    onChange={(e) => setFormData({ ...formData, hangupDurationThreshold: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-hangup-threshold"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Calls shorter than this are flagged</p>
                </div>
              </>
            )}

            {editSection === 'silence' && (
              <>
                <div>
                  <Label className="text-xs">Silence Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min="3"
                    max="30"
                    value={formData.timeoutSeconds}
                    onChange={(e) => setFormData({ ...formData, timeoutSeconds: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-timeout-seconds"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Seconds of silence before triggering a strike</p>
                </div>
                <div>
                  <Label className="text-xs">Max Silence Strikes</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxSilenceStrikes}
                    onChange={(e) => setFormData({ ...formData, maxSilenceStrikes: e.target.value })}
                    className="mt-1.5"
                    data-testid="input-max-strikes"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Strikes before ending the call</p>
                </div>
              </>
            )}
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="bg-gray-900 hover:bg-gray-800"
              data-testid="save-draft-btn"
            >
              {isSaving ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Save className="mr-1.5" size={14} />}
              Save Draft
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CallPolicy;
