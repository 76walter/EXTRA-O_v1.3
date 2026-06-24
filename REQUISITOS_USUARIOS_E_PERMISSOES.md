# Sistema de Usuários, Permissões e Autenticação

## Tecnologia Recomendada

### Front-End

* React
* React Router
* Context API ou Redux

### Back-End

* Node.js
* Express

### Banco de Dados

* MariaDB

### Autenticação

* JWT (JSON Web Token)

### Segurança

* bcrypt

### Middlewares

* authMiddleware.js
* permissionMiddleware.js

---

# Estrutura do Banco de Dados

## Tabela usuarios

```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM(
        'ADMIN',
        'GERENTE',
        'SUPERVISOR',
        'CONSULTOR',
        'CHURN'
    ) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
```

---

# Perfis Disponíveis

* ADMIN
* GERENTE
* SUPERVISOR
* CONSULTOR
* CHURN

---

# Primeiro Acesso

Ao iniciar o sistema:

1. Verificar se existe usuário ADMIN.
2. Caso não exista, criar automaticamente:

Email:

```
admin@sistema.com
```

Senha:

```
admin123
```

Perfil:

```
ADMIN
```

3. Exigir troca de senha no primeiro login.

---

# Rotas Back-End

```http
POST   /api/login
POST   /api/logout
GET    /api/me

GET    /api/usuarios
POST   /api/usuarios
PUT    /api/usuarios/:id
DELETE /api/usuarios/:id

PUT    /api/usuarios/:id/resetar-senha
PUT    /api/usuarios/:id/status
```

---

# Estrutura Back-End

```text
src-server/
├── database/
│   └── mariadb.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── permissionMiddleware.js
│
├── routes/
│   ├── authRoutes.js
│   └── usuarioRoutes.js
│
├── controllers/
│   ├── authController.js
│   └── usuarioController.js
│
├── services/
│   ├── authService.js
│   └── usuarioService.js
│
└── models/
    └── usuarioModel.js
```

---

# Estrutura Front-End

```text
src/
├── pages/
│   ├── LoginPage.jsx
│   └── CadastroUsuariosPage.jsx
│
├── components/
│   ├── ProtectedRoute.jsx
│   └── PermissionGuard.jsx
│
├── contexts/
│   └── AuthContext.jsx
│
└── services/
    └── authService.js
```

---

# Controle de Acesso

## ADMIN

* Extração Inteligente
* WhatsApp Qualidade
* Dashboard Vendas
* App TIM Vendas
* Configurações
* Cadastro de Usuários

## GERENTE

* Extração Inteligente
* WhatsApp Qualidade
* Dashboard Vendas
* App TIM Vendas

## SUPERVISOR

* Extração Inteligente
* WhatsApp Qualidade
* Dashboard Vendas
* App TIM Vendas

## CONSULTOR

* Extração Inteligente
* WhatsApp Qualidade

## CHURN

* Extração Inteligente
* WhatsApp Qualidade

---

# Menu Dinâmico

O menu lateral deverá ser montado automaticamente com base no perfil retornado pelo login.

O usuário nunca deverá visualizar telas sem permissão.

Mesmo digitando a URL manualmente, o sistema deverá bloquear o acesso utilizando PermissionMiddleware.

---

# Auditoria Futura

Tabela:

```sql
logs_acesso
```

Campos:

* id
* usuario_id
* nome_usuario
* perfil
* acao
* tela
* data_hora
* ip

Objetivos:

* Registrar login
* Registrar logout
* Registrar cadastro de usuários
* Registrar exclusão de usuários
* Registrar alteração de perfil
* Registrar alteração de senha

Garantir rastreabilidade, auditoria e segurança.
