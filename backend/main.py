from fastapi import FastAPI

app = FastAPI(title="Keystroke Latency Diagnostics API")

#main entry point for the application
@app.get("/")
async def root():
    return {"status": "Engine is running. Ready for telemetry."}