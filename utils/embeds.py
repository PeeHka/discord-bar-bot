import discord
from config import CURRENCY

def success(title, desc):
    return discord.Embed(title=f"✅ {title}", description=desc, color=0x2ecc71)

def error(title, desc):
    return discord.Embed(title=f"❌ {title}", description=desc, color=0xe74c3c)

def money(amount):
    return discord.Embed(title="💰 Баланс", description=f"{amount}{CURRENCY}", color=0xf1c40f)
