import os
from fastapi import APIRouter

router = APIRouter()

SKILLS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".agents", "skills")

@router.get("/")
def get_all_skills():
    """
    Returns a list of all installed Marketing Skills from the local `.agents/skills` directory.
    """
    if not os.path.exists(SKILLS_DIR):
        return {"status": "success", "data": []}
        
    skills = []
    
    for item in os.listdir(SKILLS_DIR):
        item_path = os.path.join(SKILLS_DIR, item)
        if os.path.isdir(item_path):
            skill_md_path = os.path.join(item_path, "SKILL.md")
            if os.path.exists(skill_md_path):
                # We won't read the full MD yet, just basic info
                with open(skill_md_path, "r", encoding="utf-8") as f:
                    content = f.read(1000)
                    # Try to extract the first # Header or use folder name
                    name = item.replace("-", " ").title()
                    # A basic description could be extracted safely or just skipped for now
                    desc = content.splitlines()[0] if content else "No description available"
                    
                skills.append({
                    "id": item,
                    "name": name,
                    "description": f"Use this skill via /{item}",
                })
                
    return {"status": "success", "data": skills}
