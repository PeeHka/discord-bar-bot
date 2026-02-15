import asyncio
from discord.ext import commands
from database import users
from data.shop import BUSINESSES
from config import PASSIVE_INTERVAL

class Passive(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.bot.loop.create_task(self.passive())

    async def passive(self):
        await self.bot.wait_until_ready()
        while True:
            async for user in users.find({"business": {"$ne": None}}):
                income = BUSINESSES[user["business"]]["income"]
                await users.update_one(
                    {"user_id": user["user_id"]},
                    {"$inc": {"wallet": income, "total_earned": income}}
                )
            await asyncio.sleep(PASSIVE_INTERVAL)

async def setup(bot):
    await bot.add_cog(Passive(bot))
