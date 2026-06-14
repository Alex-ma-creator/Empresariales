import axios from 'axios'

const API = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : 'http://127.0.0.1:8000/api' 
})

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getProductos = (params) => API.get('/productos/', { params })
export const getCategorias = () => API.get('/categorias/')
export const login = (data) => API.post('/auth/login/', data)
export const registro = (data) => API.post('/auth/registro/', data)
export const getCarrito = () => API.get('/carrito/')
export const agregarItem = (data) => API.post('/carrito/agregar/', data)
export const eliminarItem = (id) => API.delete(`/carrito/eliminar/${id}/`)
export const vaciarCarrito = () => API.delete('/carrito/vaciar/')
export const crearPedidoDesdeCarrito = (data) => API.post('/pedidos/desde_carrito/', data)
export const getPedidos = () => API.get('/pedidos/')

export default API