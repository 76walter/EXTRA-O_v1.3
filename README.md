# ⚡ Extração Inteligente Premium v6.0

Uma plataforma web moderna e robusta projetada para otimizar fluxos de automação de extração de dados, gestão de contatos via WhatsApp e monitoramento de vendas em tempo real. Este sistema integra uma interface web de alta performance com robôs de automação local e banco de dados relacional.

---

## 🏗️ Arquitetura do Sistema

O sistema é dividido em três camadas principais que operam de forma integrada:

1. **Frontend (React + Vite)**: Interface rica e responsiva com design moderno e transições suaves, usando CSS customizado sob a estética *Blue Indigo*.
2. **Backend Server (Express + MariaDB)**: API RESTful responsável pelo controle de usuários, autenticação baseada em tokens JWT (com hashes criptografados com bcrypt), gerenciamento de permissões de acesso e logs de auditoria.
3. **Automação (Playwright Bridge)**: Uma ponte baseada em Socket.io e Playwright para realizar extração direta e automática de dados de portais (como o VTME/TIM Vendas) e inserção de dados em planilhas externas do OneDrive.

```
       [ Outros Dispositivos na Rede ]
                      │ (HTTP / WebSocket)
                      ▼
┌───────────────────────────────────────────────────────┐
│              COMPUTADOR SERVIDOR LOCAL                │
│                                                       │
│   ┌───────────────────┐       ┌───────────────────┐   │
│   │  Frontend React   │◄─────►│    API Node.js    │   │
│   │      (Vite)       │       │     (Express)     │   │
│   └───────────────────┘       └─────────┬─────────┘   │
│                                         │             │
│                                         ▼             │
│   ┌───────────────────┐       ┌───────────────────┐   │
│   │ Playwright Bridge │◄─────►│  Banco de Dados   │   │
│   │  (Robô / Browser) │       │     (MariaDB)     │   │
│   └───────────────────┘       └───────────────────┘   │
└───────────────────────────────────────────────────────┘
```

---

## 🛠️ Funcionalidades Principais

### 1. Extração Inteligente
* **Máscaras Dinâmicas:** Edição e aplicação de templates dinâmicos que substituem dados de contratos (Nome, CPF, UF, Plano, etc.) automaticamente.
* **Visualização em Tempo Real:** Pré-visualização instantânea das máscaras formatadas antes de copiá-las para a área de transferência.
* **Persistência de Configurações:** Máscaras armazenadas em arquivo estruturado [masks.json](file:///d:/EXTRAÇÃO_v1.3/masks.json).

### 2. Painel WhatsApp Qualidade
* **Filtros por UF:** Carregamento inteligente e filtragem de contatos com base no estado de atuação.
* **Fila de Chamada Rápida:** Integração para agilizar a discagem rápida e a comunicação com clientes via discadoras (como 3C Plus) e WhatsApp Web.

### 3. Dashboard & Logs de Vendas
* **Indicadores em Tempo Real:** Gráficos e números de vendas, cancelamentos e produtividade da equipe.
* **Vigia de Monitoramento:** Painel administrativo com logs em tempo real das ações e vendas dos consultores.

### 4. Controle de Acesso (RBAC)
O sistema possui 5 níveis de permissões de acesso configurados no banco de dados e controlados de forma dinâmica tanto no Frontend quanto nas rotas do Backend:
* **ADMIN:** Acesso total ao sistema (configurações, auditorias, dashboard, extração e gestão de usuários).
* **GERENTE:** Acesso ao dashboard de vendas, extração e WhatsApp.
* **SUPERVISOR:** Monitoramento operacional do dashboard de vendas, extração e WhatsApp.
* **CONSULTOR & CHURN:** Acesso à interface de extração inteligente e WhatsApp Qualidade.

---

## 🚀 Instalação e Configuração

### Pré-requisitos
* **Node.js** (versão 18 ou superior)
* **MariaDB** ou **MySQL** em execução localmente ou na rede local

### 1. Configuração do Banco de Dados
Crie um banco de dados chamado `extracao_sistema` e rode o seguinte script SQL para estruturar a tabela de usuários:

```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM('ADMIN', 'GERENTE', 'SUPERVISOR', 'CONSULTOR', 'CHURN') NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Configurando as Variáveis de Ambiente
Crie ou edite o arquivo [.env](file:///d:/EXTRAÇÃO_v1.3/.env) na raiz do projeto com as credenciais do seu banco de dados:

```env
# Configurações do Banco de Dados MariaDB
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD="sua_senha_do_banco"
DB_DATABASE=extracao_sistema

# Autenticação JWT
JWT_SECRET=sua_chave_secreta_jwt_segura_aqui
JWT_EXPIRES_IN=24h
```

### 3. Instalação das Dependências
Abra o prompt de comando na pasta do projeto e execute:
```bash
npm install
```

---

## 🚦 Execução do Sistema

### Inicialização Rápida (Windows)
Para facilitar o uso diário, o sistema conta com atalhos de inicialização rápida na raiz do projeto:
* Execute o arquivo **[EXECUTAR_SISTEMA.bat](file:///d:/EXTRAÇÃO_v1.3/EXECUTAR_SISTEMA.bat)** ou use o script invisível **[lancar.vbs](file:///d:/EXTRAÇÃO_v1.3/lancar.vbs)**.
* Esses arquivos acionarão o script [launcher.js](file:///d:/EXTRAÇÃO_v1.3/launcher.js), que iniciará o servidor backend e a interface web do Vite simultaneamente.

### Inicialização Manual por Terminal
Se preferir rodar manualmente no terminal:
```bash
npm run dev
```
O servidor de desenvolvimento iniciará na porta `5173`.

---

## 🌐 Configuração de Rede Local (Acesso Compartilhado)

Caso queira hospedar o sistema na sua máquina e permitir que outros computadores da loja ou escritório acessem:

1. Obtenha o endereço IP local do seu computador (`ipconfig` no terminal, ex: `192.168.1.100`).
2. Certifique-se de que os outros computadores estão conectados na mesma rede (Wi-Fi ou cabo).
3. Nos outros computadores, acesse o navegador de internet e insira o endereço:
   ```text
   http://192.168.1.100:5173
   ```
4. Os consultores poderão logar simultaneamente usando as credenciais cadastradas pelo administrador.

---

## 📑 Documentos Adicionais
* **[documentação.md](file:///d:/EXTRAÇÃO_v1.3/documentação.md):** Status dos módulos e histórico de funcionalidades.
* **[GUIA_HOSPEDAGEM_E_REDELOCAL.md](file:///d:/EXTRAÇÃO_v1.3/GUIA_HOSPEDAGEM_E_REDELOCAL.md):** Detalhes avançados sobre rede local e limitações de nuvem.
* **[REQUISITOS_USUARIOS_E_PERMISSOES.md](file:///d:/EXTRA%C3%87%C3%83O_v1.3/REQUISITOS_USUARIOS_E_PERMISSOES.md):** Estruturação de perfis e rotas de segurança.
