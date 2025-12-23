from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'aira_control_tower')]

# Create the main app without a prefix
app = FastAPI(title="Aira Control Tower API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class FSMState(str, Enum):
    GREETING = "greeting"
    LANGUAGE_SELECTION = "language_selection"
    QUALIFICATION = "qualification"
    OBJECTION_HANDLING = "objection_handling"
    DEMO_OFFER = "demo_offer"
    CONFIRMATION = "confirmation"
    CLOSING = "closing"
    TRANSFER = "transfer"
    FALLBACK = "fallback"

class Language(str, Enum):
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"

class CallStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    TRANSFERRED = "transferred"

class ExitReason(str, Enum):
    COMPLETED = "completed"
    USER_HANGUP = "user_hangup"
    TIMEOUT = "timeout"
    ERROR = "error"
    TRANSFERRED = "transferred"
    NO_RESPONSE = "no_response"

class PromptStatus(str, Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    WEAK = "weak"
    ARCHIVED = "archived"

# ============== MODELS ==============

# Webcall Models
class WebcallStartRequest(BaseModel):
    test_mode: bool = True
    language: Language = Language.ENGLISH

class WebcallStartResponse(BaseModel):
    call_id: str
    session_id: str
    initial_message: str
    fsm_state: FSMState
    audio_url: Optional[str] = None

class WebcallInputRequest(BaseModel):
    call_id: str
    user_input: str

class WebcallInputResponse(BaseModel):
    call_id: str
    aira_response: str
    fsm_state: FSMState
    audio_url: Optional[str] = None
    is_final: bool = False

class WebcallEndRequest(BaseModel):
    call_id: str

# Call Models
class CallTurn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime
    speaker: str  # "user" or "aira"
    text: str
    audio_url: Optional[str] = None
    fsm_state: FSMState

class Call(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    status: CallStatus = CallStatus.ACTIVE
    fsm_state: FSMState = FSMState.GREETING
    language: Language = Language.ENGLISH
    test_mode: bool = True
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    exit_reason: Optional[ExitReason] = None
    turns: List[CallTurn] = []
    qualification_data: Dict[str, Any] = {}
    demo_intent: bool = False
    demo_confirmed: bool = False
    objections: List[str] = []

class CallListItem(BaseModel):
    id: str
    session_id: str
    status: CallStatus
    fsm_state: FSMState
    language: Language
    start_time: datetime
    end_time: Optional[datetime]
    exit_reason: Optional[ExitReason]
    demo_intent: bool
    demo_confirmed: bool
    turn_count: int

class CallListResponse(BaseModel):
    calls: List[CallListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

# Prompt Models
class Prompt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fsm_state: FSMState
    language: Language
    text: str
    status: PromptStatus = PromptStatus.DRAFT
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = "admin"
    notes: Optional[str] = None

class PromptCreateRequest(BaseModel):
    fsm_state: FSMState
    language: Language
    text: str
    notes: Optional[str] = None

class PromptUpdateRequest(BaseModel):
    text: str
    notes: Optional[str] = None

class PromptMarkWeakRequest(BaseModel):
    replacement_text: str
    notes: Optional[str] = None

# FSM State Info
class FSMStateInfo(BaseModel):
    state: FSMState
    description: str
    transitions: List[FSMState]
    is_terminal: bool

# Qualification Models
class QualificationSnapshot(BaseModel):
    call_id: str
    captured_answers: Dict[str, Any]
    objections: List[str]
    demo_intent: bool
    demo_confirmed: bool
    language: Language
    timestamp: datetime

# ============== FSM DEFINITIONS (READ-ONLY) ==============
FSM_DEFINITIONS: Dict[FSMState, FSMStateInfo] = {
    FSMState.GREETING: FSMStateInfo(
        state=FSMState.GREETING,
        description="Initial greeting and introduction",
        transitions=[FSMState.LANGUAGE_SELECTION, FSMState.QUALIFICATION],
        is_terminal=False
    ),
    FSMState.LANGUAGE_SELECTION: FSMStateInfo(
        state=FSMState.LANGUAGE_SELECTION,
        description="Detect or confirm user's preferred language",
        transitions=[FSMState.QUALIFICATION],
        is_terminal=False
    ),
    FSMState.QUALIFICATION: FSMStateInfo(
        state=FSMState.QUALIFICATION,
        description="Gather qualification information from the user",
        transitions=[FSMState.OBJECTION_HANDLING, FSMState.DEMO_OFFER, FSMState.CLOSING],
        is_terminal=False
    ),
    FSMState.OBJECTION_HANDLING: FSMStateInfo(
        state=FSMState.OBJECTION_HANDLING,
        description="Handle user objections and concerns",
        transitions=[FSMState.QUALIFICATION, FSMState.DEMO_OFFER, FSMState.CLOSING],
        is_terminal=False
    ),
    FSMState.DEMO_OFFER: FSMStateInfo(
        state=FSMState.DEMO_OFFER,
        description="Offer a product demo to qualified users",
        transitions=[FSMState.CONFIRMATION, FSMState.OBJECTION_HANDLING, FSMState.CLOSING],
        is_terminal=False
    ),
    FSMState.CONFIRMATION: FSMStateInfo(
        state=FSMState.CONFIRMATION,
        description="Confirm demo scheduling details",
        transitions=[FSMState.CLOSING, FSMState.TRANSFER],
        is_terminal=False
    ),
    FSMState.CLOSING: FSMStateInfo(
        state=FSMState.CLOSING,
        description="End the conversation gracefully",
        transitions=[],
        is_terminal=True
    ),
    FSMState.TRANSFER: FSMStateInfo(
        state=FSMState.TRANSFER,
        description="Transfer to human agent",
        transitions=[],
        is_terminal=True
    ),
    FSMState.FALLBACK: FSMStateInfo(
        state=FSMState.FALLBACK,
        description="Handle unrecognized inputs",
        transitions=[FSMState.GREETING, FSMState.QUALIFICATION],
        is_terminal=False
    ),
}

# ============== SIMULATED FSM RESPONSES ==============
def get_simulated_response(state: FSMState, user_input: str, language: Language) -> tuple[str, FSMState, bool]:
    """Simulate FSM responses for testing. In production, this connects to actual FSM."""
    
    responses = {
        FSMState.GREETING: {
            Language.ENGLISH: ("Hello! I'm Aira, your AI assistant. How can I help you today? Would you like to learn about our product?", FSMState.QUALIFICATION, False),
            Language.SPANISH: ("¡Hola! Soy Aira, tu asistente de IA. ¿Cómo puedo ayudarte hoy?", FSMState.QUALIFICATION, False),
        },
        FSMState.QUALIFICATION: {
            Language.ENGLISH: ("Great! Let me ask you a few questions. What industry is your company in?", FSMState.QUALIFICATION, False),
            Language.SPANISH: ("¡Genial! Déjame hacerte algunas preguntas. ¿En qué industria está tu empresa?", FSMState.QUALIFICATION, False),
        },
        FSMState.DEMO_OFFER: {
            Language.ENGLISH: ("Based on what you've told me, I think our solution would be perfect for you. Would you like to schedule a demo?", FSMState.CONFIRMATION, False),
            Language.SPANISH: ("Basándome en lo que me has contado, creo que nuestra solución sería perfecta para ti. ¿Te gustaría programar una demostración?", FSMState.CONFIRMATION, False),
        },
        FSMState.CONFIRMATION: {
            Language.ENGLISH: ("Perfect! I've scheduled your demo. You'll receive a confirmation email shortly. Is there anything else I can help you with?", FSMState.CLOSING, False),
            Language.SPANISH: ("¡Perfecto! He programado tu demostración. Recibirás un correo de confirmación pronto. ¿Hay algo más en lo que pueda ayudarte?", FSMState.CLOSING, False),
        },
        FSMState.CLOSING: {
            Language.ENGLISH: ("Thank you for your time today! Have a great day!", FSMState.CLOSING, True),
            Language.SPANISH: ("¡Gracias por tu tiempo hoy! ¡Que tengas un excelente día!", FSMState.CLOSING, True),
        },
        FSMState.OBJECTION_HANDLING: {
            Language.ENGLISH: ("I understand your concern. Let me address that. Our solution offers flexible pricing and a free trial period.", FSMState.DEMO_OFFER, False),
            Language.SPANISH: ("Entiendo tu preocupación. Déjame abordar eso. Nuestra solución ofrece precios flexibles y un período de prueba gratuito.", FSMState.DEMO_OFFER, False),
        },
    }
    
    # Simple intent detection for state transitions
    user_lower = user_input.lower()
    next_state = state
    
    if "demo" in user_lower or "yes" in user_lower or "interested" in user_lower:
        next_state = FSMState.DEMO_OFFER if state == FSMState.QUALIFICATION else FSMState.CONFIRMATION
    elif "no" in user_lower or "not interested" in user_lower:
        next_state = FSMState.CLOSING
    elif "concern" in user_lower or "expensive" in user_lower or "but" in user_lower:
        next_state = FSMState.OBJECTION_HANDLING
    elif state in responses:
        _, next_state, _ = responses[state].get(language, responses[state][Language.ENGLISH])
    
    if next_state in responses:
        text, _, is_final = responses[next_state].get(language, responses[next_state][Language.ENGLISH])
        return text, next_state, is_final
    
    return "I'm here to help. Could you tell me more?", FSMState.QUALIFICATION, False

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Aira Control Tower API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# -------------- WEBCALL ENDPOINTS --------------

@api_router.post("/webcall/start", response_model=WebcallStartResponse)
async def webcall_start(request: WebcallStartRequest):
    """Start a new webcall session (test mode)"""
    call_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    
    initial_message, _, _ = get_simulated_response(FSMState.GREETING, "", request.language)
    
    # Create call record
    call = Call(
        id=call_id,
        session_id=session_id,
        language=request.language,
        test_mode=request.test_mode,
        fsm_state=FSMState.GREETING,
        turns=[CallTurn(
            timestamp=datetime.now(timezone.utc),
            speaker="aira",
            text=initial_message,
            fsm_state=FSMState.GREETING
        )]
    )
    
    doc = call.model_dump()
    doc['start_time'] = doc['start_time'].isoformat()
    for turn in doc['turns']:
        turn['timestamp'] = turn['timestamp'].isoformat()
    
    await db.calls.insert_one(doc)
    
    logger.info(f"Started webcall: {call_id}")
    
    return WebcallStartResponse(
        call_id=call_id,
        session_id=session_id,
        initial_message=initial_message,
        fsm_state=FSMState.GREETING,
        audio_url=f"/api/audio/{call_id}/0"  # Simulated audio URL
    )

@api_router.post("/webcall/input", response_model=WebcallInputResponse)
async def webcall_input(request: WebcallInputRequest):
    """Send user input and get Aira's response"""
    call_doc = await db.calls.find_one({"id": request.call_id}, {"_id": 0})
    
    if not call_doc:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if call_doc['status'] != CallStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Call is not active")
    
    current_state = FSMState(call_doc['fsm_state'])
    language = Language(call_doc['language'])
    
    # Add user turn
    user_turn = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "speaker": "user",
        "text": request.user_input,
        "fsm_state": current_state
    }
    
    # Get Aira's response
    response_text, next_state, is_final = get_simulated_response(current_state, request.user_input, language)
    
    # Add Aira turn
    aira_turn = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "speaker": "aira",
        "text": response_text,
        "fsm_state": next_state
    }
    
    # Update qualification data based on input
    qualification_updates = {}
    if "company" in request.user_input.lower() or "industry" in request.user_input.lower():
        qualification_updates["industry_mentioned"] = True
    if "demo" in request.user_input.lower() or "yes" in request.user_input.lower():
        qualification_updates["demo_intent"] = True
    
    # Update call in database
    update_data = {
        "$push": {"turns": {"$each": [user_turn, aira_turn]}},
        "$set": {"fsm_state": next_state}
    }
    
    if qualification_updates:
        for key, value in qualification_updates.items():
            update_data["$set"][f"qualification_data.{key}"] = value
        if qualification_updates.get("demo_intent"):
            update_data["$set"]["demo_intent"] = True
    
    if is_final:
        update_data["$set"]["status"] = CallStatus.COMPLETED
        update_data["$set"]["end_time"] = datetime.now(timezone.utc).isoformat()
        update_data["$set"]["exit_reason"] = ExitReason.COMPLETED
    
    await db.calls.update_one({"id": request.call_id}, update_data)
    
    turn_count = len(call_doc['turns']) + 2
    
    return WebcallInputResponse(
        call_id=request.call_id,
        aira_response=response_text,
        fsm_state=next_state,
        audio_url=f"/api/audio/{request.call_id}/{turn_count - 1}",
        is_final=is_final
    )

@api_router.post("/webcall/end")
async def webcall_end(request: WebcallEndRequest):
    """End a webcall session"""
    result = await db.calls.update_one(
        {"id": request.call_id, "status": CallStatus.ACTIVE},
        {
            "$set": {
                "status": CallStatus.COMPLETED,
                "end_time": datetime.now(timezone.utc).isoformat(),
                "exit_reason": ExitReason.USER_HANGUP
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Active call not found")
    
    return {"message": "Call ended", "call_id": request.call_id}

# -------------- LIVE CALLS MONITORING --------------

@api_router.get("/calls/live", response_model=List[CallListItem])
async def get_live_calls():
    """Get all active calls for live monitoring"""
    calls = await db.calls.find(
        {"status": CallStatus.ACTIVE},
        {"_id": 0}
    ).sort("start_time", -1).to_list(100)
    
    return [
        CallListItem(
            id=c["id"],
            session_id=c["session_id"],
            status=c["status"],
            fsm_state=c["fsm_state"],
            language=c["language"],
            start_time=datetime.fromisoformat(c["start_time"]) if isinstance(c["start_time"], str) else c["start_time"],
            end_time=datetime.fromisoformat(c["end_time"]) if c.get("end_time") and isinstance(c["end_time"], str) else c.get("end_time"),
            exit_reason=c.get("exit_reason"),
            demo_intent=c.get("demo_intent", False),
            demo_confirmed=c.get("demo_confirmed", False),
            turn_count=len(c.get("turns", []))
        )
        for c in calls
    ]

# -------------- CALL HISTORY / REVIEW --------------

@api_router.get("/calls", response_model=CallListResponse)
async def get_calls(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    exit_reason: Optional[ExitReason] = None,
    demo_intent: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[CallStatus] = None
):
    """Get paginated call history with filters"""
    query = {}
    
    if exit_reason:
        query["exit_reason"] = exit_reason
    if demo_intent is not None:
        query["demo_intent"] = demo_intent
    if status:
        query["status"] = status
    if date_from:
        query["start_time"] = {"$gte": date_from}
    if date_to:
        if "start_time" in query:
            query["start_time"]["$lte"] = date_to
        else:
            query["start_time"] = {"$lte": date_to}
    
    total = await db.calls.count_documents(query)
    total_pages = (total + page_size - 1) // page_size
    
    skip = (page - 1) * page_size
    calls = await db.calls.find(query, {"_id": 0}).sort("start_time", -1).skip(skip).limit(page_size).to_list(page_size)
    
    call_items = [
        CallListItem(
            id=c["id"],
            session_id=c["session_id"],
            status=c["status"],
            fsm_state=c["fsm_state"],
            language=c["language"],
            start_time=datetime.fromisoformat(c["start_time"]) if isinstance(c["start_time"], str) else c["start_time"],
            end_time=datetime.fromisoformat(c["end_time"]) if c.get("end_time") and isinstance(c["end_time"], str) else c.get("end_time"),
            exit_reason=c.get("exit_reason"),
            demo_intent=c.get("demo_intent", False),
            demo_confirmed=c.get("demo_confirmed", False),
            turn_count=len(c.get("turns", []))
        )
        for c in calls
    ]
    
    return CallListResponse(
        calls=call_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@api_router.get("/calls/{call_id}", response_model=Call)
async def get_call_detail(call_id: str):
    """Get full call details including timeline"""
    call = await db.calls.find_one({"id": call_id}, {"_id": 0})
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Convert timestamps
    if isinstance(call.get("start_time"), str):
        call["start_time"] = datetime.fromisoformat(call["start_time"])
    if call.get("end_time") and isinstance(call["end_time"], str):
        call["end_time"] = datetime.fromisoformat(call["end_time"])
    for turn in call.get("turns", []):
        if isinstance(turn.get("timestamp"), str):
            turn["timestamp"] = datetime.fromisoformat(turn["timestamp"])
    
    return Call(**call)

@api_router.get("/calls/{call_id}/qualification", response_model=QualificationSnapshot)
async def get_call_qualification(call_id: str):
    """Get qualification snapshot for a call"""
    call = await db.calls.find_one({"id": call_id}, {"_id": 0})
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    return QualificationSnapshot(
        call_id=call_id,
        captured_answers=call.get("qualification_data", {}),
        objections=call.get("objections", []),
        demo_intent=call.get("demo_intent", False),
        demo_confirmed=call.get("demo_confirmed", False),
        language=call["language"],
        timestamp=datetime.fromisoformat(call["start_time"]) if isinstance(call["start_time"], str) else call["start_time"]
    )

# -------------- FSM STATE INFO (READ-ONLY) --------------

@api_router.get("/fsm/states", response_model=List[FSMStateInfo])
async def get_fsm_states():
    """Get all FSM state definitions (read-only)"""
    return list(FSM_DEFINITIONS.values())

@api_router.get("/fsm/states/{state}", response_model=FSMStateInfo)
async def get_fsm_state(state: FSMState):
    """Get a specific FSM state definition (read-only)"""
    if state not in FSM_DEFINITIONS:
        raise HTTPException(status_code=404, detail="FSM state not found")
    return FSM_DEFINITIONS[state]

# -------------- PROMPT MANAGEMENT --------------

@api_router.get("/prompts", response_model=List[Prompt])
async def get_prompts(
    fsm_state: Optional[FSMState] = None,
    language: Optional[Language] = None,
    status: Optional[PromptStatus] = None
):
    """Get all prompts with optional filters"""
    query = {}
    if fsm_state:
        query["fsm_state"] = fsm_state
    if language:
        query["language"] = language
    if status:
        query["status"] = status
    
    prompts = await db.prompts.find(query, {"_id": 0}).sort([("fsm_state", 1), ("language", 1), ("version", -1)]).to_list(1000)
    
    for p in prompts:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
        if isinstance(p.get("updated_at"), str):
            p["updated_at"] = datetime.fromisoformat(p["updated_at"])
    
    return [Prompt(**p) for p in prompts]

@api_router.get("/prompts/{prompt_id}", response_model=Prompt)
async def get_prompt(prompt_id: str):
    """Get a specific prompt"""
    prompt = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if isinstance(prompt.get("created_at"), str):
        prompt["created_at"] = datetime.fromisoformat(prompt["created_at"])
    if isinstance(prompt.get("updated_at"), str):
        prompt["updated_at"] = datetime.fromisoformat(prompt["updated_at"])
    
    return Prompt(**prompt)

@api_router.post("/prompts", response_model=Prompt)
async def create_prompt(request: PromptCreateRequest):
    """Create a new prompt (saved as draft)"""
    # Get current max version for this state/language combo
    existing = await db.prompts.find(
        {"fsm_state": request.fsm_state, "language": request.language}
    ).sort("version", -1).limit(1).to_list(1)
    
    version = 1
    if existing:
        version = existing[0].get("version", 0) + 1
    
    prompt = Prompt(
        fsm_state=request.fsm_state,
        language=request.language,
        text=request.text,
        notes=request.notes,
        version=version,
        status=PromptStatus.DRAFT
    )
    
    doc = prompt.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.prompts.insert_one(doc)
    
    return prompt

@api_router.put("/prompts/{prompt_id}", response_model=Prompt)
async def update_prompt(prompt_id: str, request: PromptUpdateRequest):
    """Update a prompt (only drafts can be edited)"""
    prompt = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if prompt["status"] == PromptStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Cannot edit active prompts. Create a new draft instead.")
    
    update_data = {
        "text": request.text,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if request.notes:
        update_data["notes"] = request.notes
    
    await db.prompts.update_one({"id": prompt_id}, {"$set": update_data})
    
    updated = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    if isinstance(updated.get("updated_at"), str):
        updated["updated_at"] = datetime.fromisoformat(updated["updated_at"])
    
    return Prompt(**updated)

@api_router.post("/prompts/{prompt_id}/mark-weak", response_model=Prompt)
async def mark_prompt_weak(prompt_id: str, request: PromptMarkWeakRequest):
    """Mark a prompt as weak and provide replacement text"""
    prompt = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if not request.replacement_text.strip():
        raise HTTPException(status_code=400, detail="Replacement text is required when marking a prompt as weak")
    
    # Mark current as weak
    await db.prompts.update_one(
        {"id": prompt_id},
        {"$set": {"status": PromptStatus.WEAK, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create new draft with replacement
    new_prompt = Prompt(
        fsm_state=prompt["fsm_state"],
        language=prompt["language"],
        text=request.replacement_text,
        notes=request.notes or f"Replacement for weak prompt {prompt_id}",
        version=prompt["version"] + 1,
        status=PromptStatus.DRAFT
    )
    
    doc = new_prompt.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.prompts.insert_one(doc)
    
    return new_prompt

@api_router.post("/prompts/{prompt_id}/publish", response_model=Prompt)
async def publish_prompt(prompt_id: str):
    """Publish a draft prompt (makes it active)"""
    prompt = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if prompt["status"] != PromptStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft prompts can be published")
    
    # Archive current active prompt for this state/language
    await db.prompts.update_many(
        {
            "fsm_state": prompt["fsm_state"],
            "language": prompt["language"],
            "status": PromptStatus.ACTIVE
        },
        {"$set": {"status": PromptStatus.ARCHIVED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Publish the draft
    await db.prompts.update_one(
        {"id": prompt_id},
        {"$set": {"status": PromptStatus.ACTIVE, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    if isinstance(updated.get("updated_at"), str):
        updated["updated_at"] = datetime.fromisoformat(updated["updated_at"])
    
    return Prompt(**updated)

# -------------- AUDIO PLACEHOLDER --------------

@api_router.get("/audio/{call_id}/{turn_index}")
async def get_audio(call_id: str, turn_index: int):
    """Placeholder for audio retrieval - would connect to ElevenLabs in production"""
    return {
        "message": "Audio endpoint placeholder",
        "call_id": call_id,
        "turn_index": turn_index,
        "note": "In production, this would return audio from ElevenLabs"
    }

# -------------- STATS ENDPOINT --------------

@api_router.get("/stats")
async def get_stats():
    """Get basic statistics for the dashboard"""
    total_calls = await db.calls.count_documents({})
    active_calls = await db.calls.count_documents({"status": CallStatus.ACTIVE})
    completed_calls = await db.calls.count_documents({"status": CallStatus.COMPLETED})
    demo_intents = await db.calls.count_documents({"demo_intent": True})
    
    return {
        "total_calls": total_calls,
        "active_calls": active_calls,
        "completed_calls": completed_calls,
        "demo_intents": demo_intents
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
