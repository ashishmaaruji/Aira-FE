import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPrompts, createPrompt, updatePrompt, markPromptWeak, publishPrompt, getFSMStates } from '@/lib/api';
import { toast } from 'sonner';
import { MessageSquare, Plus, Edit, AlertTriangle, Check, Loader2, Save, Lock } from 'lucide-react';
import { format } from 'date-fns';

const LANGUAGE_LABELS = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German'
};

// Moved outside component to avoid re-creation on every render
const PromptCard = ({ prompt, showActions = true, onEdit, onPublish, onMarkWeak }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white" data-testid={`prompt-${prompt.id}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <Badge className={`state-${prompt.fsm_state}`}>
            {prompt.fsm_state.replace('_', ' ')}
          </Badge>
          <Badge variant="outline">{LANGUAGE_LABELS[prompt.language]}</Badge>
          <Badge className={`prompt-${prompt.status}`}>
            {prompt.status}
          </Badge>
          <span className="text-xs text-gray-400">v{prompt.version}</span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{prompt.text}</p>
        {prompt.notes && (
          <p className="text-xs text-gray-500 mt-2 italic">Note: {prompt.notes}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Updated {format(new Date(prompt.updated_at), 'MMM d, yyyy h:mm a')}
        </p>
      </div>
      
      {showActions && (
        <div className="flex flex-col gap-2">
          {prompt.status === 'draft' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(prompt)}
                data-testid={`edit-prompt-${prompt.id}`}
              >
                <Edit size={14} className="mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => onPublish(prompt.id)}
                data-testid={`publish-prompt-${prompt.id}`}
              >
                <Check size={14} className="mr-1" />
                Publish
              </Button>
            </>
          )}
          {prompt.status === 'active' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onMarkWeak(prompt)}
              data-testid={`mark-weak-${prompt.id}`}
            >
              <AlertTriangle size={14} className="mr-1" />
              Mark Weak
            </Button>
          )}
        </div>
      )}
    </div>
  </div>
);

const PromptTraining = () => {
  const [prompts, setPrompts] = useState([]);
  const [fsmStates, setFsmStates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [weakModalOpen, setWeakModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  // Form state
  const [formState, setFormState] = useState('');
  const [formLanguage, setFormLanguage] = useState('en');
  const [formText, setFormText] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [promptsRes, statesRes] = await Promise.all([getPrompts({}), getFSMStates()]);
      setPrompts(promptsRes.data);
      setFsmStates(statesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch prompts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPrompts = prompts.filter(p => {
    if (selectedState && p.fsm_state !== selectedState) return false;
    if (selectedLanguage && p.language !== selectedLanguage) return false;
    return true;
  });

  const activePrompts = filteredPrompts.filter(p => p.status === 'active');
  const draftPrompts = filteredPrompts.filter(p => p.status === 'draft');
  const weakPrompts = filteredPrompts.filter(p => p.status === 'weak');

  const handleCreatePrompt = async () => {
    if (!formState || !formLanguage || !formText.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSaving(true);
    try {
      await createPrompt({
        fsm_state: formState,
        language: formLanguage,
        text: formText,
        notes: formNotes
      });
      toast.success('Prompt created as draft');
      setCreateModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast.error('Failed to create prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!formText.trim()) {
      toast.error('Prompt text is required');
      return;
    }
    setIsSaving(true);
    try {
      await updatePrompt(selectedPrompt.id, {
        text: formText,
        notes: formNotes
      });
      toast.success('Prompt updated');
      setEditModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast.error(error.response?.data?.detail || 'Failed to update prompt');
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
      await markPromptWeak(selectedPrompt.id, {
        replacement_text: replacementText,
        notes: formNotes
      });
      toast.success('Prompt marked as weak, new draft created');
      setWeakModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to mark prompt weak:', error);
      toast.error('Failed to mark prompt as weak');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (promptId) => {
    try {
      await publishPrompt(promptId);
      toast.success('Prompt published successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to publish prompt:', error);
      toast.error(error.response?.data?.detail || 'Failed to publish prompt');
    }
  };

  const resetForm = () => {
    setFormState('');
    setFormLanguage('en');
    setFormText('');
    setFormNotes('');
    setReplacementText('');
    setSelectedPrompt(null);
  };

  const openEditModal = (prompt) => {
    setSelectedPrompt(prompt);
    setFormText(prompt.text);
    setFormNotes(prompt.notes || '');
    setEditModalOpen(true);
  };

  const openWeakModal = (prompt) => {
    setSelectedPrompt(prompt);
    setReplacementText('');
    setFormNotes('');
    setWeakModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div data-testid="prompt-training-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Prompt Training</h1>
          <p className="text-sm text-gray-500 mt-1">Manage prompts per FSM state and language</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} data-testid="create-prompt-btn">
          <Plus size={16} className="mr-2" />
          New Prompt
        </Button>
      </div>

      {/* FSM Read-Only Notice */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3" data-testid="fsm-notice">
        <Lock className="text-blue-600 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-medium text-blue-800">FSM Logic is Read-Only</p>
          <p className="text-xs text-blue-700 mt-0.5">
            FSM states and transitions cannot be edited. Only prompts can be trained and published.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-48 h-9" data-testid="state-filter">
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
              <SelectTrigger className="w-36 h-9" data-testid="language-filter">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>

            {(selectedState || selectedLanguage) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedState(''); setSelectedLanguage(''); }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prompts Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList data-testid="prompt-tabs">
          <TabsTrigger value="active">
            Active ({activePrompts.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({draftPrompts.length})
          </TabsTrigger>
          <TabsTrigger value="weak">
            Weak ({weakPrompts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" data-testid="active-prompts-tab">
          <div className="space-y-4">
            {activePrompts.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center text-gray-400">
                  <MessageSquare className="mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm">No active prompts</p>
                  <p className="text-xs mt-1">Create and publish prompts to see them here</p>
                </CardContent>
              </Card>
            ) : (
              activePrompts.map(prompt => (
                <PromptCard 
                  key={prompt.id} 
                  prompt={prompt} 
                  onEdit={openEditModal}
                  onPublish={handlePublish}
                  onMarkWeak={openWeakModal}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="draft" data-testid="draft-prompts-tab">
          <div className="space-y-4">
            {draftPrompts.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center text-gray-400">
                  <MessageSquare className="mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm">No draft prompts</p>
                  <p className="text-xs mt-1">Drafts will appear here for review before publishing</p>
                </CardContent>
              </Card>
            ) : (
              draftPrompts.map(prompt => (
                <PromptCard 
                  key={prompt.id} 
                  prompt={prompt} 
                  onEdit={openEditModal}
                  onPublish={handlePublish}
                  onMarkWeak={openWeakModal}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="weak" data-testid="weak-prompts-tab">
          <div className="space-y-4">
            {weakPrompts.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center text-gray-400">
                  <AlertTriangle className="mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm">No weak prompts</p>
                  <p className="text-xs mt-1">Prompts marked as weak will appear here</p>
                </CardContent>
              </Card>
            ) : (
              weakPrompts.map(prompt => (
                <PromptCard 
                  key={prompt.id} 
                  prompt={prompt} 
                  showActions={false}
                  onEdit={openEditModal}
                  onPublish={handlePublish}
                  onMarkWeak={openWeakModal}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Prompt Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg" data-testid="create-prompt-modal">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>New prompts are saved as drafts until published.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>FSM State</Label>
                <Select value={formState} onValueChange={setFormState}>
                  <SelectTrigger className="mt-1" data-testid="create-state-select">
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
                <Label>Language</Label>
                <Select value={formLanguage} onValueChange={setFormLanguage}>
                  <SelectTrigger className="mt-1" data-testid="create-language-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Prompt Text</Label>
              <Textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Enter the prompt text..."
                className="mt-1 min-h-32"
                data-testid="create-text-input"
              />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add any notes about this prompt..."
                className="mt-1"
                rows={2}
                data-testid="create-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrompt} disabled={isSaving} data-testid="save-prompt-btn">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save className="mr-2" size={14} />}
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prompt Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg" data-testid="edit-prompt-modal">
          <DialogHeader>
            <DialogTitle>Edit Draft Prompt</DialogTitle>
            <DialogDescription>
              {selectedPrompt && `${selectedPrompt.fsm_state.replace('_', ' ')} - ${languageLabels[selectedPrompt.language]}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Prompt Text</Label>
              <Textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Enter the prompt text..."
                className="mt-1 min-h-32"
                data-testid="edit-text-input"
              />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add any notes..."
                className="mt-1"
                rows={2}
                data-testid="edit-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePrompt} disabled={isSaving} data-testid="update-prompt-btn">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save className="mr-2" size={14} />}
              Update Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Weak Modal */}
      <Dialog open={weakModalOpen} onOpenChange={setWeakModalOpen}>
        <DialogContent className="max-w-lg" data-testid="mark-weak-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              Mark Prompt as Weak
            </DialogTitle>
            <DialogDescription>
              You must provide replacement text. A new draft will be created automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedPrompt && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500 text-xs mb-1">Current prompt:</p>
              <p className="text-gray-700">{selectedPrompt.text}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-red-600">Replacement Text *</Label>
              <Textarea
                value={replacementText}
                onChange={(e) => setReplacementText(e.target.value)}
                placeholder="Enter improved prompt text..."
                className="mt-1 min-h-32 border-red-200 focus:border-red-400"
                data-testid="replacement-text-input"
              />
            </div>

            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Why is this prompt weak?"
                className="mt-1"
                rows={2}
                data-testid="weak-reason-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setWeakModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkWeak}
              disabled={isSaving || !replacementText.trim()}
              data-testid="confirm-mark-weak-btn"
            >
              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <AlertTriangle className="mr-2" size={14} />}
              Mark Weak & Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptTraining;
