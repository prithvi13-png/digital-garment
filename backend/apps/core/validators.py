from rest_framework import serializers


def validate_positive(value: int, *, field_label: str) -> int:
    if value <= 0:
        raise serializers.ValidationError(f"{field_label} must be greater than zero.")
    return value


def validate_non_negative(value: int | None, *, field_label: str, allow_none: bool = False) -> int | None:
    if value is None:
        if allow_none:
            return value
        raise serializers.ValidationError(f"{field_label} is required.")

    if value < 0:
        raise serializers.ValidationError(f"{field_label} cannot be negative.")
    return value


def validate_lte(
    *,
    left_value: int,
    right_value: int,
    left_field_label: str,
    right_field_label: str,
    left_field_name: str | None = None,
) -> None:
    if left_value > right_value:
        raise serializers.ValidationError(
            {
                left_field_name or left_field_label.lower().replace(" ", "_"): (
                    f"{left_field_label} cannot exceed {right_field_label}."
                )
            }
        )
