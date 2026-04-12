from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model

User = get_user_model()


@dataclass(frozen=True)
class DemoUserSpec:
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    password: str


DEMO_USER_SPECS: tuple[DemoUserSpec, ...] = (
    DemoUserSpec(
        username="admin",
        email="admin@factory.com",
        first_name="Factory",
        last_name="Admin",
        role=User.Role.ADMIN,
        password="Admin@123",
    ),
    DemoUserSpec(
        username="sup_amit",
        email="amit@factory.com",
        first_name="Amit",
        last_name="Sharma",
        role=User.Role.SUPERVISOR,
        password="Supervisor@123",
    ),
    DemoUserSpec(
        username="sup_neha",
        email="neha@factory.com",
        first_name="Neha",
        last_name="Patel",
        role=User.Role.SUPERVISOR,
        password="Supervisor@123",
    ),
    DemoUserSpec(
        username="store_maya",
        email="maya@factory.com",
        first_name="Maya",
        last_name="Iyer",
        role=User.Role.STORE_MANAGER,
        password="Store@123",
    ),
    DemoUserSpec(
        username="planner_om",
        email="om@factory.com",
        first_name="Om",
        last_name="Bhat",
        role=User.Role.PLANNER,
        password="Planner@123",
    ),
    DemoUserSpec(
        username="qc_riya",
        email="riya@factory.com",
        first_name="Riya",
        last_name="Das",
        role=User.Role.QUALITY_INSPECTOR,
        password="Quality@123",
    ),
    DemoUserSpec(
        username="prod_arun",
        email="arun@factory.com",
        first_name="Arun",
        last_name="Kumar",
        role=User.Role.PRODUCTION_SUPERVISOR,
        password="Supervisor@123",
    ),
    DemoUserSpec(
        username="viewer_raj",
        email="raj@factory.com",
        first_name="Raj",
        last_name="Verma",
        role=User.Role.VIEWER,
        password="Viewer@123",
    ),
)


DEMO_CREDENTIALS = {
    spec.username.lower(): spec.password for spec in DEMO_USER_SPECS
} | {spec.email.lower(): spec.password for spec in DEMO_USER_SPECS}


def ensure_demo_users() -> dict[str, User]:
    """
    Ensure documented demo users exist and have the documented default passwords.
    Safe to call repeatedly.
    """
    users: dict[str, User] = {}
    for spec in DEMO_USER_SPECS:
        user, _ = User.objects.update_or_create(
            username=spec.username,
            defaults={
                "email": spec.email,
                "first_name": spec.first_name,
                "last_name": spec.last_name,
                "role": spec.role,
                "is_active": True,
            },
        )
        user.set_password(spec.password)
        user.save()
        users[spec.username] = user
    return users
