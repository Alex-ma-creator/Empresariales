from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Pedido, DetallePedido
from .serializers import PedidoSerializer
from carrito.models import Carrito

class PedidoViewSet(viewsets.ModelViewSet):
    serializer_class = PedidoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Pedido.objects.all()
        return Pedido.objects.filter(cliente=self.request.user.cliente)

    def perform_create(self, serializer):
        serializer.save(cliente=self.request.user.cliente)

    @action(detail=False, methods=['post'])
    def desde_carrito(self, request):
        try:
            carrito = Carrito.objects.get(cliente=request.user.cliente)
        except Carrito.DoesNotExist:
            return Response({'error': 'No tienes carrito.'}, status=400)
        items = carrito.items.select_related('producto').all()
        if not items.exists():
            return Response({'error': 'El carrito está vacío.'}, status=400)
        for item in items:
            if item.producto.stock < item.cantidad:
                return Response({'error': f'Stock insuficiente para {item.producto.nombre}.'}, status=400)
        direccion = request.data.get('direccion_entrega', request.user.cliente.direccion)
        pedido = Pedido.objects.create(
            cliente=request.user.cliente,
            direccion_entrega=direccion,
            total=carrito.total()
        )
        for item in items:
            DetallePedido.objects.create(
                pedido=pedido,
                producto=item.producto,
                cantidad=item.cantidad,
                precio_unitario=item.producto.precio
            )
            item.producto.stock -= item.cantidad
            item.producto.save()
        carrito.items.all().delete()
        return Response(PedidoSerializer(pedido).data, status=201)

    def destroy(self, request, *args, **kwargs):
        pedido = self.get_object()
        if pedido.estado == 'pagado':
            return Response({'error': 'No se puede eliminar un pedido pagado.'}, status=400)
        return super().destroy(request, *args, **kwargs)