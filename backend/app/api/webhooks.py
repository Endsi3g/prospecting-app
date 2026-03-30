from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from typing import Any, Dict
import json
from app.core.database import get_supabase_admin

router = APIRouter()

async def process_resend_event(payload: Dict[str, Any]):
    """
    Handle the async processing of email events.
    Matches resend_id against the public.messages table.
    """
    event_type = payload.get("type")
    data = payload.get("data", {})
    resend_id = data.get("email_id")

    if not resend_id:
        print("⚠️ [Webhook] Missing email_id in payload.")
        return

    db = get_supabase_admin()

    if event_type == "email.opened":
        print(f"📈 [Webhook] Email Opened! ID: {resend_id}")
        
        # 1. Update the message record
        # We increment opens_count and set last_opened_at
        # Assuming table is public.messages
        try:
            # First fetch current opens_count
            msg_res = db.table("messages").select("opens_count").eq("resend_id", resend_id).single().execute()
            
            if msg_res.data:
                current_count = msg_res.data.get("opens_count") or 0
                db.table("messages").update({
                    "opens_count": current_count + 1,
                    "last_opened_at": "now()",
                    "status": "opened"
                }).eq("resend_id", resend_id).execute()
                
            # 2. Log activity
            db.table("activity_logs").insert({
                "action": "email_opened",
                "entity_type": "message",
                "metadata": {"resend_id": resend_id, "event_type": event_type}
            }).execute()

        except Exception as e:
            print(f"❌ [Webhook] Error updating DB: {e}")

    elif event_type == "email.delivered":
        print(f"✅ [Webhook] Email Delivered! ID: {resend_id}")
        db.table("messages").update({"status": "delivered"}).eq("resend_id", resend_id).execute()

    elif event_type == "email.bounced":
        print(f"🚫 [Webhook] Email Bounced! ID: {resend_id}")
        db.table("messages").update({"status": "bounced"}).eq("resend_id", resend_id).execute()

@router.post("/resend")
async def resend_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Main webhook entry point for Resend events.
    Responds immediately to avoid timeout.
    """
    try:
        payload = await request.json()
        background_tasks.add_task(process_resend_event, payload)
        return {"status": "received"}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        print(f"❌ [Webhook] Error: {e}")
        return {"status": "error", "message": str(e)}
