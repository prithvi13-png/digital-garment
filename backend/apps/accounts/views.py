from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.serializers import CustomTokenObtainPairSerializer, MeSerializer, UserSerializer
from apps.core.permissions import IsAdminRole
from apps.core.services import log_activity, log_instance_activity

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ["role", "is_active"]
    search_fields = ["first_name", "last_name", "username", "email"]
    ordering_fields = ["created_at", "first_name", "username"]

    def perform_create(self, serializer):
        user = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="user_created",
            instance=user,
            description=f"Created user {user.username} with role {user.role}.",
        )

    def perform_update(self, serializer):
        user = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="user_updated",
            instance=user,
            description=f"Updated user {user.username}.",
        )

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user_id = user.id
        username = user.username
        response = super().destroy(request, *args, **kwargs)
        if response.status_code == status.HTTP_204_NO_CONTENT:
            log_activity(
                user=request.user,
                action="user_deleted",
                entity_type="User",
                entity_id=user_id,
                description=f"Deleted user {username}.",
            )
        return response
