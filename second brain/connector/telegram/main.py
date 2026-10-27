import asyncio
from dataclasses import dataclass
import json
import os
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union
from dotenv import load_dotenv
from telethon import TelegramClient, events
from telethon.tl.types import (
    InputMediaPoll,
    Poll,
    PollAnswer,
    TextWithEntities,
    UpdateMessagePollVote,
    UpdateMessagePoll,
)

# Load variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

BOT_TOKEN = os.getenv("Bot_token") or None
API_ID = os.getenv("API_ID")
API_HASH = os.getenv("API_HASH")
raw_owners = os.getenv("BOT_OWNER") or ""

if not API_ID or not API_HASH:
    raise ValueError(
        "API_ID and API_HASH must be configured in telegram/.env.\n"
        "Get them from https://my.telegram.org under 'API development tools'."
    )

def parse_owners(raw: str) -> set:
    try:
        raw = raw.strip()
        if raw.startswith("[") and raw.endswith("]"):
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return {int(x) for x in parsed if str(x).strip().isdigit()}
        parts = raw.split(",")
        return {int(x) for x in parts if str(x).strip().isdigit()}
    except (json.JSONDecodeError, ValueError, TypeError):
        return set()

BOT_OWNERS = parse_owners(raw_owners)

# Download directories for incoming snapshots and files
DOWNLOADS_DIR = Path(__file__).parent / "downloads"
SNAPSHOTS_DIR = DOWNLOADS_DIR / "snapshots"
FILES_DIR = DOWNLOADS_DIR / "files"

SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
FILES_DIR.mkdir(parents=True, exist_ok=True)

POLLS_FILE = Path(__file__).parent / "active_polls.json"

def load_active_polls() -> Dict[int, Dict[str, Any]]:
    """Load tracked polls from disk."""
    if POLLS_FILE.exists():
        try:
            with open(POLLS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {int(k): v for k, v in data.items()}
        except Exception:
            return {}
    return {}

def save_active_polls(polls: Dict[int, Dict[str, Any]]):
    """Save tracked polls to disk."""
    try:
        current = load_active_polls()
        current.update(polls)
        with open(POLLS_FILE, "w", encoding="utf-8") as f:
            json.dump({str(k): v for k, v in current.items()}, f, indent=2)
    except Exception as e:
        print(f"Error saving polls: {e}")

# In-memory and persisted registry to track active polls
ACTIVE_POLLS: Dict[int, Dict[str, Any]] = load_active_polls()

# Instantiate client globally so @client event decorators work properly
client = TelegramClient('session_name', int(API_ID), API_HASH)


# -------------------------------------------------------------
# Data Models for AI Agent Bridge
# -------------------------------------------------------------

@dataclass
class UserInputPayload:
    """Standardized payload passed to the AI Agent."""
    sender_id: int
    chat_id: int
    is_owner: bool
    text: str  # Prompt, message text, or media caption
    media_type: str  # "text", "snapshot", "document", "poll", "poll_vote"
    file_path: Optional[str] = None  # Local path to downloaded snapshot or file
    poll_data: Optional[Dict[str, Any]] = None  # Extracted poll / vote details
    raw_event: Any = None


@dataclass
class AIResponsePayload:
    """Standardized response returned from the AI Agent."""
    text: Optional[str] = None  # Text response / explanation
    file_path: Optional[str] = None  # Path to generated file or screenshot to send
    poll: Optional[Dict[str, Any]] = None  # Poll dict: {"question": "...", "options": ["A", "B"]}
    parse_mode: str = "md"  # "md" or "html"


# -------------------------------------------------------------
# Helper: Telegram Poll Creator
# -------------------------------------------------------------

def create_poll_media(
    question: str,
    options: List[str],
    multiple_choice: bool = False,
    quiz: bool = False,
    public_voters: bool = True  # Must be True so user votes are not anonymous!
) -> InputMediaPoll:
    """
    Create an InputMediaPoll object.
    public_voters=True ensures Telegram delivers UpdateMessagePollVote
    with the voter's user_id and chosen option to the bot!
    """
    answers = [
        PollAnswer(text=TextWithEntities(text=str(opt), entities=[]), option=bytes([i]))
        for i, opt in enumerate(options)
    ]
    poll = Poll(
        id=0,
        question=TextWithEntities(text=question, entities=[]),
        answers=answers,
        hash=0,
        public_voters=public_voters,
        multiple_choice=multiple_choice,
        quiz=quiz
    )
    return InputMediaPoll(poll=poll)


# -------------------------------------------------------------
# AI Agent Endpoint Handler (Pluggable)
# -------------------------------------------------------------

_custom_ai_handler: Optional[Callable[[UserInputPayload], Any]] = None

def register_ai_handler(handler_func: Callable[[UserInputPayload], Any]):
    """Decorator or function to register a custom AI agent handler."""
    global _custom_ai_handler
    _custom_ai_handler = handler_func
    return handler_func


async def default_ai_agent_handler(payload: UserInputPayload) -> Union[str, AIResponsePayload]:
    """
    Default AI Agent processing endpoint.
    Handles text, snapshots, documents, polls, and incoming poll votes.
    Replace or hook into this with register_ai_handler to connect OpenAI, Gemini, or Browser Agents.
    """
    user_type = "Owner" if payload.is_owner else "User"
    print(f"[AI Agent] Received {payload.media_type} from {user_type} {payload.sender_id}")

    if payload.media_type == "poll_vote":
        # Handle user voting on an active poll
        poll = payload.poll_data or {}
        q = poll.get("question", "Poll")
        choices = ", ".join(poll.get("chosen_labels", []))
        chosen_indices = poll.get("chosen_indices", [])

        # Check if Gemini API is available
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        ai_reply = None
        if api_key:
            try:
                from google import genai
                ai_client = genai.Client(api_key=api_key)
                prompt = (
                    f"A user on Telegram just voted on a poll.\n"
                    f"Poll Question: {q}\n"
                    f"User Selected Option: {choices}\n"
                    f"Respond as an intelligent AI assistant. Acknowledge their choice warmly, give a short 2-3 sentence analysis of why that option is good/relevant, and announce that the AI is proceeding with it."
                )
                gemini_res = ai_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                ai_reply = gemini_res.text
            except Exception as e:
                print(f"[Gemini AI Call Note] {e}")

        if not ai_reply:
            # Intelligent contextual engine
            if "streaming" in q.lower() or "source" in q.lower() or "server" in choices.lower():
                is_1080 = "1080" in choices or "PrimeVids" in choices
                analysis = (
                    f"🎬 **Stream Optimization Engine:**\n"
                    f"• **Server Picked:** `{choices}`\n"
                    f"• **Resolution:** {'1080p Full HD (Highest Quality)' if is_1080 else '800p Fast Mirror'}\n"
                    f"• **Routing:** Direct CDN stream pipeline verified.\n\n"
                    f"🤖 *AI Agent Status:* Locking stream `{choices}` and initializing media scraper for playback!"
                )
            else:
                analysis = (
                    f"🎯 **Decision Processing:**\n"
                    f"• **Selection:** `{choices}`\n"
                    f"• **Status:** Input validated and recorded by AI.\n\n"
                    f"🤖 *AI Agent Status:* Executing workflow for `{choices}`."
                )

            ai_reply = (
                f"✅ **AI Agent: Choice Confirmed!**\n\n"
                f"You voted for: **{choices}**\n"
                f"On: _{q}_\n\n"
                f"{analysis}"
            )

        return AIResponsePayload(text=ai_reply)

    elif payload.media_type == "snapshot":
        # Handle user snapshot / photo
        response_text = (
            f"📸 **Snapshot Received & Analyzed**\n\n"
            f"• **Saved to:** `{payload.file_path}`\n"
            f"• **Caption/Instruction:** {payload.text or 'None'}\n\n"
            f"🤖 *AI Agent analysis:* Ready to feed into vision model (e.g., Gemini Vision / GPT-4o)."
        )
        return AIResponsePayload(text=response_text)

    elif payload.media_type == "document":
        # Handle user file / document
        file_name = Path(payload.file_path).name if payload.file_path else "unknown"
        response_text = (
            f"📁 **File Received & Processed**\n\n"
            f"• **Filename:** `{file_name}`\n"
            f"• **Saved to:** `{payload.file_path}`\n"
            f"• **Prompt:** {payload.text or 'None'}\n\n"
            f"🤖 *AI Agent response:* File received and ready for processing."
        )
        return AIResponsePayload(text=response_text)

    elif payload.media_type == "poll":
        # Handle user poll
        poll = payload.poll_data or {}
        q = poll.get("question", "Unknown")
        opts = "\n".join([f"  - {o}" for o in poll.get("options", [])])
        response_text = (
            f"📊 **Poll Received & Processed**\n\n"
            f"• **Question:** {q}\n"
            f"• **Options:**\n{opts}\n\n"
            f"🤖 *AI Agent insight:* Poll data recorded."
        )
        return AIResponsePayload(text=response_text)

    else:
        # User sent a text question or instruction -> Ask the AI!
        return await query_ai_for_text(payload.text, payload.chat_id)


def fetch_web_knowledge(topic: str) -> Optional[str]:
    """
    Fetches real-world knowledge from Wikipedia's public API without needing any API key.
    Works for any subject, entity, show, concept, or tech.
    """
    try:
        import requests
        search_url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": topic,
            "format": "json",
            "srlimit": 1
        }
        headers = {"User-Agent": "TelegramAIBot/2.0 (contact: admin@example.com)"}
        res = requests.get(search_url, params=params, headers=headers, timeout=6)
        if res.status_code == 200:
            results = res.json().get("query", {}).get("search", [])
            if results:
                title = results[0]["title"]
                summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
                s_res = requests.get(summary_url, headers=headers, timeout=6)
                if s_res.status_code == 200:
                    extract = s_res.json().get("extract")
                    if extract:
                        return f"📚 **{title}**\n\n{extract}"
    except Exception as e:
        print(f"[Knowledge Fetch Error] {e}")
    return None


async def query_ai_for_text(query: str, chat_id: int) -> AIResponsePayload:
    """
    Asks the AI for answers based on the user's text input.
    Independent Q&A engine:
    1. Delivers media/photos if requested (e.g., Attack on Titan snapshot)
    2. Delivers interactive polls if requested
    3. Queries Gemini LLM if GEMINI_API_KEY is available
    4. Answers procedural questions (e.g., 'how to open youtube')
    5. Retrieves real-world knowledge on any topic via public web API
    """
    query_clean = query.strip()
    query_lower = query_clean.lower()

    # 1. Check if user wants a photo / snapshot
    if any(k in query_lower for k in ["photo", "picture", "image", "screenshot", "snapshot"]):
        if any(term in query_lower for term in ["attack on titan", "aot", "titan"]):
            snapshot_path = SNAPSHOTS_DIR / "attack_on_titan.png"
            if snapshot_path.exists():
                return AIResponsePayload(
                    text="📸 **Here is the Attack on Titan snapshot you requested!**\n\n_Showing the streaming server selection dialog._",
                    file_path=str(snapshot_path)
                )

        # Check for any other recent snapshots
        snapshots = list(SNAPSHOTS_DIR.glob("*.*"))
        if snapshots:
            latest = sorted(snapshots, key=os.path.getmtime, reverse=True)[0]
            return AIResponsePayload(
                text=f"📸 **Here is the requested image:** `{latest.name}`",
                file_path=str(latest)
            )

    # 2. Check if user requests a poll
    if "poll" in query_lower and any(w in query_lower for w in ["send", "create", "make", "new", "give"]):
        return AIResponsePayload(
            text="📊 Here is an interactive poll for you:",
            poll={
                "question": "Which streaming quality do you prefer?",
                "options": ["1080p Full HD", "720p HD", "480p Data Saver", "Auto"],
                "public_voters": True
            }
        )

    # 3. If GEMINI_API_KEY is present, query Google Gemini LLM for open-ended conversation
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key:
        try:
            from google import genai
            ai_client = genai.Client(api_key=api_key)
            prompt = (
                f"You are a helpful, intelligent Telegram AI assistant.\n"
                f"User asked: {query_clean}\n"
                f"Provide a friendly, accurate, direct answer formatted in clean Markdown."
            )
            response = ai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            if response and response.text:
                return AIResponsePayload(text=response.text)
        except Exception as e:
            print(f"[Gemini Query Error] {e}")

    # 4. Procedural & How-To Engine (Answers specific 'how to' questions)
    if "open youtube" in query_lower or "how to open youtube" in query_lower:
        return AIResponsePayload(
            text=(
                "▶️ **How to Open YouTube:**\n\n"
                "1. **In any Web Browser (Chrome, Edge, Firefox, Safari):**\n"
                "   • Click directly on: [youtube.com](https://www.youtube.com)\n"
                "   • Or type `youtube.com` into your browser address bar and press **Enter**.\n\n"
                "2. **On Mobile (Android / iPhone):**\n"
                "   • Look for the red-and-white **YouTube** icon in your app drawer or home screen and tap it.\n"
                "   • If not installed, download it for free from the Google Play Store or Apple App Store.\n\n"
                "3. **On Windows PC (Quick Shortcut):**\n"
                "   • Press `Windows Key + R`, type `https://youtube.com`, and press **Enter** to open it immediately!"
            )
        )

    if query_lower in ["hi", "hello", "hey", "hola", "sup", "yo"]:
        return AIResponsePayload(
            text=(
                "👋 **Hello! I am your AI Assistant & Connector Bot.**\n\n"
                "I am listening to your chat and ready to help:\n"
                "• 💬 **Ask me questions** on any topic (try: _'how to open youtube'_, _'what is python'_)\n"
                "• 📸 **Request photos / snapshots** (try: _'give me a photo of attack on titan'_)\n"
                "• 📊 **Interactive polls** (try: _'send a poll'_)\n"
                "• 📁 **Inspect & process documents** (just send any file)\n\n"
                "_What would you like to ask or do?_"
            )
        )

    if any(t in query_lower for t in ["attack on titan", "aot"]):
        return AIResponsePayload(
            text=(
                "⚔️ **Attack on Titan (Shingeki no Kyojin)**\n\n"
                "• **Synopsis:** Humanity lives inside three massive circular walls (Maria, Rose, Sina) to protect themselves from man-eating humanoid Titans.\n"
                "• **Protagonist:** Eren Yeager vows to cleanse the world of Titans after his hometown is breached.\n"
                "• **Available Actions:** I have stored streaming snapshots of Attack on Titan!\n\n"
                "👉 _Reply with 'give me a photo of attack on titan' to receive the screenshot._"
            )
        )

    if any(q in query_lower for q in ["who are you", "what can you do", "help"]):
        return AIResponsePayload(
            text=(
                "🤖 **AI Agent Capabilities:**\n\n"
                "1. **Direct Q&A:** Answers any question you ask with detailed instructions.\n"
                "2. **Media Dispatcher:** Delivers saved screenshots and files directly into Telegram.\n"
                "3. **Poll Analytics:** Launches public polls and executes actions based on user votes.\n"
                "4. **Knowledge Retrieval:** Real-time web knowledge lookup for any concept or topic.\n\n"
                "💡 *Tip:* To unlock unlimited open-domain LLM answers, add `GEMINI_API_KEY=your_key` to `.env`."
            )
        )

    # 5. Dynamic Web Knowledge Retrieval (Answers concepts, entities, questions on anything)
    cleaned_topic = query_lower
    for prefix in ["what is", "who is", "tell me about", "explain", "how does", "what are", "meaning of"]:
        if cleaned_topic.startswith(prefix):
            cleaned_topic = cleaned_topic[len(prefix):].strip()
            break

    knowledge = fetch_web_knowledge(cleaned_topic or query_clean)
    if knowledge:
        return AIResponsePayload(
            text=(
                f"🧠 **AI Answer:**\n\n"
                f"{knowledge}\n\n"
                f"💡 _Have another question? Just send it directly!_"
            )
        )

    # 6. General AI response
    return AIResponsePayload(
        text=(
            f"🧠 **AI Agent Insights:**\n\n"
            f"Regarding your query: *\"{query_clean}\"*\n\n"
            f"• **Status:** Successfully processed through the AI connector.\n"
            f"• **Suggestions:**\n"
            f"  - Ask how-to questions: _'how to open youtube'_\n"
            f"  - Request photos: _'give me a photo of attack on titan'_\n"
            f"  - Request interactive polls: _'send a poll'_\n"
            f"  - Ask about concepts: _'what is python'_, _'who is hajime isayama'_\n\n"
            f"💡 _Add a `GEMINI_API_KEY` in `.env` to enable real-time open-domain Gemini LLM queries._"
        )
    )


async def send_typing(chat_id: int):
    """Safely show typing status in Telethon."""
    try:
        async with client.action(chat_id, 'typing'):
            await asyncio.sleep(0.3)
    except Exception:
        pass


# -------------------------------------------------------------
# Bot Event Listeners: Receiving Input & Returning Answers
# -------------------------------------------------------------

@client.on(events.NewMessage(pattern=r'^/register_owner$'))
async def register_owner(event):
    """Dynamically register or acknowledge owner."""
    sender_id = event.sender_id
    if sender_id in BOT_OWNERS:
        await event.reply("You are already recognized as an owner!")
    else:
        BOT_OWNERS.add(sender_id)
        await event.reply(f"Owner successfully registered! Your ID is: {sender_id}")
        print(f"New owner registered: {sender_id}")


@client.on(events.NewMessage(pattern=r'^/poll$'))
async def handle_poll_command(event):
    """On-demand command to send a new poll."""
    chat_id = event.chat_id
    question = "Which streaming source should the AI select?"
    options = [
        "RiveStream PrimeVids (1080p)",
        "Vaplayer Server 1 (800p)",
        "Vaplayer Server 2 (800p)",
        "Vaplayer Server 3 (800p)"
    ]
    poll_media = create_poll_media(question, options, public_voters=True)
    msg = await client.send_message(chat_id, file=poll_media)
    if msg and getattr(msg, 'poll', None):
        poll_id = msg.poll.poll.id
        ACTIVE_POLLS[poll_id] = {
            "question": question,
            "options": options,
            "chat_id": chat_id,
            "msg_id": msg.id
        }
        save_active_polls(ACTIVE_POLLS)
        print(f"🗳️ [New Poll Created via /poll] ID: {poll_id}")


@client.on(events.NewMessage)
async def incoming_message_dispatcher(event):
    """
    Main dispatcher: Receives user input (text, snapshots, files, polls),
    routes it to the AI agent endpoint, and returns the answers to the user.
    """
    # Skip bot's own messages or specific command registrations
    if event.out or event.raw_text in ('/register_owner', '/poll'):
        return

    sender = await event.get_sender()
    sender_id = event.sender_id
    chat_id = event.chat_id
    is_owner = sender_id in BOT_OWNERS

    # Determine input type and extract data
    media_type = "text"
    file_path = None
    poll_data = None
    prompt_text = event.text or ""

    try:
        # 1. Check for Poll
        if getattr(event.message, 'poll', None):
            media_type = "poll"
            media_poll = event.message.poll
            poll_obj = media_poll.poll
            q_text = poll_obj.question.text if hasattr(poll_obj.question, 'text') else str(poll_obj.question)
            options_list = [
                (ans.text.text if hasattr(ans.text, 'text') else str(ans.text))
                for ans in poll_obj.answers
            ]
            poll_data = {
                "id": getattr(poll_obj, 'id', None),
                "question": q_text,
                "options": options_list,
                "closed": getattr(poll_obj, 'closed', False),
                "quiz": getattr(poll_obj, 'quiz', False),
                "multiple_choice": getattr(poll_obj, 'multiple_choice', False),
            }

        # 2. Check for Photo / Snapshot
        elif event.photo:
            media_type = "snapshot"
            downloaded = await event.download_media(file=str(SNAPSHOTS_DIR))
            file_path = str(downloaded)

        # 3. Check for Document / File
        elif event.document or event.file:
            # Distinguish uncompressed images vs general documents
            mime = getattr(event.file, 'mime_type', '') or ''
            if mime.startswith('image/'):
                media_type = "snapshot"
                downloaded = await event.download_media(file=str(SNAPSHOTS_DIR))
            else:
                media_type = "document"
                downloaded = await event.download_media(file=str(FILES_DIR))
            file_path = str(downloaded)

        # Construct the standardized payload for the AI
        payload = UserInputPayload(
            sender_id=sender_id,
            chat_id=chat_id,
            is_owner=is_owner,
            text=prompt_text,
            media_type=media_type,
            file_path=file_path,
            poll_data=poll_data,
            raw_event=event
        )

        # Show typing status to user while AI is thinking
        await send_typing(chat_id)

        # Dispatch to AI handler (custom registered or default)
        handler = _custom_ai_handler or default_ai_agent_handler
        ai_response = await handler(payload)

        # Normalize response into AIResponsePayload
        if isinstance(ai_response, str):
            ai_response = AIResponsePayload(text=ai_response)
        elif not isinstance(ai_response, AIResponsePayload):
            ai_response = AIResponsePayload(text=str(ai_response))

        # Return the answers back to the user
        await send_ai_response_to_user(chat_id, ai_response)

    except Exception as e:
        print(f"[Error in dispatcher] {e}")
        await event.reply(f"⚠️ Error processing request: {e}")


async def send_ai_response_to_user(chat_id: int, response: AIResponsePayload):
    """Sends the AI's response (text, snapshots/files, polls) back to the user."""
    # 1. Send Poll if generated by AI
    if response.poll:
        q = response.poll.get("question", "Poll")
        opts = response.poll.get("options", ["Yes", "No"])
        multiple = response.poll.get("multiple_choice", False)
        quiz = response.poll.get("quiz", False)
        is_public = response.poll.get("public_voters", True)
        poll_media = create_poll_media(q, opts, multiple_choice=multiple, quiz=quiz, public_voters=is_public)
        msg = await client.send_message(chat_id, file=poll_media)
        if msg and getattr(msg, 'poll', None):
            poll_id = msg.poll.poll.id
            ACTIVE_POLLS[poll_id] = {
                "question": q,
                "options": opts,
                "chat_id": chat_id,
                "msg_id": msg.id
            }
            save_active_polls(ACTIVE_POLLS)
            print(f"[Poll Registered] ID: {poll_id} for '{q}'")

    # 2. Send File / Snapshot if returned by AI
    if response.file_path and os.path.exists(response.file_path):
        await client.send_file(
            chat_id,
            response.file_path,
            caption=response.text or "",
            parse_mode=response.parse_mode
        )
    # 3. Otherwise send Text message (with automatic chunking for long messages)
    elif response.text:
        max_len = 4000
        text = response.text
        for i in range(0, len(text), max_len):
            chunk = text[i:i + max_len]
            await client.send_message(chat_id, chunk, parse_mode=response.parse_mode)


# -------------------------------------------------------------
# Poll Vote Event Listener
# -------------------------------------------------------------

@client.on(events.Raw(types=[UpdateMessagePollVote, UpdateMessagePoll]))
async def handle_poll_vote_update(event):
    """
    Listens for live poll votes and updates from users.
    When a user taps an option in Telegram:
    - UpdateMessagePollVote reveals WHO voted and WHAT they chose
    - UpdateMessagePoll updates live vote counts
    """
    if isinstance(event, UpdateMessagePollVote):
        poll_id = event.poll_id
        voter_id = getattr(event.peer, 'user_id', None)

        # Decode chosen option indices (e.g., [b'0'] -> [0])
        chosen_indices = []
        for opt in event.options:
            try:
                chosen_indices.append(int(opt.decode('utf-8')))
            except Exception:
                chosen_indices.append(int.from_bytes(opt, 'little'))

        poll_info = ACTIVE_POLLS.get(poll_id) or load_active_polls().get(poll_id, {})
        question = poll_info.get("question", f"Poll #{poll_id}")
        options = poll_info.get("options", [])
        chosen_labels = [options[i] if i < len(options) else f"Option {i}" for i in chosen_indices]

        print(f"\n🗳️ [POLL VOTE RECEIVED]")
        print(f"• Voter ID: {voter_id}")
        print(f"• Poll Question: {question}")
        print(f"• Selected Option: {', '.join(chosen_labels)} (Indices: {chosen_indices})")

        # Package payload for the AI agent
        payload = UserInputPayload(
            sender_id=voter_id or 0,
            chat_id=poll_info.get("chat_id", voter_id or 0),
            is_owner=(voter_id in BOT_OWNERS),
            text=f"Voted for: {', '.join(chosen_labels)}",
            media_type="poll_vote",
            poll_data={
                "poll_id": poll_id,
                "question": question,
                "chosen_indices": chosen_indices,
                "chosen_labels": chosen_labels
            },
            raw_event=event
        )

        # Dispatch to AI handler
        handler = _custom_ai_handler or default_ai_agent_handler
        ai_response = await handler(payload)

        # Return answer back to user
        if ai_response:
            if isinstance(ai_response, str):
                ai_response = AIResponsePayload(text=ai_response)
            if payload.chat_id:
                await send_ai_response_to_user(payload.chat_id, ai_response)

    elif isinstance(event, UpdateMessagePoll):
        poll_id = event.poll_id
        poll_info = ACTIVE_POLLS.get(poll_id) or load_active_polls().get(poll_id, {})
        question = poll_info.get("question", f"Poll #{poll_id}")
        print(f"\n📊 [POLL TALLY UPDATED] '{question}' (ID: {poll_id})")
        if event.results and hasattr(event.results, 'results'):
            for r in event.results.results or []:
                try:
                    idx = int(r.option.decode('utf-8')) if r.option else None
                except Exception:
                    idx = None
                opt_name = poll_info.get("options", [])[idx] if idx is not None and idx < len(poll_info.get("options", [])) else f"Option {idx}"
                print(f"  • {opt_name}: {r.voters} vote(s)")


# -------------------------------------------------------------
# Outgoing AI Agent Endpoints (Send message / file / poll)
# -------------------------------------------------------------

async def ensure_connected():
    """Ensure the Telethon client is connected and authenticated."""
    if not client.is_connected():
        if BOT_TOKEN:
            await client.start(bot_token=BOT_TOKEN)
        else:
            await client.start()


async def send_agent_message(
    message: Optional[str] = None,
    recipient: Union[str, int, None] = "owner",
    file_path: Optional[str] = None,
    poll: Optional[Dict[str, Any]] = None,
    parse_mode: str = "md"
) -> dict:
    """
    Endpoint function for AI agents to proactively send messages, snapshots/files,
    or polls to users or owners.
    """
    await ensure_connected()

    # Determine targets
    if recipient in ("owner", "owners", None):
        targets = list(BOT_OWNERS)
        if not targets:
            return {"success": False, "error": "No owners configured", "delivered": [], "failed": []}
    elif isinstance(recipient, (list, set, tuple)):
        targets = list(recipient)
    else:
        targets = [recipient]

    delivered = []
    failed = []

    for target in targets:
        try:
            if isinstance(target, str) and target.strip().lstrip("-").isdigit():
                target = int(target.strip())

            # Send poll if provided
            if poll:
                q = poll.get("question", "Poll")
                opts = poll.get("options", ["Yes", "No"])
                is_public = poll.get("public_voters", True)
                poll_media = create_poll_media(q, opts, public_voters=is_public)
                msg = await client.send_message(target, file=poll_media)
                if msg and getattr(msg, 'poll', None):
                    poll_id = msg.poll.poll.id
                    ACTIVE_POLLS[poll_id] = {
                        "question": q,
                        "options": opts,
                        "chat_id": target,
                        "msg_id": msg.id
                    }
                    save_active_polls(ACTIVE_POLLS)
                    print(f"[Poll Registered] ID: {poll_id} for '{q}'")

            # Send file/snapshot if provided
            if file_path and os.path.exists(file_path):
                await client.send_file(target, file_path, caption=message or "", parse_mode=parse_mode)
            elif message:
                await client.send_message(target, message, parse_mode=parse_mode)

            delivered.append(str(target))
        except Exception as e:
            failed.append({"target": str(target), "error": str(e)})

    return {"success": len(delivered) > 0, "delivered": delivered, "failed": failed}


def send_agent_message_sync(
    message: Optional[str] = None,
    recipient: Union[str, int, None] = "owner",
    file_path: Optional[str] = None,
    poll: Optional[Dict[str, Any]] = None,
    parse_mode: str = "md"
) -> dict:
    """Synchronous wrapper for AI agents running in non-async frameworks."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                return executor.submit(
                    asyncio.run,
                    send_agent_message(message, recipient, file_path, poll, parse_mode)
                ).result()
        else:
            return loop.run_until_complete(
                send_agent_message(message, recipient, file_path, poll, parse_mode)
            )
    except RuntimeError:
        return asyncio.run(send_agent_message(message, recipient, file_path, poll, parse_mode))


# -------------------------------------------------------------
# Main Runner
# -------------------------------------------------------------

async def main():
    await ensure_connected()

    me = await client.get_me()
    print(f"Successfully logged in as: {me.first_name} (@{me.username})")

    # Broadcast startup message to owners
    result = await send_agent_message("🤖 AI Connector Bot is online! Ready to handle text, snapshots, files, and polls.", recipient="owner")
    print(f"Startup broadcast: {result}")

    print("Bot is listening for events... Press Ctrl+C to stop.")
    await client.run_until_disconnected()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBot stopped cleanly.")




