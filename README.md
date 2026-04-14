# Controle de Estoque e Vendas - Vane Semijoias

Sistema completo de **controle de estoque, vendas e clientes** para o gerenciamento de semijoias, com **autenticacao JWT** para acesso seguro.

O sistema permite controlar:
- **Produtos** no estoque (cadastro, consulta, edicao, exclusao e fotos)
- **Vendas** realizadas (registro, consulta, controle automatico de baixa no estoque)
- **Clientes** cadastrados (dados pessoais e data de aniversario)

A aplicacao e dividida em **duas partes**:
- `backend/` - API construida em **Django + Django REST Framework**
- `frontend/` - Interface construida em **React + Vite**

O sistema utiliza **banco de dados SQLite** e **autenticacao via JWT** (JSON Web Tokens).

---

## Pre-requisitos

- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)

---

## Como rodar o projeto

### 1. Clonar o repositorio

```bash
git clone https://github.com/<seu-usuario>/semijoias-controle.git
cd semijoias-controle
```

### 2. Backend (Django)

```bash
cd backend
python -m venv venv

# Windows (PowerShell):
venv\Scripts\activate
# Windows (bash/zsh):
source venv/Scripts/activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

O backend estara rodando em: http://localhost:8000

**Endpoints principais:**

| Endpoint | Descricao |
|---|---|
| `POST /api/auth/login/` | Login (retorna tokens JWT) |
| `POST /api/auth/refresh/` | Renovar token de acesso |
| `GET /api/auth/me/` | Dados do usuario logado |
| `/api/produtos/` | CRUD de produtos |
| `/api/vendas/` | CRUD de vendas |
| `/api/clientes/` | CRUD de clientes |

> Todos os endpoints (exceto login e refresh) requerem o header `Authorization: Bearer <token>`.

### 3. Frontend (React + Vite)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend estara disponivel em: http://localhost:5173

---

## Autenticacao

O sistema utiliza **JWT (JSON Web Tokens)** para proteger o acesso:

- O token de acesso dura **12 horas**
- O token de refresh dura **7 dias**
- O frontend renova o token automaticamente quando expira
- Ao fazer logout ou quando o refresh expira, o usuario e redirecionado para a tela de login

Para criar o usuario da gestora:

```bash
cd backend
python manage.py createsuperuser
```

---

## Funcionalidades

### Dashboard
- Painel com estatisticas (total de produtos, vendas, clientes e itens em estoque)
- Faturamento total
- Alertas de estoque baixo (quantidade <= 2) e produtos esgotados
- Acesso rapido as secoes do sistema

### Produtos
- Cadastrar novos produtos com foto, categoria, descricao e valores
- Editar informacoes (descricao, valores, quantidade, imagem)
- Excluir produtos (com confirmacao)
- Busca/filtro por descricao ou categoria
- Exibicao de imagens e badges de estoque (em estoque / baixo / esgotado)
- Categorias: Anel, Brinco, Colar, Pulseira, Outros

### Vendas
- Registrar vendas informando cliente, produto e quantidade
- Preco de venda opcional (usa o preco do produto por padrao)
- Atualizacao automatica do estoque
- Validacao de estoque disponivel
- Listagem com detalhes e possibilidade de edicao/exclusao

### Clientes
- Cadastrar clientes com nome, telefone, e-mail e data de aniversario
- Editar ou excluir clientes (com confirmacao)
- Busca por nome, e-mail ou telefone
- Listagem de todos os clientes

### Login
- Tela de login com autenticacao JWT
- Sessao persistente (nao precisa logar toda vez)
- Renovacao automatica do token
- Botao de logout na sidebar

---

## Estrutura do projeto

```
semijoias-controle/
  backend/
    core/
      models.py          # Modelos: Produto, Cliente, Venda
      views.py           # ViewSets + endpoint /auth/me
      serializers.py     # Serializers DRF
      urls.py            # Rotas da API + autenticacao
    semijoias/
      settings.py        # Configuracoes Django + JWT
  frontend/
    src/
      services/api.js    # Axios com interceptors JWT
      components/        # Toast, ConfirmModal, Loading, EmptyState
      pages/             # Login, Dashboard, Produtos, Clientes, Vendas
      App.jsx            # Layout com sidebar + rotas protegidas
      App.css            # Design system (tema rose gold)
```

---

## Tecnologias

**Backend:**
- Django 5.2
- Django REST Framework
- djangorestframework-simplejwt
- django-cors-headers
- Pillow
- SQLite

**Frontend:**
- React 19
- Vite
- Axios
- React Router DOM
