import { getCategorias, getProductos, login, registro, agregarItem, eliminarItem, getCarrito, crearPedidoDesdeCarrito } from './api.js'

let state = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  productos: [],
  categorias: [],
  carrito: [],
  cartOpen: false,
  modal: null, // 'login' | 'registro' | 'producto'
  productoSeleccionado: null,
  categoriaActiva: 'todos',
  loading: false,
}

const iconos = {
  laptops: '💻', smartphones: '📱', audio: '🎧',
  accesorios: '⌨️', monitores: '🖥️', tablets: '📟',
  default: '📦'
}

function getIcono(categoria) {
  if (!categoria) return iconos.default
  const n = categoria.toLowerCase()
  for (const k in iconos) if (n.includes(k)) return iconos[k]
  return iconos.default
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast')
  t.className = `toast ${type}`
  t.innerHTML = `<i class="fa fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 3000)
}

export function renderApp() {
  document.getElementById('app').innerHTML = `
    <div id="toast" class="toast"></div>
    <div id="cart-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:299" onclick="window.__closeCart()"></div>
    <div id="cart-panel" class="cart-panel"></div>
    <div id="modal-container"></div>
    <nav class="navbar">
      <a class="nav-logo"><span>Tech</span>Store</a>
      <div class="nav-links">
        <button class="nav-link active" onclick="window.__filterCat('todos')">Inicio</button>
        <button class="nav-link" onclick="window.__filterCat('laptops')">Laptops</button>
        <button class="nav-link" onclick="window.__filterCat('smartphones')">Smartphones</button>
        <button class="nav-link" onclick="window.__filterCat('audio')">Audio</button>
        <button class="nav-link" onclick="window.__filterCat('accesorios')">Accesorios</button>
      </div>
      <div class="nav-right">
        <button class="nav-icon-btn" onclick="window.__openCart()">
          <i class="fa fa-shopping-cart"></i>
          <span class="badge" id="cart-count">0</span>
        </button>
        <div id="nav-auth"></div>
      </div>
    </nav>
    <section class="hero">
      <div class="hero-content">
        <h1>Tecnología que<br><span>transforma</span> tu mundo</h1>
        <p>Los mejores productos tech al mejor precio. Envío gratis en compras mayores a S/. 299.</p>
        <div class="hero-btns">
          <button class="btn-hero-primary" onclick="window.__filterCat('todos')">Ver productos</button>
          <button class="btn-hero-outline" onclick="window.__filterCat('laptops')">Ver laptops</button>
        </div>
      </div>
      <div class="hero-visual">💻</div>
    </section>
    <div id="cats-bar" class="cats-bar"></div>
    <main class="section">
      <div class="section-header">
        <h2 class="section-title" id="section-title">Todos los productos</h2>
      </div>
      <div id="products-grid" class="products-grid"><div class="loading">Cargando productos...</div></div>
    </main>
    <div class="features-bar">
      <div class="feature-item"><span class="feature-icon">🚚</span><div class="feature-text"><strong>Envío rápido</strong><span>24 a 48 horas</span></div></div>
      <div class="feature-item"><span class="feature-icon">🛡️</span><div class="feature-text"><strong>Garantía oficial</strong><span>1 año en todos los productos</span></div></div>
      <div class="feature-item"><span class="feature-icon">🔄</span><div class="feature-text"><strong>Devoluciones</strong><span>30 días sin preguntas</span></div></div>
      <div class="feature-item"><span class="feature-icon">🔒</span><div class="feature-text"><strong>Pago seguro</strong><span>Cifrado SSL total</span></div></div>
    </div>
    <footer class="footer"><p>© 2025 <strong>TechStore</strong> — Tienda de tecnología profesional</p></footer>
  `
  window.__filterCat = filterCat
  window.__openCart = openCart
  window.__closeCart = closeCart
  window.__removeItem = removeItem
  window.__openModal = openModal
  window.__closeModal = closeModal
  window.__submitLogin = submitLogin
  window.__submitRegistro = submitRegistro
  window.__checkout = checkout

  loadData()
  renderAuthBtn()
}

async function loadData() {
  try {
    const [prods, cats] = await Promise.all([getProductos(), getCategorias()])
    state.productos = prods.data.results || prods.data
    state.categorias = cats.data.results || cats.data
    renderCats()
    renderProductos()
  } catch (e) {
    document.getElementById('products-grid').innerHTML =
      '<div class="empty-state"><i class="fa fa-plug"></i><p>No se pudo conectar con el servidor.<br>Asegúrate que Django está corriendo.</p></div>'
  }
}

function renderCats() {
  const bar = document.getElementById('cats-bar')
  const cats = [{ nombre: 'Todos', slug: 'todos' }, ...state.categorias.map(c => ({ nombre: c.nombre, slug: c.nombre.toLowerCase() }))]
  bar.innerHTML = cats.map(c => `<button class="cat-chip ${c.slug === state.categoriaActiva ? 'active' : ''}" onclick="window.__filterCat('${c.slug}')">${getIcono(c.slug)} ${c.nombre}</button>`).join('')
}

function renderProductos() {
  const grid = document.getElementById('products-grid')
  let lista = state.productos
  if (state.categoriaActiva !== 'todos') {
    lista = lista.filter(p => p.categoria_nombre?.toLowerCase().includes(state.categoriaActiva) || p.categoria?.toString() === state.categoriaActiva)
  }
  if (!lista.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa fa-box-open"></i><p>No hay productos en esta categoría.</p></div>'
    return
  }
  grid.innerHTML = lista.map(p => `
    <div class="product-card" onclick="window.__verProducto(${p.id})">
      <div class="product-img">
        <span>${getIcono(p.categoria_nombre || '')}</span>
        ${p.stock === 0 ? '<span class="product-badge badge-sale">Sin stock</span>' : ''}
      </div>
      <div class="product-body">
        <div class="product-cat">${p.categoria_nombre || 'General'}</div>
        <div class="product-name">${p.nombre}</div>
        <div class="product-footer">
          <div>
            <span class="product-price">S/. ${parseFloat(p.precio).toFixed(2)}</span>
          </div>
          <button class="btn-add" onclick="event.stopPropagation(); window.__addToCart(${p.id})" ${p.stock === 0 ? 'disabled style="background:var(--gray-300);cursor:not-allowed"' : ''}>
            <i class="fa fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('')

  window.__addToCart = async (id) => {
    if (!state.token) { openModal('login'); return }
    try {
      await agregarItem({ producto_id: id, cantidad: 1 })
      toast('Producto agregado al carrito ✓')
      loadCarrito()
    } catch (e) {
      toast(e.response?.data?.error || 'Error al agregar', 'error')
    }
  }
  window.__verProducto = (id) => {
    const p = state.productos.find(x => x.id === id)
    if (p) { state.productoSeleccionado = p; openModal('producto') }
  }
}

async function loadCarrito() {
  if (!state.token) return
  try {
    const res = await getCarrito()
    state.carrito = res.data.items || []
    document.getElementById('cart-count').textContent = state.carrito.length
    renderCartPanel()
  } catch (e) {}
}

function renderCartPanel() {
  const panel = document.getElementById('cart-panel')
  const total = state.carrito.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0)
  panel.innerHTML = `
    <div class="cart-panel-header">
      <h3 class="modal-title">🛒 Mi Carrito (${state.carrito.length})</h3>
      <button class="modal-close" onclick="window.__closeCart()"><i class="fa fa-times"></i></button>
    </div>
    <div class="cart-items">
      ${state.carrito.length === 0
        ? '<div class="empty-state"><i class="fa fa-shopping-cart"></i><p>Tu carrito está vacío</p></div>'
        : state.carrito.map(i => `
        <div class="cart-item">
          <span class="cart-item-icon">${getIcono(i.producto_detalle?.categoria_nombre || '')}</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${i.producto_detalle?.nombre || 'Producto'}</div>
            <div class="cart-item-price">${i.cantidad}x S/. ${parseFloat(i.producto_detalle?.precio || 0).toFixed(2)} = S/. ${parseFloat(i.subtotal).toFixed(2)}</div>
          </div>
          <button class="cart-item-remove" onclick="window.__removeItem(${i.id})"><i class="fa fa-trash"></i></button>
        </div>`).join('')}
    </div>
    ${state.carrito.length > 0 ? `
    <div class="cart-footer">
      <div class="cart-total"><span>Total</span><span>S/. ${total.toFixed(2)}</span></div>
      <button class="btn-checkout" onclick="window.__checkout()"><i class="fa fa-credit-card"></i> Realizar pedido</button>
    </div>` : ''}
  `
}

function openCart() {
  state.cartOpen = true
  document.getElementById('cart-panel').classList.add('open')
  document.getElementById('cart-overlay').style.display = 'block'
  if (state.token) loadCarrito()
  else { renderCartPanel(); }
}

function closeCart() {
  state.cartOpen = false
  document.getElementById('cart-panel').classList.remove('open')
  document.getElementById('cart-overlay').style.display = 'none'
}

async function removeItem(id) {
  try {
    await eliminarItem(id)
    toast('Item eliminado')
    loadCarrito()
  } catch (e) { toast('Error al eliminar', 'error') }
}

async function checkout() {
  if (!state.carrito.length) {
    toast('Tu carrito está vacío', 'error')
    return
  }
  const total = state.carrito.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0)
  
  // Cerrar carrito y mostrar modal de pago
  closeCart()
  
  const container = document.getElementById('modal-container')
  container.innerHTML = `
    <div class="overlay">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">💳 Finalizar compra</span>
          <button class="modal-close" onclick="window.__closeModal()"><i class="fa fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div style="background:var(--gray-50);border-radius:var(--radius);padding:1rem;margin-bottom:1.25rem">
            <div style="display:flex;justify-content:space-between;font-weight:600;font-size:1.1rem">
              <span>Total a pagar:</span>
              <span style="color:var(--primary)">S/. ${total.toFixed(2)}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--gray-500);margin-top:0.25rem">${state.carrito.length} producto(s)</div>
          </div>
          <div style="margin-bottom:1rem;padding:0.75rem;background:#fff3cd;border-radius:var(--radius-sm);font-size:0.85rem;color:#856404">
            <i class="fa fa-info-circle"></i> Modo Sandbox — usa las credenciales de prueba de PayPal
          </div>
          <div id="paypal-button-container"></div>
          <div id="pago-resultado" style="display:none"></div>
        </div>
      </div>
    </div>`

  // Cargar SDK de PayPal
  const script = document.createElement('script')
  script.src = `https://www.paypal.com/sdk/js?client-id=AaPNby2fQyfH-D_pSkNfybekJwoATjOx8pwByLMfKG7xD2pw6u5CdZdyjh7lH3m0CYuwI3HiDXJwymQq&currency=USD`
  script.onload = () => {
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay'
      },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            description: `TechStore - ${state.carrito.length} producto(s)`,
            amount: {
              currency_code: 'USD',
              value: (total / 3.7).toFixed(2) // Conversión S/. a USD
            }
          }]
        })
      },
      onApprove: async (data, actions) => {
        const order = await actions.order.capture()
        
        // Crear pedido en Django
        try {
          const dir = state.user?.direccion || 'Dirección por confirmar'
          await crearPedidoDesdeCarrito({ direccion_entrega: dir })
          
          const resultado = document.getElementById('pago-resultado')
          resultado.style.display = 'block'
          resultado.innerHTML = `
            <div style="text-align:center;padding:1.5rem;background:#dcfce7;border-radius:var(--radius);margin-top:1rem">
              <div style="font-size:3rem;margin-bottom:0.75rem">✅</div>
              <div style="font-weight:700;font-size:1.1rem;color:#16a34a;margin-bottom:0.5rem">¡Pago exitoso!</div>
              <div style="font-size:0.85rem;color:#166534">ID de transacción: ${order.id}</div>
              <div style="font-size:0.85rem;color:#166534">Total pagado: $${(total/3.7).toFixed(2)} USD</div>
            </div>`
          
          document.getElementById('paypal-button-container').style.display = 'none'
          state.carrito = []
          document.getElementById('cart-count').textContent = '0'
          toast('¡Pago completado exitosamente! 🎉')
        } catch(e) {
          toast('Pago aprobado pero error al crear pedido', 'error')
        }
      },
      onError: (err) => {
        toast('Error en el pago. Intenta de nuevo.', 'error')
      },
      onCancel: () => {
        toast('Pago cancelado', 'error')
      }
    }).render('#paypal-button-container')
  }
  document.body.appendChild(script)
}

function filterCat(cat) {
  state.categoriaActiva = cat
  document.getElementById('section-title').textContent = cat === 'todos' ? 'Todos los productos' : cat.charAt(0).toUpperCase() + cat.slice(1)
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'))
  document.querySelectorAll('.nav-link').forEach(c => c.classList.remove('active'))
  renderCats()
  renderProductos()
}

function renderAuthBtn() {
  const el = document.getElementById('nav-auth')
  if (state.token && state.user) {
    el.innerHTML = `<div style="display:flex;align-items:center;gap:0.5rem">
      <span style="font-size:0.85rem;color:var(--gray-600);font-weight:500">Hola, ${state.user.first_name || state.user.username}</span>
      <button class="btn-nav-login" style="background:var(--gray-200);color:var(--gray-700)" onclick="window.__logout()">Salir</button>
    </div>`
    window.__logout = () => {
      localStorage.removeItem('token'); localStorage.removeItem('user')
      state.token = null; state.user = null; state.carrito = []
      document.getElementById('cart-count').textContent = '0'
      renderAuthBtn(); toast('Sesión cerrada')
    }
  } else {
    el.innerHTML = `<button class="btn-nav-login" onclick="window.__openModal('login')">Iniciar sesión</button>`
  }
}

function openModal(type) {
  state.modal = type
  const container = document.getElementById('modal-container')
  if (type === 'login') {
    container.innerHTML = `
      <div class="overlay" onclick="if(event.target===this)window.__closeModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Iniciar sesión</span>
            <button class="modal-close" onclick="window.__closeModal()"><i class="fa fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div id="login-error" style="display:none;background:#fee2e2;color:#dc2626;padding:0.75rem;border-radius:8px;margin-bottom:1rem;font-size:0.875rem"></div>
            <div class="form-group"><label class="form-label">Usuario</label><input class="form-input" id="l-user" placeholder="Tu usuario" /></div>
            <div class="form-group"><label class="form-label">Contraseña</label><input class="form-input" id="l-pass" type="password" placeholder="••••••••" /></div>
            <button class="btn-primary" onclick="window.__submitLogin()">Ingresar</button>
            <div class="form-switch">¿No tienes cuenta? <a onclick="window.__openModal('registro')">Regístrate aquí</a></div>
          </div>
        </div>
      </div>`
  } else if (type === 'registro') {
    container.innerHTML = `
      <div class="overlay" onclick="if(event.target===this)window.__closeModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Crear cuenta</span>
            <button class="modal-close" onclick="window.__closeModal()"><i class="fa fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div id="reg-error" style="display:none;background:#fee2e2;color:#dc2626;padding:0.75rem;border-radius:8px;margin-bottom:1rem;font-size:0.875rem"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
              <div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="r-first" placeholder="Juan" /></div>
              <div class="form-group"><label class="form-label">Apellido</label><input class="form-input" id="r-last" placeholder="Pérez" /></div>
            </div>
            <div class="form-group"><label class="form-label">Usuario</label><input class="form-input" id="r-user" placeholder="juanperez123" /></div>
            <div class="form-group"><label class="form-label">Correo</label><input class="form-input" id="r-email" type="email" placeholder="juan@email.com" /></div>
            <div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" id="r-tel" placeholder="987654321" /></div>
            <div class="form-group"><label class="form-label">Contraseña</label><input class="form-input" id="r-pass" type="password" placeholder="Mínimo 6 caracteres" /></div>
            <button class="btn-primary" onclick="window.__submitRegistro()">Crear cuenta</button>
            <div class="form-switch">¿Ya tienes cuenta? <a onclick="window.__openModal('login')">Inicia sesión</a></div>
          </div>
        </div>
      </div>`
  } else if (type === 'producto' && state.productoSeleccionado) {
    const p = state.productoSeleccionado
    container.innerHTML = `
      <div class="overlay" onclick="if(event.target===this)window.__closeModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">${p.nombre}</span>
            <button class="modal-close" onclick="window.__closeModal()"><i class="fa fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div style="text-align:center;font-size:5rem;padding:1rem;background:var(--gray-50);border-radius:var(--radius);margin-bottom:1.25rem">${getIcono(p.categoria_nombre || '')}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
              <span style="font-size:1.5rem;font-weight:700">S/. ${parseFloat(p.precio).toFixed(2)}</span>
              <span style="font-size:0.85rem;padding:4px 12px;border-radius:999px;background:${p.stock > 0 ? '#dcfce7' : '#fee2e2'};color:${p.stock > 0 ? '#16a34a' : '#dc2626'};font-weight:600">${p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock'}</span>
            </div>
            <p style="color:var(--gray-600);font-size:0.9rem;margin-bottom:1.25rem">${p.descripcion || 'Sin descripción disponible.'}</p>
            <button class="btn-primary" onclick="window.__addToCart(${p.id});window.__closeModal()" ${p.stock === 0 ? 'disabled style="background:var(--gray-300)"' : ''}>
              <i class="fa fa-cart-plus"></i> Agregar al carrito
            </button>
          </div>
        </div>
      </div>`
  }
}

function closeModal() {
  document.getElementById('modal-container').innerHTML = ''
  state.modal = null
}

async function submitLogin() {
  const username = document.getElementById('l-user').value.trim()
  const password = document.getElementById('l-pass').value
  if (!username || !password) { showError('login-error', 'Completa todos los campos.'); return }
  try {
    const res = await login({ username, password })
    localStorage.setItem('token', res.data.access)
    state.token = res.data.access
    // Obtener info del usuario
    const { default: API } = await import('./api.js')
    const me = await API.get('/clientes/')
    state.user = { username, first_name: username }
    localStorage.setItem('user', JSON.stringify(state.user))
    closeModal(); renderAuthBtn(); loadCarrito()
    toast(`Bienvenido, ${username}! 👋`)
  } catch (e) {
    showError('login-error', 'Usuario o contraseña incorrectos.')
  }
}

async function submitRegistro() {
  const data = {
    first_name: document.getElementById('r-first').value.trim(),
    last_name: document.getElementById('r-last').value.trim(),
    username: document.getElementById('r-user').value.trim(),
    email: document.getElementById('r-email').value.trim(),
    telefono: document.getElementById('r-tel').value.trim(),
    password: document.getElementById('r-pass').value,
  }
  if (!data.username || !data.password || !data.email) { showError('reg-error', 'Completa los campos obligatorios.'); return }
  try {
    await registro(data)
    toast('Cuenta creada. Ahora inicia sesión.')
    openModal('login')
  } catch (e) {
    const err = e.response?.data
    const msg = typeof err === 'object' ? Object.values(err).flat().join(' ') : 'Error al registrarse.'
    showError('reg-error', msg)
  }
}

function showError(id, msg) {
  const el = document.getElementById(id)
  if (el) { el.style.display = 'block'; el.textContent = msg }
}