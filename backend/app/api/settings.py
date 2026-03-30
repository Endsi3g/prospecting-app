from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from dotenv import set_key, load_dotenv

router = APIRouter()

# Locate .env file relative to this backend script
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")

@router.get("/")
async def get_settings():
    """Returns safe masked settings for the UI."""
    load_dotenv(ENV_PATH, override=True)
    
    resend_key = os.getenv("RESEND_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    webhook_url = os.getenv("WEBHOOK_URL", "")
    
    return {
        "status": "success",
        "settings": {
            "resend_api_key": f"{resend_key[:4]}...{resend_key[-3:]}" if len(resend_key) > 7 else ("" if not resend_key else "configured"),
            "openai_api_key": f"{openai_key[:4]}...{openai_key[-3:]}" if len(openai_key) > 7 else ("" if not openai_key else "configured"),
            "webhook_url": f"{webhook_url[:12]}..." if len(webhook_url) > 12 else ("" if not webhook_url else "configured"),
            "has_resend": bool(resend_key),
            "has_openai": bool(openai_key),
            "has_webhook": bool(webhook_url)
        }
    }


class UpdateSettingsRequest(BaseModel):
    resend_api_key: str = None
    openai_api_key: str = None
    webhook_url: str = None

@router.post("/")
async def update_settings(req: UpdateSettingsRequest):
    """Updates the .env variables and reloads them."""
    try:
        if not os.path.exists(ENV_PATH):
            open(ENV_PATH, 'a').close()
            
        if req.resend_api_key and req.resend_api_key != "":
            set_key(ENV_PATH, "RESEND_API_KEY", req.resend_api_key)
            import resend
            resend.api_key = req.resend_api_key
            
        if req.openai_api_key and req.openai_api_key != "":
            set_key(ENV_PATH, "OPENAI_API_KEY", req.openai_api_key)
            
        if req.webhook_url and req.webhook_url != "":
            set_key(ENV_PATH, "WEBHOOK_URL", req.webhook_url)
            
        load_dotenv(ENV_PATH, override=True)
        return {"status": "success", "message": "Keys updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
