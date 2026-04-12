from rest_framework.permissions import SAFE_METHODS, BasePermission

ROLE_ADMIN = "admin"
ROLE_STORE_MANAGER = "store_manager"
ROLE_PRODUCTION_SUPERVISOR = "production_supervisor"
ROLE_QUALITY_INSPECTOR = "quality_inspector"
ROLE_PLANNER = "planner"
# Backward-compatible legacy Phase 1 role.
ROLE_SUPERVISOR = "supervisor"
ROLE_VIEWER = "viewer"
ALL_ROLES = (
    ROLE_ADMIN,
    ROLE_STORE_MANAGER,
    ROLE_PRODUCTION_SUPERVISOR,
    ROLE_QUALITY_INSPECTOR,
    ROLE_PLANNER,
    ROLE_SUPERVISOR,
    ROLE_VIEWER,
)

PRODUCTION_WRITE_ROLES = (
    ROLE_ADMIN,
    ROLE_SUPERVISOR,
    ROLE_PRODUCTION_SUPERVISOR,
)

INVENTORY_WRITE_ROLES = (
    ROLE_ADMIN,
    ROLE_STORE_MANAGER,
)

QUALITY_WRITE_ROLES = (
    ROLE_ADMIN,
    ROLE_QUALITY_INSPECTOR,
)

PLANNING_WRITE_ROLES = (
    ROLE_ADMIN,
    ROLE_PLANNER,
)


def _is_authenticated(user) -> bool:
    return bool(user and user.is_authenticated)


class RoleAccessPermission(BasePermission):
    """
    Reusable role-based permission primitive.

    `read_roles`: GET/HEAD/OPTIONS
    `write_roles`: POST/PUT/PATCH
    `delete_roles`: DELETE (defaults to `write_roles` when omitted)
    """

    read_roles: tuple[str, ...] = ()
    write_roles: tuple[str, ...] = ()
    delete_roles: tuple[str, ...] | None = None
    owner_restricted_roles: tuple[str, ...] = ()
    owner_field: str = "id"

    def has_permission(self, request, view) -> bool:
        if not _is_authenticated(request.user):
            return False

        role = getattr(request.user, "role", None)
        if request.method in SAFE_METHODS:
            return role in self.read_roles

        if request.method == "DELETE":
            delete_roles = self.delete_roles if self.delete_roles is not None else self.write_roles
            return role in delete_roles

        return role in self.write_roles

    def has_object_permission(self, request, view, obj) -> bool:
        if not self.has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return True

        if getattr(request.user, "role", None) not in self.owner_restricted_roles:
            return True

        return getattr(obj, self.owner_field, None) == request.user.id


class IsAdminRole(RoleAccessPermission):
    read_roles = (ROLE_ADMIN,)
    write_roles = (ROLE_ADMIN,)


class IsAdminOrReadOnly(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = (ROLE_ADMIN,)


class ProductionEntryPermission(RoleAccessPermission):
    """Admin: full access; Supervisor: create/update/read; Viewer: read-only."""

    read_roles = ALL_ROLES
    write_roles = PRODUCTION_WRITE_ROLES
    delete_roles = (ROLE_ADMIN,)
    owner_restricted_roles = (ROLE_SUPERVISOR, ROLE_PRODUCTION_SUPERVISOR)
    owner_field = "supervisor_id"


class InventoryMaterialPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = INVENTORY_WRITE_ROLES
    delete_roles = (ROLE_ADMIN,)


class MaterialInwardPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = INVENTORY_WRITE_ROLES
    delete_roles = (ROLE_ADMIN, ROLE_STORE_MANAGER)


class MaterialIssuePermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = (
        ROLE_ADMIN,
        ROLE_STORE_MANAGER,
        ROLE_SUPERVISOR,
        ROLE_PRODUCTION_SUPERVISOR,
    )
    delete_roles = (ROLE_ADMIN, ROLE_STORE_MANAGER)


class StockAdjustmentPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = INVENTORY_WRITE_ROLES
    delete_roles = (ROLE_ADMIN,)


class WorkerPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = (
        ROLE_ADMIN,
        ROLE_SUPERVISOR,
        ROLE_PRODUCTION_SUPERVISOR,
    )
    delete_roles = (ROLE_ADMIN,)


class WorkerProductivityPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = PRODUCTION_WRITE_ROLES
    delete_roles = (ROLE_ADMIN,)


class DefectTypePermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = QUALITY_WRITE_ROLES
    delete_roles = (ROLE_ADMIN,)


class QualityInspectionPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = QUALITY_WRITE_ROLES
    delete_roles = QUALITY_WRITE_ROLES


class ProductionPlanPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = PLANNING_WRITE_ROLES
    delete_roles = (ROLE_ADMIN, ROLE_PLANNER)


class ReportReadPermission(RoleAccessPermission):
    read_roles = ALL_ROLES
    write_roles = ()
