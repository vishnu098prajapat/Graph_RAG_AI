from app.main import lifespan, app
import asyncio

async def test():
    async with lifespan(app):
        print('YIELDED!')

asyncio.run(test())
