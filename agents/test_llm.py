import asyncio

from dotenv import load_dotenv

load_dotenv()

from langchain_openai import ChatOpenAI


async def main():
    llm = ChatOpenAI(model="gpt-4.1-nano")
    response = await llm.ainvoke("Di 'Hive funciona' y nada más.")
    print(f"Modelo: gpt-4.1-nano")
    print(f"Respuesta: {response.content}")


asyncio.run(main())
