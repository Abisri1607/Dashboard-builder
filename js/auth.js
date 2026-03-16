// --- Auth Flow Logic ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const subtitle = document.getElementById('auth-subtitle');
const errorMsg = document.getElementById('auth-error-msg');

const API_BASE = 'http://localhost:3000/api/auth';

// Toggle views
if (switchToRegister) {
    switchToRegister.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        subtitle.textContent = 'Create a new account';
        errorMsg.style.display = 'none';
    });
}

if (switchToLogin) {
    switchToLogin.addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        subtitle.textContent = 'Sign in to your account';
        errorMsg.style.display = 'none';
    });
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
}

function handleAuthSuccess(token, user) {
    // Store token securely in localStorage for cross-page persistence
    localStorage.setItem('dashbuilder_token', token);
    localStorage.setItem('dashbuilder_user', JSON.stringify(user));
    window.location.href = 'index.html';
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                handleAuthSuccess(data.token, data.user);
            } else {
                showError(data.message || 'Login failed');
            }
        } catch (err) {
            showError('Server error. Ensure Node backend is running.');
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                handleAuthSuccess(data.token, data.user);
            } else {
                showError(data.message || 'Registration failed');
            }
        } catch (err) {
            showError('Server error. Ensure Node backend is running.');
        }
    });
}
