from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = User
        fields = [
            "name",
            "email",
            "password",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            name=validated_data["name"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        return user



class ProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "role",
            "created_at",
        ]

class EmployeeCreateSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = User
        fields = [
            "name",
            "email",
            "password",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            name=validated_data["name"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=User.Role.EMPLOYEE,
        )

        return user


#to do the admin user management
class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]



#for making the status of the employee
class AdminUserStatusSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()