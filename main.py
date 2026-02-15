import os
import discord
from discord.ext import commands

from config import TOKEN

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

async def load_cogs():
    for file in os.listdir("./cogs"):
        if file.endswith(".py"):
            await bot.load_extension(f"cogs.{file[:-3]}")

@bot.event
async def on_ready():
    await load_cogs()
    await bot.tree.sync()
    print(f"Logged in as {bot.user}")

bot.run(TOKEN)
