from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db.models import QuerySet, Sum
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Material, MaterialStockInward, MaterialStockIssue, StockAdjustment

DECIMAL_ZERO = Decimal("0")


@dataclass(frozen=True)
class MaterialStockBreakdown:
    inward_total: Decimal
    issued_total: Decimal
    adjustment_increase_total: Decimal
    adjustment_decrease_total: Decimal

    @property
    def current_stock(self) -> Decimal:
        return self.inward_total - self.issued_total + self.adjustment_increase_total - self.adjustment_decrease_total


def _as_decimal(value: Decimal | int | float | None) -> Decimal:
    if value is None:
        return DECIMAL_ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _aggregate_by_material(queryset: QuerySet, value_field: str = "quantity") -> dict[int, Decimal]:
    rows = queryset.values("material_id").annotate(total=Coalesce(Sum(value_field), DECIMAL_ZERO))
    return {row["material_id"]: _as_decimal(row["total"]) for row in rows}


def get_material_stock_breakdown_map(material_ids: list[int]) -> dict[int, MaterialStockBreakdown]:
    if not material_ids:
        return {}

    inward_totals = _aggregate_by_material(MaterialStockInward.objects.filter(material_id__in=material_ids))
    issued_totals = _aggregate_by_material(MaterialStockIssue.objects.filter(material_id__in=material_ids))
    increase_totals = _aggregate_by_material(
        StockAdjustment.objects.filter(
            material_id__in=material_ids,
            adjustment_type=StockAdjustment.AdjustmentType.INCREASE,
        )
    )
    decrease_totals = _aggregate_by_material(
        StockAdjustment.objects.filter(
            material_id__in=material_ids,
            adjustment_type=StockAdjustment.AdjustmentType.DECREASE,
        )
    )

    stock_map: dict[int, MaterialStockBreakdown] = {}
    for material_id in material_ids:
        stock_map[material_id] = MaterialStockBreakdown(
            inward_total=inward_totals.get(material_id, DECIMAL_ZERO),
            issued_total=issued_totals.get(material_id, DECIMAL_ZERO),
            adjustment_increase_total=increase_totals.get(material_id, DECIMAL_ZERO),
            adjustment_decrease_total=decrease_totals.get(material_id, DECIMAL_ZERO),
        )
    return stock_map


def get_material_stock_breakdown(material_id: int) -> MaterialStockBreakdown:
    return get_material_stock_breakdown_map([material_id]).get(
        material_id,
        MaterialStockBreakdown(
            inward_total=DECIMAL_ZERO,
            issued_total=DECIMAL_ZERO,
            adjustment_increase_total=DECIMAL_ZERO,
            adjustment_decrease_total=DECIMAL_ZERO,
        ),
    )


def get_material_available_stock(material_id: int) -> Decimal:
    return get_material_stock_breakdown(material_id).current_stock


def validate_issue_quantity_available(
    *,
    material: Material,
    quantity: Decimal,
    existing_issue: MaterialStockIssue | None = None,
) -> None:
    available_stock = get_material_available_stock(material.id)

    if existing_issue and existing_issue.material_id == material.id:
        available_stock += _as_decimal(existing_issue.quantity)

    if quantity > available_stock:
        raise ValidationError(
            {
                "quantity": (
                    f"Issue quantity exceeds available stock for {material.code}. "
                    f"Available: {available_stock}."
                )
            }
        )


def validate_decrease_adjustment_allowed(
    *,
    material: Material,
    quantity: Decimal,
    existing_adjustment: StockAdjustment | None = None,
) -> None:
    available_stock = get_material_available_stock(material.id)

    if existing_adjustment and existing_adjustment.material_id == material.id:
        existing_qty = _as_decimal(existing_adjustment.quantity)
        if existing_adjustment.adjustment_type == StockAdjustment.AdjustmentType.DECREASE:
            # Existing decrease is already deducted in current stock; add it back for update validation.
            available_stock += existing_qty
        elif existing_adjustment.adjustment_type == StockAdjustment.AdjustmentType.INCREASE:
            # Existing increase is currently included in stock; remove it when switching to decrease.
            available_stock -= existing_qty

    if quantity > available_stock:
        raise ValidationError(
            {
                "quantity": (
                    f"Decrease adjustment exceeds available stock for {material.code}. "
                    f"Available: {available_stock}."
                )
            }
        )


def build_material_stock_rows(material_queryset: QuerySet[Material]) -> list[dict]:
    materials = list(material_queryset)
    stock_map = get_material_stock_breakdown_map([material.id for material in materials])

    rows: list[dict] = []
    for material in materials:
        breakdown = stock_map.get(material.id) or MaterialStockBreakdown(
            inward_total=DECIMAL_ZERO,
            issued_total=DECIMAL_ZERO,
            adjustment_increase_total=DECIMAL_ZERO,
            adjustment_decrease_total=DECIMAL_ZERO,
        )
        rows.append(
            {
                "material_id": material.id,
                "code": material.code,
                "name": material.name,
                "material_type": material.material_type,
                "unit": material.unit,
                "is_active": material.is_active,
                "inward_total": breakdown.inward_total,
                "issued_total": breakdown.issued_total,
                "adjustment_increase_total": breakdown.adjustment_increase_total,
                "adjustment_decrease_total": breakdown.adjustment_decrease_total,
                "current_stock": breakdown.current_stock,
            }
        )
    return rows


def get_material_movements(
    *,
    material_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    inward_qs = MaterialStockInward.objects.select_related("material", "created_by")
    issue_qs = MaterialStockIssue.objects.select_related("material", "order", "production_line", "created_by")
    adjust_qs = StockAdjustment.objects.select_related("material", "created_by")

    if material_id:
        inward_qs = inward_qs.filter(material_id=material_id)
        issue_qs = issue_qs.filter(material_id=material_id)
        adjust_qs = adjust_qs.filter(material_id=material_id)

    if date_from:
        inward_qs = inward_qs.filter(inward_date__gte=date_from)
        issue_qs = issue_qs.filter(issue_date__gte=date_from)
        adjust_qs = adjust_qs.filter(adjustment_date__gte=date_from)

    if date_to:
        inward_qs = inward_qs.filter(inward_date__lte=date_to)
        issue_qs = issue_qs.filter(issue_date__lte=date_to)
        adjust_qs = adjust_qs.filter(adjustment_date__lte=date_to)

    rows: list[dict] = []

    for inward in inward_qs:
        rows.append(
            {
                "movement_type": "inward",
                "date": inward.inward_date,
                "material_id": inward.material_id,
                "material_code": inward.material.code,
                "material_name": inward.material.name,
                "unit": inward.material.unit,
                "quantity_in": _as_decimal(inward.quantity),
                "quantity_out": DECIMAL_ZERO,
                "net_quantity": _as_decimal(inward.quantity),
                "reference_id": inward.id,
                "batch_no": inward.batch_no,
                "roll_no": inward.roll_no,
                "order_code": None,
                "line_name": None,
                "remarks": inward.remarks,
                "barcode_value": inward.barcode_value,
                "created_by_name": (
                    inward.created_by.get_full_name() or inward.created_by.username
                    if inward.created_by
                    else "-"
                ),
            }
        )

    for issue in issue_qs:
        quantity = _as_decimal(issue.quantity)
        rows.append(
            {
                "movement_type": "issue",
                "date": issue.issue_date,
                "material_id": issue.material_id,
                "material_code": issue.material.code,
                "material_name": issue.material.name,
                "unit": issue.material.unit,
                "quantity_in": DECIMAL_ZERO,
                "quantity_out": quantity,
                "net_quantity": -quantity,
                "reference_id": issue.id,
                "batch_no": "",
                "roll_no": "",
                "order_code": issue.order.order_code if issue.order else None,
                "line_name": issue.production_line.name if issue.production_line else None,
                "remarks": issue.remarks,
                "barcode_value": issue.barcode_value,
                "created_by_name": (
                    issue.created_by.get_full_name() or issue.created_by.username
                    if issue.created_by
                    else "-"
                ),
            }
        )

    for adjustment in adjust_qs:
        quantity = _as_decimal(adjustment.quantity)
        is_increase = adjustment.adjustment_type == StockAdjustment.AdjustmentType.INCREASE
        rows.append(
            {
                "movement_type": f"adjustment_{adjustment.adjustment_type}",
                "date": adjustment.adjustment_date,
                "material_id": adjustment.material_id,
                "material_code": adjustment.material.code,
                "material_name": adjustment.material.name,
                "unit": adjustment.material.unit,
                "quantity_in": quantity if is_increase else DECIMAL_ZERO,
                "quantity_out": quantity if not is_increase else DECIMAL_ZERO,
                "net_quantity": quantity if is_increase else -quantity,
                "reference_id": adjustment.id,
                "batch_no": "",
                "roll_no": "",
                "order_code": None,
                "line_name": None,
                "remarks": adjustment.reason,
                "barcode_value": None,
                "created_by_name": (
                    adjustment.created_by.get_full_name() or adjustment.created_by.username
                    if adjustment.created_by
                    else "-"
                ),
            }
        )

    rows.sort(key=lambda row: (row["date"], row["reference_id"]), reverse=True)
    return rows


def build_consumption_variance_rows(issue_queryset: QuerySet[MaterialStockIssue]) -> list[dict]:
    grouped_rows = (
        issue_queryset.values(
            "order_id",
            "order__order_code",
            "order__buyer__company_name",
            "material_id",
            "material__code",
            "material__name",
            "material__unit",
        )
        .annotate(actual_consumption=Coalesce(Sum("quantity"), DECIMAL_ZERO))
        .order_by("order__order_code", "material__code")
    )

    rows: list[dict] = []
    for row in grouped_rows:
        actual = _as_decimal(row["actual_consumption"])
        rows.append(
            {
                "order_id": row["order_id"],
                "order_code": row["order__order_code"],
                "buyer_name": row["order__buyer__company_name"],
                "material_id": row["material_id"],
                "material_code": row["material__code"],
                "material_name": row["material__name"],
                "unit": row["material__unit"],
                "actual_consumption": actual,
                # Expected consumption is intentionally nullable in Phase 2.
                "expected_consumption": None,
                "variance": None,
                "wastage_percent": None,
            }
        )

    return rows


def summarize_inventory_rows(rows: list[dict], *, low_stock_threshold: Decimal) -> dict:
    low_stock_count = 0
    total_stock = DECIMAL_ZERO

    for row in rows:
        current_stock = _as_decimal(row.get("current_stock"))
        total_stock += current_stock
        if current_stock <= low_stock_threshold:
            low_stock_count += 1

    return {
        "total_materials": len(rows),
        "total_current_stock": total_stock,
        "low_stock_count": low_stock_count,
        "low_stock_threshold": low_stock_threshold,
    }


def summarize_movements(rows: list[dict]) -> dict:
    total_inward = DECIMAL_ZERO
    total_outward = DECIMAL_ZERO
    for row in rows:
        total_inward += _as_decimal(row.get("quantity_in"))
        total_outward += _as_decimal(row.get("quantity_out"))

    return {
        "total_movements": len(rows),
        "total_inward": total_inward,
        "total_outward": total_outward,
        "net_change": total_inward - total_outward,
    }


def summarize_consumption_rows(rows: list[dict]) -> dict:
    total_actual_consumption = sum((_as_decimal(row["actual_consumption"]) for row in rows), DECIMAL_ZERO)
    order_ids = {row["order_id"] for row in rows if row.get("order_id")}
    material_ids = {row["material_id"] for row in rows if row.get("material_id")}

    return {
        "total_rows": len(rows),
        "orders_covered": len(order_ids),
        "materials_covered": len(material_ids),
        "total_actual_consumption": total_actual_consumption,
    }


def build_low_stock_rows(
    material_queryset: QuerySet[Material],
    *,
    low_stock_threshold: Decimal,
) -> list[dict]:
    rows = build_material_stock_rows(material_queryset)
    for row in rows:
        row["is_low_stock"] = _as_decimal(row["current_stock"]) <= low_stock_threshold
    return [row for row in rows if row["is_low_stock"]]
