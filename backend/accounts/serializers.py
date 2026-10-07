from rest_framework import serializers
from .models import User,PasswordResetToken


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,#not return it in the response
        min_length=8
    )

    class Meta:
        model = User
        fields = [
            "name",
            "email",
            "password",
        ]
#creating a new user
    def create(self, validated_data):
        user = User.objects.create_user(
            name=validated_data["name"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        return user


#for profile viewing
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
        ]#we cannot modify it ,only can be viewed through this serializer

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



#for changing the password
class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        required=True
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8
    )

    def validate(self, attrs):
        user = self.context["request"].user#getting the current user 

        if not user.check_password(attrs["current_password"]):#checking the current password
            raise serializers.ValidationError({
                "current_password": "Current password is incorrect."
            })

        if attrs["current_password"] == attrs["new_password"]:#preventing the user not to use the same password
            raise serializers.ValidationError({
                "new_password": "New password must be different from the current password."
            })

        return attrs#it is a dictionary containning the validated input data




#for requesting a password reset
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        value = value.lower()

        if not User.objects.filter(email=value).exists():#check whether the error exists
            raise serializers.ValidationError(
                "No account is registered with this email."
            )

        return value


#confirming a password reset class
class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)#accepting the UUID reset token
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
    )#taking the new password 

    def validate(self, attrs):
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(
                token=attrs["token"],
                used=False,
            )
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({
                "token": "Invalid or already used reset token."
            })

        if reset_token.is_expired():#checking whether the reset token is  expired
            raise serializers.ValidationError({
                "token": "Reset token has expired."
            })

        attrs["reset_token"] = reset_token#it is stored for the usage in the views 
        return attrs