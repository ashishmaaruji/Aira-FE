import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { webcallStart, webcallInput, webcallEnd } from '@/lib/api';
import { toast } from 'sonner';
import { Phone, PhoneOff, Send, AlertCircle, Loader2, Volume2 } from 'lucide-react';

const TestAira = () => {
  const [callState, setCallState] = useState('idle'); // idle, connecting, active, ended
  const [callId, setCallId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [language, setLanguage] = useState('en');
  const [fsmState, setFsmState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartCall = async () => {
    setCallState('connecting');
    try {
      const response = await webcallStart({ test_mode: true, language });
      const data = response.data;
      setCallId(data.call_id);
      setSessionId(data.session_id);
      setFsmState(data.fsm_state);
      setMessages([{
        id: Date.now(),
        speaker: 'aira',
        text: data.initial_message,
        timestamp: new Date(),
        fsmState: data.fsm_state,
        audioUrl: data.audio_url
      }]);
      setCallState('active');
      toast.success('Call started successfully');
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start call');
      setCallState('idle');
    }
  };

  const handleSendInput = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !callId || isLoading) return;

    const userMessage = {
      id: Date.now(),
      speaker: 'user',
      text: inputText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await webcallInput({ call_id: callId, user_input: inputText });
      const data = response.data;
      setFsmState(data.fsm_state);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        speaker: 'aira',
        text: data.aira_response,
        timestamp: new Date(),
        fsmState: data.fsm_state,
        audioUrl: data.audio_url
      }]);

      if (data.is_final) {
        setCallState('ended');
        toast.info('Call completed');
      }
    } catch (error) {
      console.error('Failed to send input:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!callId) return;
    try {
      await webcallEnd({ call_id: callId });
      setCallState('ended');
      toast.success('Call ended');
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end call');
    }
  };

  const handleNewCall = () => {
    setCallState('idle');
    setCallId(null);
    setSessionId(null);
    setFsmState(null);
    setMessages([]);
    setInputText('');
  };

  return (
    <div className="max-w-3xl mx-auto" data-testid="test-aira-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Test Aira</h1>
        <p className="text-sm text-gray-500 mt-1">Dev/Test Mode - Simulates voice interaction via text</p>
      </div>

      {/* Test Mode Banner */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" data-testid="test-mode-banner">
        <AlertCircle className="text-amber-600 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-medium text-amber-800">Test Mode Active</p>
          <p className="text-xs text-amber-700 mt-0.5">This is for internal testing only. No IVR integration.</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Voice Simulation</CardTitle>
              <CardDescription>Test FSM flow, prompts, and responses</CardDescription>
            </div>
            {fsmState && (
              <Badge className={`state-${fsmState}`} data-testid="current-fsm-state">
                {fsmState.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Call Status Bar */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {callState === 'idle' && (
                <Select value={language} onValueChange={setLanguage} data-testid="language-select">
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {callId && (
                <span className="text-xs text-gray-500">
                  Session: {sessionId?.slice(0, 8)}...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {callState === 'active' && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-700 font-medium">Active</span>
                </div>
              )}
              {callState === 'ended' && (
                <span className="text-xs text-gray-500 font-medium">Call Ended</span>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="h-96">
            <div className="p-4 space-y-4">
              {messages.length === 0 && callState === 'idle' && (
                <div className="text-center py-12 text-gray-400">
                  <Phone className="mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm">Click &quot;Call Aira&quot; to start a test session</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${msg.speaker}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.speaker === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs opacity-60">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      {msg.fsmState && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {msg.fsmState}
                        </Badge>
                      )}
                      {msg.audioUrl && msg.speaker === 'aira' && (
                        <button className="opacity-60 hover:opacity-100" title="Play audio">
                          <Volume2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <Loader2 className="animate-spin text-gray-400" size={16} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100">
            {callState === 'idle' && (
              <Button
                onClick={handleStartCall}
                className="w-full"
                data-testid="start-call-btn"
              >
                <Phone className="mr-2" size={16} />
                Call Aira
              </Button>
            )}

            {callState === 'connecting' && (
              <Button disabled className="w-full">
                <Loader2 className="mr-2 animate-spin" size={16} />
                Connecting...
              </Button>
            )}

            {callState === 'active' && (
              <form onSubmit={handleSendInput} className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="message-input"
                />
                <Button type="submit" disabled={!inputText.trim() || isLoading} data-testid="send-btn">
                  <Send size={16} />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleEndCall}
                  data-testid="end-call-btn"
                >
                  <PhoneOff size={16} />
                </Button>
              </form>
            )}

            {callState === 'ended' && (
              <Button onClick={handleNewCall} className="w-full" data-testid="new-call-btn">
                <Phone className="mr-2" size={16} />
                Start New Call
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAira;
