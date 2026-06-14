from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Cliente
from .serializers import ClienteSerializer, RegistroSerializer

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def registro(request):
    serializer = RegistroSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Usuario registrado correctamente.'}, status=201)
    return Response(serializer.errors, status=400)

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Cliente.objects.all()
        return Cliente.objects.filter(usuario=self.request.user)