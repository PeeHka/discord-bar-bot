from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URI, START_BALANCE

client = AsyncIOMotorClient(MONGO_URI)
db = client["beer_economy"]
users = db["users"]

async def get_user(user_id: int):
    user = await users.find_one({"user_id": user_id})
    if not user:
        user = {
            "user_id": user_id,
            "wallet": START_BALANCE,
            "bank": 0,
            "xp": 0,
            "level": 1,
            "inventory": {},
            "business": None,
            "staff": {},
            "protection": 0,
            "total_earned": 0,
            "total_spent": 0,
        }
        await users.insert_one(user)
    return user
