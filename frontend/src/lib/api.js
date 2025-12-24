import axios from 'axios';

// Spring Boot Backend URL
// In production, use environment variable; locally defaults to localhost:8080
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============== WEBCALL APIs (Spring Boot - Available) ==============
export const webcallStart = (data) => api.post('/webcall/start', data);
export const webcallInput = (data) => api.post('/webcall/input', data);
export const webcallEnd = (data) => api.post('/webcall/end', data);

// Audio URL builder
// Handles: full URLs, relative paths (/audio/file.mp3), or just filenames (file.mp3)
export const getAudioUrl = (audioUrl) => {
  if (!audioUrl) return null;
  
  // If already a full URL, return as-is
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    return audioUrl;
  }
  
  // If it's a relative path (starts with /), prefix with backend URL
  if (audioUrl.startsWith('/')) {
    return `${BACKEND_URL}${audioUrl}`;
  }
  
  // Otherwise, assume it's just a filename - add /audio/ path
  return `${BACKEND_URL}/audio/${audioUrl}`;
};

// ============== ADMIN APIs (Spring Boot - Planned, mocked if unavailable) ==============

// Live Calls Monitoring
export const getLiveCalls = async () => {
  try {
    return await api.get('/admin/calls/live');
  } catch (error) {
    // Mock response if endpoint not yet available
    console.warn('Using mock data for /admin/calls/live');
    return { data: getMockLiveCalls() };
  }
};

// Call History
export const getCalls = async (params) => {
  try {
    return await api.get('/admin/calls', { params });
  } catch (error) {
    console.warn('Using mock data for /admin/calls');
    return { data: getMockCallHistory(params) };
  }
};

export const getCallDetail = async (callId) => {
  try {
    return await api.get(`/admin/calls/${callId}`);
  } catch (error) {
    console.warn('Using mock data for call detail');
    return { data: getMockCallDetail(callId) };
  }
};

export const getCallQualification = async (callId) => {
  try {
    return await api.get(`/admin/calls/${callId}/qualification`);
  } catch (error) {
    console.warn('Using mock data for qualification');
    return { data: getMockQualification(callId) };
  }
};

// FSM States (read-only)
export const getFSMStates = async () => {
  try {
    return await api.get('/admin/fsm/states');
  } catch (error) {
    console.warn('Using mock data for FSM states');
    return { data: getMockFSMStates() };
  }
};

// Prompts Management
export const getPrompts = async (params) => {
  try {
    return await api.get('/admin/prompts', { params });
  } catch (error) {
    console.warn('Using mock data for prompts');
    return { data: getMockPrompts(params) };
  }
};

export const updatePromptDraft = async (promptId, data) => {
  try {
    return await api.put('/admin/prompts/draft', { id: promptId, ...data });
  } catch (error) {
    console.warn('Mock: Draft saved locally');
    return { data: { success: true, message: 'Draft saved (mock)' } };
  }
};

export const publishPrompt = async (promptId) => {
  try {
    return await api.post('/admin/prompts/publish', { id: promptId });
  } catch (error) {
    console.warn('Mock: Prompt published locally');
    return { data: { success: true, message: 'Prompt published (mock)' } };
  }
};

export const markPromptWeak = async (promptId, replacementText) => {
  try {
    return await api.post('/admin/prompts/mark-weak', { id: promptId, replacement: replacementText });
  } catch (error) {
    console.warn('Mock: Prompt marked weak locally');
    return { data: { success: true, message: 'Prompt marked weak (mock)' } };
  }
};

// Stats
export const getStats = async () => {
  try {
    return await api.get('/admin/stats');
  } catch (error) {
    console.warn('Using mock stats');
    return { data: getMockStats() };
  }
};

// ============== CALL POLICY APIs ==============

export const getPolicy = async () => {
  try {
    return await api.get('/admin/policy');
  } catch (error) {
    console.warn('Using mock data for policy');
    return { data: getMockPolicy() };
  }
};

export const updatePolicyDraft = async (data) => {
  try {
    return await api.put('/admin/policy/draft', data);
  } catch (error) {
    console.warn('Mock: Policy draft saved locally');
    return { data: { success: true, message: 'Policy draft saved (mock)', draft: data } };
  }
};

export const publishPolicy = async () => {
  try {
    return await api.post('/admin/policy/publish');
  } catch (error) {
    console.warn('Mock: Policy published locally');
    return { data: { success: true, message: 'Policy published (mock)' } };
  }
};

// ============== MOCK DATA (Until Spring Boot endpoints are ready) ==============

const getMockLiveCalls = () => [
  {
    id: 'call-001',
    sessionId: 'sess-abc123',
    status: 'active',
    fsmState: 'qualification',
    language: 'HINGLISH',
    startTime: new Date(Date.now() - 120000).toISOString(),
    turnCount: 4,
    silenceCount: 1,
    objectionCount: 0
  },
  {
    id: 'call-002',
    sessionId: 'sess-def456',
    status: 'active',
    fsmState: 'demo_offer',
    language: 'ENGLISH',
    startTime: new Date(Date.now() - 300000).toISOString(),
    turnCount: 8,
    silenceCount: 0,
    objectionCount: 2
  }
];

const getMockCallHistory = (params) => {
  const page = params?.page || 1;
  const pageSize = params?.page_size || 20;
  
  const mockCalls = Array.from({ length: 50 }, (_, i) => ({
    id: `call-${100 + i}`,
    sessionId: `sess-${Math.random().toString(36).substr(2, 9)}`,
    status: i % 5 === 0 ? 'active' : 'completed',
    fsmState: ['greeting', 'qualification', 'demo_offer', 'confirmation', 'closing'][i % 5],
    language: i % 2 === 0 ? 'HINGLISH' : 'ENGLISH',
    startTime: new Date(Date.now() - (i * 3600000)).toISOString(),
    endTime: i % 5 !== 0 ? new Date(Date.now() - (i * 3600000) + 600000).toISOString() : null,
    exitReason: i % 5 !== 0 ? ['completed', 'user_hangup', 'timeout'][i % 3] : null,
    demoIntent: i % 3 === 0,
    demoConfirmed: i % 6 === 0,
    turnCount: 3 + (i % 10)
  }));

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    calls: mockCalls.slice(start, end),
    total: mockCalls.length,
    page,
    pageSize,
    totalPages: Math.ceil(mockCalls.length / pageSize)
  };
};

const getMockCallDetail = (callId) => ({
  id: callId,
  sessionId: 'sess-mock-detail',
  status: 'completed',
  fsmState: 'closing',
  language: 'HINGLISH',
  startTime: new Date(Date.now() - 600000).toISOString(),
  endTime: new Date().toISOString(),
  exitReason: 'completed',
  demoIntent: true,
  demoConfirmed: true,
  silenceCount: 2,
  objectionCount: 1,
  turns: [
    { id: 't1', timestamp: new Date(Date.now() - 590000).toISOString(), speaker: 'aira', text: 'Namaste! Main Aira hoon. Aap kaise hain aaj?', fsmState: 'greeting', audioUrl: '/audio/greeting_01.mp3' },
    { id: 't2', timestamp: new Date(Date.now() - 580000).toISOString(), speaker: 'user', activityType: 'activity_detected', fsmState: 'greeting' },
    { id: 't3', timestamp: new Date(Date.now() - 570000).toISOString(), speaker: 'aira', text: 'Bahut accha! Aap konse area mein property dhundh rahe hain?', fsmState: 'qualification', audioUrl: '/audio/qualification_01.mp3' },
    { id: 't4', timestamp: new Date(Date.now() - 560000).toISOString(), speaker: 'user', activityType: 'activity_detected', fsmState: 'qualification' },
    { id: 't5', timestamp: new Date(Date.now() - 550000).toISOString(), speaker: 'aira', text: 'Bahut badhiya! Hamare paas Gurugram mein kaafi options hain. Kya aap ek demo dekhna chahenge?', fsmState: 'demo_offer', audioUrl: '/audio/demo_offer_01.mp3' },
    { id: 't6', timestamp: new Date(Date.now() - 540000).toISOString(), speaker: 'user', activityType: 'silence', fsmState: 'demo_offer' },
    { id: 't7', timestamp: new Date(Date.now() - 535000).toISOString(), speaker: 'aira', text: 'Kya aap abhi bhi line par hain?', fsmState: 'demo_offer', audioUrl: '/audio/silence_prompt_01.mp3' },
    { id: 't8', timestamp: new Date(Date.now() - 530000).toISOString(), speaker: 'user', activityType: 'activity_detected', fsmState: 'demo_offer' },
    { id: 't9', timestamp: new Date(Date.now() - 520000).toISOString(), speaker: 'aira', text: 'Perfect! Main aapko kal 3 baje ke liye schedule kar deti hoon. Kya yeh time theek hai?', fsmState: 'confirmation', audioUrl: '/audio/confirmation_01.mp3' },
    { id: 't10', timestamp: new Date(Date.now() - 510000).toISOString(), speaker: 'user', activityType: 'activity_detected', fsmState: 'confirmation' },
    { id: 't11', timestamp: new Date(Date.now() - 500000).toISOString(), speaker: 'aira', text: 'Dhanyavaad! Aapka demo kal 3 baje scheduled hai. Aapka din accha ho!', fsmState: 'closing', audioUrl: '/audio/closing_01.mp3' }
  ],
  qualificationData: {
    location: 'Gurugram',
    propertyType: '3BHK',
    budget: 'Not specified',
    timeline: 'Immediate'
  }
});

const getMockQualification = (callId) => ({
  callId,
  capturedAnswers: {
    location: 'Gurugram',
    propertyType: '3BHK',
    budget: '1-2 Cr',
    timeline: 'Immediate'
  },
  objections: ['Price concern mentioned'],
  demoIntent: true,
  demoConfirmed: true,
  language: 'HINGLISH',
  timestamp: new Date().toISOString()
});

const getMockFSMStates = () => [
  { state: 'greeting', description: 'Initial greeting and introduction', transitions: ['language_selection', 'qualification'], isTerminal: false },
  { state: 'language_selection', description: 'Detect or confirm preferred language', transitions: ['qualification'], isTerminal: false },
  { state: 'qualification', description: 'Gather qualification information', transitions: ['objection_handling', 'demo_offer', 'closing'], isTerminal: false },
  { state: 'objection_handling', description: 'Handle user objections and concerns', transitions: ['qualification', 'demo_offer', 'closing'], isTerminal: false },
  { state: 'demo_offer', description: 'Offer a product demo', transitions: ['confirmation', 'objection_handling', 'closing'], isTerminal: false },
  { state: 'confirmation', description: 'Confirm demo scheduling details', transitions: ['closing', 'transfer'], isTerminal: false },
  { state: 'closing', description: 'End conversation gracefully', transitions: [], isTerminal: true },
  { state: 'transfer', description: 'Transfer to human agent', transitions: [], isTerminal: true },
  { state: 'fallback', description: 'Handle unrecognized inputs', transitions: ['greeting', 'qualification'], isTerminal: false }
];

const getMockPrompts = (params) => {
  const prompts = [
    { id: 'p1', fsmState: 'greeting', language: 'HINGLISH', text: 'Namaste! Main Aira hoon, aapki AI assistant. Aaj main aapki kaise madad kar sakti hoon?', status: 'active', version: 3, updatedAt: new Date().toISOString() },
    { id: 'p2', fsmState: 'greeting', language: 'ENGLISH', text: 'Hello! I am Aira, your AI assistant. How can I help you today?', status: 'active', version: 2, updatedAt: new Date().toISOString() },
    { id: 'p3', fsmState: 'qualification', language: 'HINGLISH', text: 'Bahut accha! Aap konse area mein property dhundh rahe hain?', status: 'active', version: 1, updatedAt: new Date().toISOString() },
    { id: 'p4', fsmState: 'qualification', language: 'ENGLISH', text: 'Great! Which area are you looking for a property in?', status: 'active', version: 1, updatedAt: new Date().toISOString() },
    { id: 'p5', fsmState: 'demo_offer', language: 'HINGLISH', text: 'Kya aap ek demo dekhna chahenge?', status: 'draft', version: 2, updatedAt: new Date().toISOString(), notes: 'Testing new phrasing' },
    { id: 'p6', fsmState: 'objection_handling', language: 'HINGLISH', text: 'Main samajhti hoon aapki chinta. Hamara pricing flexible hai.', status: 'weak', version: 1, updatedAt: new Date().toISOString() }
  ];

  let filtered = prompts;
  if (params?.fsmState) filtered = filtered.filter(p => p.fsmState === params.fsmState);
  if (params?.language) filtered = filtered.filter(p => p.language === params.language);
  if (params?.status) filtered = filtered.filter(p => p.status === params.status);

  return filtered;
};

const getMockStats = () => ({
  totalCalls: 1247,
  activeCalls: 3,
  completedCalls: 1198,
  demoIntents: 412,
  conversionRate: 33
});

const getMockPolicy = () => ({
  // Active policy (currently in use)
  active: {
    retryRules: {
      maxAttempts: 3,
      delayMinutes: 30
    },
    callingHours: {
      startTime: '09:00',
      endTime: '20:00',
      sundayAllowed: false,
      newLeadOverrideMinutes: 15
    },
    numberHealth: {
      failureCountThreshold: 5,
      answerRateThreshold: 20,
      hangupDurationThreshold: 3
    },
    silenceRules: {
      timeoutSeconds: 8,
      maxSilenceStrikes: 3
    },
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    publishedAt: new Date(Date.now() - 86400000).toISOString()
  },
  // Draft policy (unpublished changes)
  draft: null,
  // Current number status (read-only)
  numberStatus: {
    primaryNumber: '+91-9876543210',
    status: 'healthy',
    failureCount: 2,
    answerRate: 45,
    avgHangupDuration: 12,
    lastChecked: new Date().toISOString()
  }
});

export default api;
