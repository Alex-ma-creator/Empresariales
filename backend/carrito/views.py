from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Carrito, ItemCarrito
from .serializers import CarritoSerializer
from productos.models import Producto

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ver_carrito(request):
    carrito, _ = Carrito.objects.get_or_create(cliente=request.user.cliente)
    serializer = CarritoSerializer(carrito)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agregar_item(request):
    producto_id = request.data.get('producto_id')
    cantidad = int(request.data.get('cantidad', 1))
    try:
        producto = Producto.objects.get(id=producto_id, activo=True)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado.'}, status=404)
    if producto.stock < cantidad:
        return Response({'error': 'Stock insuficiente.'}, status=400)
    carrito, _ = Carrito.objects.get_or_create(cliente=request.user.cliente)
    item, created = ItemCarrito.objects.get_or_create(carrito=carrito, producto=producto)
    if not created:
        item.cantidad += cantidad
    else:
        item.cantidad = cantidad
    item.save()
    return Response({'mensaje': 'Producto agregado al carrito.'})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_item(request, item_id):
    try:
        item = ItemCarrito.objects.get(id=item_id, carrito__cliente=request.user.cliente)
        item.delete()
        return Response({'mensaje': 'Item eliminado.'})
    except ItemCarrito.DoesNotExist:
        return Response({'error': 'Item no encontrado.'}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def vaciar_carrito(request):
    try:
        carrito = Carrito.objects.get(cliente=request.user.cliente)
        carrito.items.all().delete()
        return Response({'mensaje': 'Carrito vaciado.'})
    except Carrito.DoesNotExist:
        return Response({'error': 'No tienes carrito.'}, status=404)