document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            errorDiv.style.display = 'none';
            try {
                const btn = loginForm.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Iniciando...';
                const response = await api.login(username, password);
                if (response.token) {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Error al iniciar sesión';
                errorDiv.style.display = 'block';
                const btn = loginForm.querySelector('button[type="submit"]');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i> Iniciar Sesión';
            }
        });
    }
});

function logout() {
    api.logout();
    window.location.href = 'login.html';
}