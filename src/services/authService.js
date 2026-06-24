const API_URL = 'http://localhost:3001';

export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('vtme_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${path}`;

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        localStorage.removeItem('vtme_token');
        localStorage.removeItem('vtme_user');
        window.dispatchEvent(new Event('unauthorized'));
    }

    return response;
}

export const authService = {
    async login(email, senha) {
        const res = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        });
        
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao realizar login');
        }

        localStorage.setItem('vtme_token', data.token);
        localStorage.setItem('vtme_user', JSON.stringify(data.user));
        return data;
    },

    async logout() {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Erro ao chamar rota de logout no servidor:', e);
        } finally {
            localStorage.removeItem('vtme_token');
            localStorage.removeItem('vtme_user');
        }
    },

    async getMe() {
        const res = await apiFetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao obter dados do usuário');
        }
        return data.user;
    },

    async alterarSenha(id, senhaAntiga, novaSenha) {
        const res = await apiFetch(`/api/usuarios/${id}/alterar-senha`, {
            method: 'PUT',
            body: JSON.stringify({ senhaAntiga, novaSenha })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao alterar a senha');
        }
        return data;
    }
};

export const usuarioService = {
    async listar() {
        const res = await apiFetch('/api/usuarios');
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao listar usuários');
        }
        return data;
    },

    async criar(nome, email, senha, perfil) {
        const res = await apiFetch('/api/usuarios', {
            method: 'POST',
            body: JSON.stringify({ nome, email, senha, perfil })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao criar usuário');
        }
        return data;
    },

    async atualizar(id, nome, email, perfil, ativo) {
        const res = await apiFetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ nome, email, perfil, ativo })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao atualizar usuário');
        }
        return data;
    },

    async resetarSenha(id, novaSenha) {
        const res = await apiFetch(`/api/usuarios/${id}/resetar-senha`, {
            method: 'PUT',
            body: JSON.stringify({ novaSenha })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao resetar senha do usuário');
        }
        return data;
    },

    async alterarStatus(id, ativo) {
        const res = await apiFetch(`/api/usuarios/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ ativo })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao alterar status do usuário');
        }
        return data;
    },

    async excluir(id) {
        const res = await apiFetch(`/api/usuarios/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao excluir usuário');
        }
        return data;
    },

    async listarLogs() {
        const res = await apiFetch('/api/usuarios/auditoria/logs');
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao buscar logs de auditoria');
        }
        return data;
    }
};
