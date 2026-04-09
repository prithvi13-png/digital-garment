from rest_framework import serializers

from apps.buyers.models import Buyer


class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = (
            "id",
            "name",
            "company_name",
            "email",
            "phone",
            "address",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
