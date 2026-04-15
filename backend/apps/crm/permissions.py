from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS

from apps.core.permissions import (
    ALL_ROLES,
    ROLE_ADMIN,
    ROLE_PLANNER,
    ROLE_PRODUCTION_SUPERVISOR,
    ROLE_QUALITY_INSPECTOR,
    ROLE_STORE_MANAGER,
    ROLE_SUPERVISOR,
    RoleAccessPermission,
)

CRM_WRITE_ROLES = (
    ROLE_ADMIN,
    ROLE_STORE_MANAGER,
    ROLE_PRODUCTION_SUPERVISOR,
    ROLE_QUALITY_INSPECTOR,
    ROLE_PLANNER,
    ROLE_SUPERVISOR,
)


class CRMEntityPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = CRM_WRITE_ROLES
    delete_roles = (ROLE_ADMIN,)

    def has_object_permission(self, request, view, obj) -> bool:
        if not self.has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return True

        role = getattr(request.user, "role", None)
        if role == ROLE_ADMIN:
            return True

        assigned_to_id = getattr(obj, "assigned_to_id", None)
        created_by_id = getattr(obj, "created_by_id", None)
        if assigned_to_id is not None and assigned_to_id == request.user.id:
            return True
        if created_by_id is not None and created_by_id == request.user.id:
            return True

        return False


class CRMSettingsPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = (ROLE_ADMIN,)


class CRMDashboardPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = ()
