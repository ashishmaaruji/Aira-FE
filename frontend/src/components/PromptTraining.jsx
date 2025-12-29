import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPrompts, updatePromptDraft, markPromptWeak, publishPrompt, getFSMStates } from '@/lib/api';
import { toast } from 'sonner';
import { MessageSquare, Plus, Edit, AlertTriangle, Check, Loader2, Save, Lock } from 'lucide-react';
import { format } from 'date-fns';

const PromptTraining = () => {
  const [prompts, setPrompts] = useState([]);
  const [fsmStates, setFsmStates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('edit'); // 'edit', 'weak', 'create'
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  // Form state
  const [formState, setFormState] = useState('');
  const [formLanguage, setFormLanguage] = useState('HINGLISH');
  const [formText, setFormText] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [promptsRes, statesRes] = await Promise.all([getPrompts({}), getFSMStates()]);
      // Ensure prompts and fsmStates are always arrays
      const promptsData = promptsRes.data;
      const promptsArray = Array.isArray(promptsData) ? promptsData : [];
      setPrompts(promptsArray);
      
      const statesData = statesRes.data;
      const statesArray = Array.isArray(statesData) ? statesData : [];
      setFsmStates(statesArray);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch prompts');
      setPrompts([]);
      setFsmStates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPrompts = prompts.filter(p => {
    if (selectedState && selectedState !== 'all' && p.fsmState !== selectedState) return false;
    if (selectedLanguage && selectedLanguage !== 'all' && p.language !== selectedLanguage) return false;
    return true;
  });

  const activePrompts = filteredPrompts.filter(p => p.status === 'active');
  const draftPrompts = filteredPrompts.filter(p => p.status === 'draft');
  const weakPrompts = filteredPrompts.filter(p => p.status === 'weak');

  const openEditDrawer = (prompt) => {
    setSelectedPrompt(prompt);
    setFormText(prompt.text);
    setFormNotes(prompt.notes || '');
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const openWeakDrawer = (prompt) => {
    setSelectedPrompt(prompt);
    setReplacementText('');
    setFormNotes('');
    setDrawerMode('weak');
    setDrawerOpen(true);
  };

  const openCreateDrawer = () => {
    setSelectedPrompt(null);
    setFormState('greeting');
    setFormLanguage('HINGLISH');
    setFormText('');
    setFormNotes('');
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedPrompt(null);
      setFormText('');
      setFormNotes('');
      setReplacementText('');
    }, 200);
  };

  const handleSaveDraft = async () => {
    if (!formText.trim()) {
      toast.error('Prompt text is required');
      return;
    }
    setIsSaving(true);
    try {
      if (drawerMode === 'create') {
        // For create, we'd call createPrompt, but using updatePromptDraft for now
        await updatePromptDraft(null, {
          fsmState: formState,
          language: formLanguage,
          text: formText,
          notes: formNotes
        });
        toast.success('Draft created');
      } else {
        await updatePromptDraft(selectedPrompt.id, {
          text: formText,
          notes: formNotes
        });
        toast.success('Draft saved');
      }
      closeDrawer();
      fetchData();
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkWeak = async () => {
    if (!replacementText.trim()) {
      toast.error('Replacement text is required');
      return;
    }
    setIsSaving(true);
    try {
      await markPromptWeak(selectedPrompt.id, replacementText);
      toast.success('Prompt marked as weak, replacement draft created');
      closeDrawer();
      fetchData();
    } catch (error) {
      console.error('Failed to mark weak:', error);
      toast.error('Failed to mark prompt as weak');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (promptId) => {
    try {
      await publishPrompt(promptId);
      toast.success('Prompt published');
      fetchData();
    } catch (error) {
      console.error('Failed to publish:', error);
      toast.error('Failed to publish prompt');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  return (
    <div data-testid="prompt-training-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Prompt Training</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage prompts per FSM state and language</p>
        </div>
        <Button onClick={openCreateDrawer} className="bg-gray-900 hover:bg-gray-800" data-testid="create-prompt-btn">
          <Plus size={16} className="mr-1.5" />
          New Prompt
        </Button>
      </div>

      {/* FSM Read-Only Notice */}
      <div className="mb-5 bg-blue-50/80 border border-blue-100 rounded-md px-4 py-3 flex items-start gap-3" data-testid="fsm-notice">
        <Lock className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
        <div>
          <p className="text-sm font-medium text-blue-800">FSM Logic is Read-Only</p>
          <p className="text-xs text-blue-600 mt-0.5">FSM states and transitions cannot be edited. Only prompts can be trained.</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-gray-100 mb-5">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-44 h-8 text-xs" data-testid="state-filter">
                <SelectValue placeholder="All FSM States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All FSM States</SelectItem>
                {fsmStates.map(s => (
                  <SelectItem key={s.state} value={s.state}>
                    {s.state.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-32 h-8 text-xs" data-testid="language-filter">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="HINGLISH">Hinglish</SelectItem>
                <SelectItem value="ENGLISH">English</SelectItem>
              </SelectContent>
            </Select>

            {(selectedState || selectedLanguage) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedState(''); setSelectedLanguage(''); }}
                className="h-8 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prompts Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="bg-gray-100/50" data-testid="prompt-tabs">
          <TabsTrigger value="active" className="text-xs">
            Active ({activePrompts.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">
            Drafts ({draftPrompts.length})
          </TabsTrigger>
          <TabsTrigger value="weak" className="text-xs">
            Weak ({weakPrompts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" data-testid="active-prompts-tab">
          <div className="space-y-3">
            {activePrompts.length === 0 ? (
              <Card className="shadow-sm border-gray-100">
                <CardContent className="py-12 text-center text-gray-400">
                  <MessageSquare className="mx-auto mb-3 opacity-30" size={24} />
                  <p className="text-sm">No active prompts</p>
                </CardContent>
              </Card>
            ) : (
              activePrompts.map(prompt => (
                <PromptCard key={prompt.id} prompt={prompt} onMarkWeak={openWeakDrawer} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="draft" data-testid="draft-prompts-tab">
          <div className="space-y-3">
            {draftPrompts.length === 0 ? (
              <Card className="shadow-sm border-gray-100">
                <CardContent className="py-12 text-center text-gray-400">
                  <MessageSquare className="mx-auto mb-3 opacity-30" size={24} />
                  <p className="text-sm">No draft prompts</p>
                </CardContent>
              </Card>
            ) : (
              draftPrompts.map(prompt => (
                <PromptCard 
                  key={prompt.id} 
                  prompt={prompt} 
                  onEdit={openEditDrawer} 
                  onPublish={handlePublish}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="weak" data-testid="weak-prompts-tab">
          <div className="space-y-3">
            {weakPrompts.length === 0 ? (
              <Card className="shadow-sm border-gray-100">
                <CardContent className="py-12 text-center text-gray-400">
                  <AlertTriangle className="mx-auto mb-3 opacity-30" size={24} />
                  <p className="text-sm">No weak prompts</p>
                </CardContent>
              </Card>
            ) : (
              weakPrompts.map(prompt => (
                <PromptCard key={prompt.id} prompt={prompt} showActions={false} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Side Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px]" data-testid="prompt-drawer">
          <SheetHeader>
            <SheetTitle className="text-base">
              {drawerMode === 'create' ? 'Create New Prompt' : 
               drawerMode === 'weak' ? 'Mark as Weak' : 'Edit Draft'}
            </SheetTitle>
            <SheetDescription>
              {drawerMode === 'create' ? 'New prompts are saved as drafts until published.' :
               drawerMode === 'weak' ? 'You must provide replacement text.' :
               selectedPrompt && `${selectedPrompt.fsmState} - ${selectedPrompt.language}`}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            {drawerMode === 'create' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">FSM State</Label>
                  <Select value={formState} onValueChange={setFormState}>
                    <SelectTrigger className="mt-1.5" data-testid="create-state-select">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {fsmStates.map(s => (
                        <SelectItem key={s.state} value={s.state}>
                          {s.state.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Language</Label>
                  <Select value={formLanguage} onValueChange={setFormLanguage}>
                    <SelectTrigger className="mt-1.5" data-testid="create-language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HINGLISH">Hinglish</SelectItem>
                      <SelectItem value="ENGLISH">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {drawerMode === 'weak' && selectedPrompt && (
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Current Prompt</p>
                <p className="text-sm text-gray-700">{selectedPrompt.text}</p>
              </div>
            )}

            <div>
              <Label className="text-xs">
                {drawerMode === 'weak' ? 'Replacement Text *' : 'Prompt Text'}
              </Label>
              <Textarea
                value={drawerMode === 'weak' ? replacementText : formText}
                onChange={(e) => drawerMode === 'weak' ? setReplacementText(e.target.value) : setFormText(e.target.value)}
                placeholder={drawerMode === 'weak' ? 'Enter improved prompt text...' : 'Enter the prompt text...'}
                className="mt-1.5 min-h-[120px] text-sm"
                data-testid="prompt-text-input"
              />
            </div>

            <div>
              <Label className="text-xs">{drawerMode === 'weak' ? 'Reason' : 'Notes'} (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={drawerMode === 'weak' ? 'Why is this prompt weak?' : 'Add any notes...'}
                className="mt-1.5 text-sm"
                rows={2}
                data-testid="notes-input"
              />
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
            {drawerMode === 'weak' ? (
              <Button
                variant="destructive"
                onClick={handleMarkWeak}
                disabled={isSaving || !replacementText.trim()}
                data-testid="confirm-weak-btn"
              >
                {isSaving ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <AlertTriangle className="mr-1.5" size={14} />}
                Mark Weak
              </Button>
            ) : (
              <Button
                onClick={handleSaveDraft}
                disabled={isSaving || !formText.trim()}
                className="bg-gray-900 hover:bg-gray-800"
                data-testid="save-draft-btn"
              >
                {isSaving ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Save className="mr-1.5" size={14} />}
                Save Draft
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Prompt Card Component
const PromptCard = ({ prompt, onEdit, onPublish, onMarkWeak, showActions = true }) => (
  <Card className="shadow-sm border-gray-100" data-testid={`prompt-${prompt.id}`}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`state-${prompt.fsmState} text-[10px]`}>
              {prompt.fsmState?.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{prompt.language}</Badge>
            <Badge className={`prompt-${prompt.status} text-[10px]`}>
              {prompt.status}
            </Badge>
            <span className="text-[10px] text-gray-400">v{prompt.version}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{prompt.text}</p>
          {prompt.notes && (
            <p className="text-xs text-gray-400 mt-2 italic">Note: {prompt.notes}</p>
          )}
          <p className="text-[10px] text-gray-400 mt-2">
            Updated {format(new Date(prompt.updatedAt), 'MMM d, h:mm a')}
          </p>
        </div>
        
        {showActions && (
          <div className="flex flex-col gap-1.5">
            {prompt.status === 'draft' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit?.(prompt)}
                  className="h-7 text-xs"
                  data-testid={`edit-prompt-${prompt.id}`}
                >
                  <Edit size={12} className="mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => onPublish?.(prompt.id)}
                  className="h-7 text-xs bg-gray-900 hover:bg-gray-800"
                  data-testid={`publish-prompt-${prompt.id}`}
                >
                  <Check size={12} className="mr-1" />
                  Publish
                </Button>
              </>
            )}
            {prompt.status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkWeak?.(prompt)}
                className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                data-testid={`mark-weak-${prompt.id}`}
              >
                <AlertTriangle size={12} className="mr-1" />
                Mark Weak
              </Button>
            )}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default PromptTraining;
