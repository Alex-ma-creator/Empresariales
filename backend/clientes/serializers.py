from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Cliente

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class ClienteSerializer(serializers.ModelSerializer):
    usuario = UserSerializer(read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'

class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    telefono = serializers.CharField(required=False, allow_blank=True)
    direccion = serializers.CharField(required=False, allow_blank=True)
    dni = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name',
                  'telefono', 'direccion', 'dni']

    def create(self, validated_data):
        telefono = validated_data.pop('telefono', '')
        direccion = validated_data.pop('direccion', '')
        dni = validated_data.pop('dni', '')
        user = User.objects.create_user(**validated_data)
        Cliente.objects.create(usuario=user, telefono=telefono,
                               direccion=direccion, dni=dni)
        return user