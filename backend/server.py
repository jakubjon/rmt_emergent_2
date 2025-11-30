from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class RequirementStatus(str, Enum):
    draft = "Draft"
    in_review = "In Review"
    accepted = "Accepted"
    implemented = "Implemented"
    tested = "Tested"

class VerificationMethod(str, Enum):
    analysis = "Analysis"
    review = "Review"
    inspection = "Inspection"
    test = "Test"

# Models
class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    project_id: str
    parent_id: Optional[str] = None
    order: int = 0
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str
    parent_id: Optional[str] = None
    order: int = 0

class Chapter(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    group_id: str
    parent_id: Optional[str] = None
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChapterCreate(BaseModel):
    name: str
    description: Optional[str] = None
    group_id: str
    parent_id: Optional[str] = None
    order: int = 0

class Requirement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    req_id: Optional[str] = None  # Auto-generated requirement ID (REQ-001, etc.)
    title: str
    text: str
    status: RequirementStatus = RequirementStatus.draft
    verification_methods: List[VerificationMethod] = []
    project_id: str
    group_id: str
    chapter_id: Optional[str] = None
    parent_ids: List[str] = []  # Many-to-many parent relationships
    child_ids: List[str] = []   # Many-to-many child relationships
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class RequirementCreate(BaseModel):
    title: str
    text: str
    status: RequirementStatus = RequirementStatus.draft
    verification_methods: List[VerificationMethod] = []
    project_id: str
    group_id: str
    chapter_id: Optional[str] = None
    parent_ids: List[str] = []

class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    status: Optional[RequirementStatus] = None
    verification_methods: Optional[List[VerificationMethod]] = None
    group_id: Optional[str] = None
    chapter_id: Optional[str] = None
    parent_ids: Optional[List[str]] = None

class RequirementRelationship(BaseModel):
    parent_id: str
    child_id: str

class RequirementChangeLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requirement_id: str
    change_type: str  # 'created', 'updated', 'status_changed', 'relationship_added', 'relationship_removed'
    field_name: Optional[str] = None  # Which field was changed
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_description: str
    changed_by: Optional[str] = None  # User who made the change
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def prepare_for_mongo(data: dict) -> dict:
    """Convert datetime objects to strings for MongoDB storage"""
    for key, value in data.items():
        if isinstance(value, datetime):
            data[key] = value.isoformat()
    return data

def parse_from_mongo(item: dict) -> dict:
    """Convert string dates back to datetime objects"""
    if item is None:
        return item
    
    for key in ['created_at', 'updated_at']:
        if key in item and isinstance(item[key], str):
            try:
                item[key] = datetime.fromisoformat(item[key])
            except:
                pass
    return item

async def create_change_log_entry(
    requirement_id: str,
    change_type: str,
    change_description: str,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    changed_by: Optional[str] = None
):
    """Create a change log entry for requirement tracking"""
    change_log = RequirementChangeLog(
        requirement_id=requirement_id,
        change_type=change_type,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        change_description=change_description,
        changed_by=changed_by or "System"
    )
    
    change_log_dict = prepare_for_mongo(change_log.dict())
    await db.requirement_change_logs.insert_one(change_log_dict)

# Project endpoints
@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    # Deactivate all other projects
    await db.projects.update_many({}, {"$set": {"is_active": False}})
    
    project_dict = project.dict()
    project_obj = Project(**project_dict, is_active=True)
    project_dict = prepare_for_mongo(project_obj.dict())
    
    await db.projects.insert_one(project_dict)
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    projects = await db.projects.find().to_list(1000)
    return [Project(**parse_from_mongo(project)) for project in projects]

@api_router.get("/projects/active", response_model=Optional[Project])
async def get_active_project():
    project = await db.projects.find_one({"is_active": True})
    if project:
        return Project(**parse_from_mongo(project))
    return None

@api_router.put("/projects/{project_id}/activate")
async def activate_project(project_id: str):
    # Deactivate all projects
    await db.projects.update_many({}, {"$set": {"is_active": False}})
    # Activate selected project
    result = await db.projects.update_one({"id": project_id}, {"$set": {"is_active": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project activated"}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    # Delete project and all related data
    await db.projects.delete_one({"id": project_id})
    await db.groups.delete_many({"project_id": project_id})
    await db.chapters.delete_many({"project_id": project_id})
    await db.requirements.delete_many({"project_id": project_id})
    return {"message": "Project deleted"}

# Group endpoints
@api_router.post("/groups", response_model=Group)
async def create_group(group: GroupCreate):
    # Deactivate all other groups in the project
    await db.groups.update_many({"project_id": group.project_id}, {"$set": {"is_active": False}})
    
    group_dict = group.dict()
    group_obj = Group(**group_dict, is_active=True)
    group_dict = prepare_for_mongo(group_obj.dict())
    
    await db.groups.insert_one(group_dict)
    return group_obj

@api_router.get("/groups", response_model=List[Group])
async def get_groups(project_id: Optional[str] = None):
    query = {"project_id": project_id} if project_id else {}
    groups = await db.groups.find(query).to_list(1000)
    return [Group(**parse_from_mongo(group)) for group in groups]

@api_router.get("/groups/active", response_model=Optional[Group])
async def get_active_group():
    group = await db.groups.find_one({"is_active": True})
    if group:
        return Group(**parse_from_mongo(group))
    return None

@api_router.put("/groups/{group_id}/activate")
async def activate_group(group_id: str):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Deactivate all groups in the same project
    await db.groups.update_many({"project_id": group["project_id"]}, {"$set": {"is_active": False}})
    # Activate selected group
    await db.groups.update_one({"id": group_id}, {"$set": {"is_active": True}})
    return {"message": "Group activated"}

@api_router.put("/groups/{group_id}/reorder")
async def reorder_group(group_id: str, new_order: int, new_parent_id: Optional[str] = None):
    update_data = {"order": new_order, "updated_at": datetime.now(timezone.utc).isoformat()}
    if new_parent_id is not None:
        update_data["parent_id"] = new_parent_id
    
    result = await db.groups.update_one({"id": group_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Group reordered"}

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str):
    await db.groups.delete_one({"id": group_id})
    await db.chapters.delete_many({"group_id": group_id})
    await db.requirements.delete_many({"group_id": group_id})
    return {"message": "Group deleted"}

# Chapter endpoints
@api_router.post("/chapters", response_model=Chapter)
async def create_chapter(chapter: ChapterCreate):
    chapter_dict = chapter.dict()
    chapter_obj = Chapter(**chapter_dict)
    chapter_dict = prepare_for_mongo(chapter_obj.dict())
    
    await db.chapters.insert_one(chapter_dict)
    return chapter_obj

@api_router.get("/chapters", response_model=List[Chapter])
async def get_chapters(group_id: Optional[str] = None):
    query = {"group_id": group_id} if group_id else {}
    chapters = await db.chapters.find(query).to_list(1000)
    return [Chapter(**parse_from_mongo(chapter)) for chapter in chapters]

@api_router.put("/chapters/{chapter_id}/reorder")
async def reorder_chapter(chapter_id: str, new_order: int, new_parent_id: Optional[str] = None):
    update_data = {"order": new_order, "updated_at": datetime.now(timezone.utc).isoformat()}
    if new_parent_id is not None:
        update_data["parent_id"] = new_parent_id
    
    result = await db.chapters.update_one({"id": chapter_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"message": "Chapter reordered"}

@api_router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str):
    await db.chapters.delete_one({"id": chapter_id})
    await db.requirements.delete_many({"chapter_id": chapter_id})
    return {"message": "Chapter deleted"}

# Requirement endpoints
@api_router.post("/requirements", response_model=Requirement)
async def create_requirement(requirement: RequirementCreate):
    # Generate requirement ID
    project = await db.projects.find_one({"id": requirement.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Count existing requirements in project to generate ID
    count = await db.requirements.count_documents({"project_id": requirement.project_id})
    req_id = f"REQ-{str(count + 1).zfill(3)}"
    
    requirement_dict = requirement.dict()
    requirement_obj = Requirement(**requirement_dict, req_id=req_id)
    requirement_dict = prepare_for_mongo(requirement_obj.dict())
    
    await db.requirements.insert_one(requirement_dict)
    return requirement_obj

@api_router.get("/requirements", response_model=List[Requirement])
async def get_requirements(
    project_id: Optional[str] = None,
    group_id: Optional[str] = None,
    chapter_id: Optional[str] = None,
    status: Optional[RequirementStatus] = None
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if group_id:
        query["group_id"] = group_id
    if chapter_id:
        query["chapter_id"] = chapter_id
    if status:
        query["status"] = status
    
    requirements = await db.requirements.find(query).to_list(1000)
    return [Requirement(**parse_from_mongo(req)) for req in requirements]

@api_router.get("/requirements/{requirement_id}", response_model=Requirement)
async def get_requirement(requirement_id: str):
    requirement = await db.requirements.find_one({"id": requirement_id})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return Requirement(**parse_from_mongo(requirement))

@api_router.put("/requirements/{requirement_id}", response_model=Requirement)
async def update_requirement(requirement_id: str, update_data: RequirementUpdate):
    # Get current requirement
    current_req = await db.requirements.find_one({"id": requirement_id})
    if not current_req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle parent-child relationships
    if "parent_ids" in update_dict:
        old_parents = set(current_req.get("parent_ids", []))
        new_parents = set(update_dict["parent_ids"])
        
        # Remove this requirement from old parents' child_ids
        for parent_id in old_parents - new_parents:
            await db.requirements.update_one(
                {"id": parent_id},
                {"$pull": {"child_ids": requirement_id}}
            )
        
        # Add this requirement to new parents' child_ids
        for parent_id in new_parents - old_parents:
            await db.requirements.update_one(
                {"id": parent_id},
                {"$addToSet": {"child_ids": requirement_id}}
            )
    
    result = await db.requirements.update_one(
        {"id": requirement_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    updated_req = await db.requirements.find_one({"id": requirement_id})
    return Requirement(**parse_from_mongo(updated_req))

@api_router.post("/requirements/relationships")
async def create_relationship(relationship: RequirementRelationship):
    # Add child to parent's child_ids
    parent_result = await db.requirements.update_one(
        {"id": relationship.parent_id},
        {"$addToSet": {"child_ids": relationship.child_id}}
    )
    
    # Add parent to child's parent_ids
    child_result = await db.requirements.update_one(
        {"id": relationship.child_id},
        {"$addToSet": {"parent_ids": relationship.parent_id}}
    )
    
    if parent_result.modified_count == 0 or child_result.modified_count == 0:
        raise HTTPException(status_code=404, detail="One or both requirements not found")
    
    return {"message": "Relationship created"}

@api_router.delete("/requirements/relationships/{parent_id}/{child_id}")
async def delete_relationship(parent_id: str, child_id: str):
    # Remove child from parent's child_ids
    await db.requirements.update_one(
        {"id": parent_id},
        {"$pull": {"child_ids": child_id}}
    )
    
    # Remove parent from child's parent_ids
    await db.requirements.update_one(
        {"id": child_id},
        {"$pull": {"parent_ids": parent_id}}
    )
    
    return {"message": "Relationship deleted"}

@api_router.put("/requirements/batch")
async def batch_update_requirements(requirement_ids: List[str], update_data: Dict[str, Any]):
    # Update multiple requirements at once
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.requirements.update_many(
        {"id": {"$in": requirement_ids}},
        {"$set": update_data}
    )
    
    return {"message": f"Updated {result.modified_count} requirements"}

@api_router.delete("/requirements/{requirement_id}")
async def delete_requirement(requirement_id: str):
    # Get requirement to find relationships
    requirement = await db.requirements.find_one({"id": requirement_id})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # Remove this requirement from all parent-child relationships
    parent_ids = requirement.get("parent_ids", [])
    child_ids = requirement.get("child_ids", [])
    
    # Remove from parents' child_ids
    for parent_id in parent_ids:
        await db.requirements.update_one(
            {"id": parent_id},
            {"$pull": {"child_ids": requirement_id}}
        )
    
    # Remove from children's parent_ids
    for child_id in child_ids:
        await db.requirements.update_one(
            {"id": child_id},
            {"$pull": {"parent_ids": requirement_id}}
        )
    
    # Delete the requirement
    await db.requirements.delete_one({"id": requirement_id})
    return {"message": "Requirement deleted"}

# Dashboard statistics
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(project_id: str):
    # Total requirements count
    total_requirements = await db.requirements.count_documents({"project_id": project_id})
    
    # Status distribution
    status_pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_distribution = {}
    async for doc in db.requirements.aggregate(status_pipeline):
        status_distribution[doc["_id"]] = doc["count"]
    
    # Calculate percentages
    status_percentages = {}
    for status in RequirementStatus:
        count = status_distribution.get(status.value, 0)
        percentage = (count / total_requirements * 100) if total_requirements > 0 else 0
        status_percentages[status.value] = round(percentage, 1)
    
    # Children assignment percentage
    requirements_with_children = await db.requirements.count_documents({
        "project_id": project_id,
        "child_ids.0": {"$exists": True}
    })
    children_percentage = (requirements_with_children / total_requirements * 100) if total_requirements > 0 else 0
    
    # Verification methods percentage
    requirements_with_verification = await db.requirements.count_documents({
        "project_id": project_id,
        "verification_methods.0": {"$exists": True}
    })
    verification_percentage = (requirements_with_verification / total_requirements * 100) if total_requirements > 0 else 0
    
    return {
        "total_requirements": total_requirements,
        "status_percentages": status_percentages,
        "children_assignment_percentage": round(children_percentage, 1),
        "verification_methods_percentage": round(verification_percentage, 1)
    }

# Search endpoint
@api_router.get("/requirements/search")
async def search_requirements(q: str, project_id: Optional[str] = None):
    query = {
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"text": {"$regex": q, "$options": "i"}},
            {"req_id": {"$regex": q, "$options": "i"}}
        ]
    }
    
    if project_id:
        query["project_id"] = project_id
    
    requirements = await db.requirements.find(query).to_list(100)
    return [Requirement(**parse_from_mongo(req)) for req in requirements]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
