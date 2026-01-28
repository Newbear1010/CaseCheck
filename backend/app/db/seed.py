"""Seed script for initial data.

Run with: python -m app.db.seed
"""

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import Role, Permission, User
from app.models.activity import ActivityType, RiskLevel


async def seed_roles(db: AsyncSession) -> None:
    roles = [
        Role(name="ADMIN", description="Administrator with full access", is_system=True),
        Role(name="USER", description="Standard user", is_system=True),
        Role(name="GUEST", description="Guest user", is_system=True),
    ]

    for role in roles:
        existing = await db.execute(select(Role).where(Role.name == role.name))
        if not existing.scalar_one_or_none():
            db.add(role)


async def seed_permissions(db: AsyncSession) -> None:
    permissions = [
        Permission(resource="activity", action="create", description="Create activities"),
        Permission(resource="activity", action="read", description="Read activities"),
        Permission(resource="activity", action="update", description="Update activities"),
        Permission(resource="activity", action="delete", description="Delete activities"),
        Permission(resource="activity", action="approve", description="Approve activities"),
        Permission(resource="activity", action="reject", description="Reject activities"),
        Permission(resource="attendance", action="checkin", description="Check in to activity"),
        Permission(resource="attendance", action="checkout", description="Check out of activity"),
        Permission(resource="user", action="read", description="Read users"),
        Permission(resource="user", action="manage", description="Manage users"),
    ]

    for permission in permissions:
        existing = await db.execute(
            select(Permission).where(
                (Permission.resource == permission.resource)
                & (Permission.action == permission.action)
            )
        )
        if not existing.scalar_one_or_none():
            db.add(permission)


async def seed_activity_types(db: AsyncSession) -> None:
    activity_types = [
        ActivityType(
            name="Training",
            description="Training sessions",
            requires_approval=True,
            default_risk_level=RiskLevel.MEDIUM,
        ),
        ActivityType(
            name="Meeting",
            description="Team meetings",
            requires_approval=False,
            default_risk_level=RiskLevel.LOW,
        ),
        ActivityType(
            name="Workshop",
            description="Workshops",
            requires_approval=True,
            default_risk_level=RiskLevel.MEDIUM,
        ),
        ActivityType(
            name="Event",
            description="Events",
            requires_approval=True,
            default_risk_level=RiskLevel.HIGH,
        ),
    ]

    for activity_type in activity_types:
        existing = await db.execute(
            select(ActivityType).where(ActivityType.name == activity_type.name)
        )
        if not existing.scalar_one_or_none():
            db.add(activity_type)


async def seed_admin_user(db: AsyncSession) -> None:
    existing = await db.execute(select(User).where(User.username == "admin"))
    existing_user = existing.scalar_one_or_none()
    if existing_user:
        # Ensure seeded admin has a non-reserved email domain for validation
        if existing_user.email.endswith(".local") or existing_user.email.endswith(".test"):
            existing_user.email = "admin@casecheck.example.com"
        return

    role_result = await db.execute(select(Role).where(Role.name == "ADMIN"))
    admin_role = role_result.scalar_one_or_none()
    if not admin_role:
        return

    admin = User(
        username="admin",
        email="admin@casecheck.example.com",
        password_hash=get_password_hash("Admin123!"),
        full_name="System Administrator",
        is_active=True,
        is_verified=True,
    )
    admin.roles.append(admin_role)
    db.add(admin)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed_roles(db)
        await seed_permissions(db)
        await seed_activity_types(db)
        await seed_admin_user(db)
        await db.commit()
        print("Seed data created successfully!")


if __name__ == "__main__":
    asyncio.run(main())
