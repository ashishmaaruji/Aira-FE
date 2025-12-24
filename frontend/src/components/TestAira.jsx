import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { webcallStart, webcallInput, webcallEnd, getAudioUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Phone, PhoneOff, Send, AlertCircle, Loader2, Volume2, VolumeX, VolumeOff, Play, Pause, Clock } from 'lucide-react';

// Activity type labels
const ACTIVITY_LABELS = {
  activity_detected: 'Activity detected',
  silence: 'Silence',
  hangup: 'Hangup',
  timeout: 'Timeout'
};

// Audio Player Component
const AudioPlayer = ({ audioUrl, size = 'sm' }) => {
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
    <div className="inline-flex items-center gap-1">
      <audio ref={audioRef} src={fullUrl} preload="none" />
      <button
        onClick={togglePlay}
        disabled={hasError}
        className={`p-1 rounded hover:bg-gray-200 transition-colors ${hasError ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={hasError ? 'Audio unavailable' : isPlaying ? 'Pause' : 'Play'}
      >
        {hasError ? (
          <VolumeX size={size === 'sm' ? 14 : 16} className="text-gray-400" />
        ) : isPlaying ? (
          <Pause size={size === 'sm' ? 14 : 16} className="text-gray-600" />
        ) : (
          <Play size={size === 'sm' ? 14 : 16} className="text-gray-600" />
        )}
      </button>
    </div>
  );
};

const TestAira = () => {
  const [callState, setCallState] = useState('idle'); // idle, connecting, active, ended
  const [callId, setCallId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [language, setLanguage] = useState('HINGLISH');
  const [fsmState, setFsmState] = useState(null);
  const [silenceCount, setSilenceCount] = useState(0);
  const [objectionCount, setObjectionCount] = useState(0);
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
      const response = await webcallStart({ 
        testMode: true, 
        language: language 
      });
      const data = response.data;
      
      setCallId(data.callId || data.call_id);
      setSessionId(data.sessionId || data.session_id);
      setFsmState(data.fsmState || data.fsm_state || 'greeting');
      setSilenceCount(data.silenceCount || 0);
      setObjectionCount(data.objectionCount || 0);
      
      setMessages([{
        id: Date.now(),
        speaker: 'aira',
        text: data.initialMessage || data.initial_message || data.message || 'Hello! How can I help you?',
        timestamp: new Date(),
        fsmState: data.fsmState || data.fsm_state || 'greeting',
        audioUrl: data.audioUrl || data.audio_url
      }]);
      
      setCallState('active');
      toast.success('Call started');
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to connect to Spring Boot backend');
      setCallState('idle');
    }
  };

  const handleSendInput = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !callId || isLoading) return;

    // In test mode, we simulate user activity (not transcription)
    const userActivity = {
      id: Date.now(),
      speaker: 'user',
      activityType: 'activity_detected', // Test mode simulates activity
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userActivity]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await webcallInput({ 
        callId: callId,
        call_id: callId, 
        userInput: inputText,
        user_input: inputText 
      });
      const data = response.data;
      
      const newFsmState = data.fsmState || data.fsm_state || fsmState;
      setFsmState(newFsmState);
      setSilenceCount(data.silenceCount || silenceCount);
      setObjectionCount(data.objectionCount || objectionCount);
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        speaker: 'aira',
        text: data.airaResponse || data.aira_response || data.response || data.message,
        timestamp: new Date(),
        fsmState: newFsmState,
        audioUrl: data.audioUrl || data.audio_url
      }]);

      if (data.isFinal || data.is_final) {
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
      await webcallEnd({ callId: callId, call_id: callId });
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
    setSilenceCount(0);
    setObjectionCount(0);
    setMessages([]);
    setInputText('');
  };

  return (
    <div className="max-w-3xl" data-testid="test-aira-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Test Aira</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dev/Test Mode — Simulates voice interaction via text</p>
      </div>

      {/* Test Mode Banner */}
      <div className="mb-5 bg-amber-50/80 border border-amber-100 rounded-md px-4 py-3 flex items-start gap-3" data-testid="test-mode-banner">
        <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
        <div>
          <p className="text-sm font-medium text-amber-800">Test Mode Active</p>
          <p className="text-xs text-amber-600 mt-0.5">Internal testing only. No IVR integration.</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="shadow-sm border-gray-100">
        {/* Status Bar */}
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            {callState === 'idle' && (
              <Select value={language} onValueChange={setLanguage} data-testid="language-select">
                <SelectTrigger className="w-32 h-8 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HINGLISH">Hinglish</SelectItem>
                  <SelectItem value="ENGLISH">English</SelectItem>
                </SelectContent>
              </Select>
            )}
            {sessionId && (
              <span className="text-xs text-gray-400 font-mono">
                {sessionId.slice(0, 8)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {fsmState && (
              <Badge className={`state-${fsmState} text-[11px] font-medium`} data-testid="current-fsm-state">
                {fsmState.replace('_', ' ')}
              </Badge>
            )}
            {callState === 'active' && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">Silence: <span className="font-medium text-gray-700">{silenceCount}</span></span>
                <span className="text-gray-500">Objections: <span className="font-medium text-gray-700">{objectionCount}</span></span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-slow" />
                  <span className="text-green-600 font-medium">Active</span>
                </div>
              </div>
            )}
            {callState === 'ended' && (
              <span className="text-xs text-gray-400">Call Ended</span>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {/* Messages Area */}
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {messages.length === 0 && callState === 'idle' && (
                <div className="text-center py-16 text-gray-400">
                  <Phone className="mx-auto mb-3 opacity-30" size={28} />
                  <p className="text-sm">Click &quot;Call Aira&quot; to start a test session</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${msg.speaker}`}
                >
                  {msg.speaker === 'user' ? (
                    /* User Activity - no transcription */
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                      {msg.activityType === 'silence' && <VolumeOff size={14} className="text-amber-400" />}
                      {msg.activityType === 'activity_detected' && <Volume2 size={14} className="text-green-400" />}
                      {msg.activityType === 'hangup' && <Phone size={14} className="text-red-400" />}
                      {msg.activityType === 'timeout' && <Clock size={14} className="text-gray-400" />}
                      {!msg.activityType && <Volume2 size={14} className="text-green-400" />}
                      <span className="text-[12px] text-gray-300">
                        {ACTIVITY_LABELS[msg.activityType] || 'User Activity'}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    /* Aira Response - with text and audio */
                    <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 bg-gray-100 text-gray-900">
                      <p className="text-[13px] leading-relaxed">{msg.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-gray-400">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.fsmState && (
                          <span className="text-[10px] text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded">
                            {msg.fsmState}
                          </span>
                        )}
                        {msg.audioUrl && (
                          <AudioPlayer audioUrl={msg.audioUrl} size="sm" />
                        )}
                      </div>
                    </div>
                  )}
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
          <div className="p-4 border-t border-gray-50 bg-white">
            {callState === 'idle' && (
              <Button
                onClick={handleStartCall}
                className="w-full bg-gray-900 hover:bg-gray-800"
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
                  className="flex-1 text-sm"
                  disabled={isLoading}
                  data-testid="message-input"
                />
                <Button 
                  type="submit" 
                  disabled={!inputText.trim() || isLoading} 
                  data-testid="send-btn"
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  <Send size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEndCall}
                  data-testid="end-call-btn"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <PhoneOff size={16} />
                </Button>
              </form>
            )}

            {callState === 'ended' && (
              <Button 
                onClick={handleNewCall} 
                className="w-full bg-gray-900 hover:bg-gray-800" 
                data-testid="new-call-btn"
              >
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
