// Manejo de autenticación
class Auth {
    constructor() {
        this.api = new API();
        this.initializeLoginForm();
    }

    initializeLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            // Mostrar loading
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Iniciando...';

            const response = await this.api.login(username, password);

            if (response.token) {
                // Guardar token
                localStorage.setItem('token', response.token);
                localStorage.setItem('usuario', JSON.stringify(response.usuario));

                // Redirigir al dashboard
                window.location.href = 'index.html';
            }
        } catch (error) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = error.message || 'Error al iniciar sesión';
            
            // Restaurar botón
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i> Iniciar Sesión';
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }

    isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    getUsuario() {
        const usuario = localStorage.getItem('usuario');
        return usuario ? JSON.parse(usuario) : null;
    }
}

// Inicializar auth
const auth = new Auth();

// Manejar logout global
function logout() {
    auth.logout();
}

// Verificar autenticación en index.html
if (window.location.pathname.includes('index.html')) {
    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
    }
}