import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import discord
from discord.ext import commands
from google import genai
from google.genai import types

# 1. Load environment variables from discord/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# 2. Initialize Gemini Client if key is provided
gemini_client = None
if GEMINI_API_KEY and GEMINI_API_KEY.strip():
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY.strip())
        print("✅ Gemini AI client initialized successfully.")
    except Exception as e:
        print(f"⚠️ Failed to initialize Gemini client: {e}")
else:
    print("ℹ️ No GEMINI_API_KEY found. AI replies will show a setup reminder until a key is added.")

# 3. Configure Discord intents
intents = discord.Intents.default()
intents.message_content = True  # Required to read text messages

# 4. Initialize Bot with command prefix
bot = commands.Bot(command_prefix='!', intents=intents)

# Event: Runs automatically when the bot connects
@bot.event
async def on_ready():
    print(f'Logged in successfully as {bot.user} (ID: {bot.user.id})')
    print('Bot is ready and listening for messages!')
    print('------')

# Event: Triggered on every message sent in any channel the bot can see
@bot.event
async def on_message(message: discord.Message):
    # Ignore messages sent by the bot itself to prevent infinite loops
    if message.author == bot.user:
        return

    # If the message starts with command prefix (e.g. !ping), run commands
    if message.content.startswith(bot.command_prefix):
        await bot.process_commands(message)
        return

    user_prompt = message.content.strip()
    if not user_prompt:
        return

    # Check if Gemini AI key is available
    if not gemini_client:
        await message.reply(
            "⚠️ **Gemini AI key is not set yet.**\n\n"
            "To enable intelligent AI answers to any question:\n"
            "1. Get a free API key at: https://aistudio.google.com/app/apikey\n"
            "2. Paste it in `discord/.env`:\n"
            "   `GEMINI_API_KEY=\"AIzaSy...\"`\n"
            "3. Restart the bot (`python discord/min.py`)."
        )
        return

    # Indicate the bot is thinking/typing in Discord
    async with message.channel.typing():
        try:
            # Use Gemini to generate a response tailored to the user's question
            config = types.GenerateContentConfig(
                system_instruction=(
                    "You are a friendly, intelligent, and helpful Discord assistant named rage. "
                    "Answer user questions accurately, concisely, and format your responses nicely using Discord markdown."
                ),
            )

            # Use Gemini 3.8 Flash to generate responses
            response = await gemini_client.aio.models.generate_content(
                model="gemini-3.8-flash",
                contents=user_prompt,
                config=config,
            )

            reply_text = response.text or "I wasn't able to generate a response to that."

            # Discord has a 2000 character message limit: split if necessary
            if len(reply_text) <= 2000:
                await message.reply(reply_text)
            else:
                chunks = [reply_text[i:i + 1900] for i in range(0, len(reply_text), 1900)]
                for idx, chunk in enumerate(chunks):
                    if idx == 0:
                        await message.reply(chunk)
                    else:
                        await message.channel.send(chunk)

        except Exception as err:
            await message.reply(f"❌ Error getting AI answer: {err}")

# Command: Triggered when a user types "!ping"
@bot.command()
async def ping(ctx):
    await ctx.send('Pong! 🏓')

# Command: Triggered when a user types "!say <something>"
@bot.command()
async def say(ctx, *, text: str):
    await ctx.send(f'You told me to say: {text}')

# 5. Start the bot
bot.run(BOT_TOKEN)
