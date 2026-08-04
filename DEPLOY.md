# Prime Translado — Passo a passo de deploy

Guia completo pra subir o sistema do zero: Git → Supabase → Vercel.
Segue a ordem certa — cada etapa depende da anterior.

---

## 1. Organizar os arquivos localmente

Crie a pasta do projeto com essa estrutura (todos os arquivos já foram
gerados nas etapas anteriores):

```
prime-translado/
├── index.html
├── dashboard.html          -- (ainda pendente, se você quiser)
├── novo-voucher.html
├── /css
│   └── style.css
├── /js
│   ├── supabaseClient.js
│   ├── auth.js
│   ├── voucher.js
│   └── pdf-generator.js
├── /templates
│   └── voucher-template.html
├── .gitignore
└── README.md
```

Coloque cada arquivo baixado na pasta correspondente exatamente como
no diagrama acima — os `import` nos `<script type="module">` usam
caminhos absolutos (`/js/voucher.js`, `/templates/voucher-template.html`),
então a estrutura de pastas precisa bater.

---

## 2. Git — criar o repositório

```bash
cd prime-translado
git init
```

Crie um `.gitignore` básico:

```
.env
.env.local
node_modules/
.DS_Store
```

Primeiro commit:

```bash
git add .
git commit -m "Setup inicial do sistema de vouchers"
```

### Criar o repositório no GitHub (privado)

1. Acesse [github.com/new](https://github.com/new)
2. Nome: `prime-translado` (ou o que preferir)
3. **Visibility: Private** — importante, porque o banco vai guardar dados de clientes reais
4. Não marque "Add README" (você já tem)
5. Clique em **Create repository**

O GitHub vai te dar os comandos — algo assim:

```bash
git remote add origin https://github.com/SEU-USUARIO/prime-translado.git
git branch -M main
git push -u origin main
```

---

## 3. Supabase — banco, auth e storage

### 3.1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Escolha um nome (ex: `prime-translado`), uma senha forte pro banco (guarde essa senha, é diferente da senha de login) e a região mais próxima (ex: São Paulo)
3. Aguarde o projeto provisionar (leva ~2 minutos)

### 3.2. Rodar o schema

1. No menu lateral, vá em **SQL Editor**
2. Clique em **New query**
3. Cole todo o conteúdo do `schema.sql` (o que já geramos)
4. Clique em **Run**

Isso cria as tabelas (`transportadores`, `clientes`, `vouchers`), a
sequence de numeração, as políticas de RLS e os buckets de Storage
(`logos` e `vouchers-pdf`).

Confirme que deu certo em **Table Editor** — devem aparecer as 3 tabelas.

### 3.3. Subir as logos

1. Vá em **Storage** → bucket **logos**
2. Faça upload de `Prime.jpeg` e `Bruno.jpeg` (ou como você renomear)
3. Clique em cada arquivo → **Copy URL** — vai parecer com:
   `https://SEU-PROJETO.supabase.co/storage/v1/object/public/logos/Prime.jpeg`

### 3.4. Cadastrar os transportadores

Ainda no **SQL Editor**, rode (trocando pelos dados e URLs reais):

```sql
insert into transportadores (nome, cnpj, telefone, instagram, logo_url, is_padrao)
values
  ('Prime Translado', '12.345.678/0001-99', '(81) 98321-6494', 'primetranslado_pg',
   'https://SEU-PROJETO.supabase.co/storage/v1/object/public/logos/Prime.jpeg', true),
  ('@felipe_transfer01', null, 'TELEFONE_DO_AMIGO', 'felipe_transfer01',
   'https://SEU-PROJETO.supabase.co/storage/v1/object/public/logos/Bruno.jpeg', false);
```

### 3.5. Criar os usuários de login

1. Vá em **Authentication** → **Users** → **Add user**
2. Crie um usuário pra você (irmão) com email + senha
3. Repita pro amigo, se ele também for acessar
4. **Desmarque** a opção de enviar email de confirmação, ou confirme manualmente clicando no usuário criado — senão o login vai falhar até confirmar

### 3.6. Pegar as credenciais da API

1. Vá em **Project Settings** (ícone de engrenagem) → **API**
2. Copie:
   - **Project URL** → vai em `SUPABASE_URL`
   - **anon public key** → vai em `SUPABASE_ANON_KEY`

Abra `js/supabaseClient.js` e substitua:

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

pelos valores reais. Como são públicos por design (a RLS é que protege
os dados), pode deixar hardcoded direto no arquivo — não precisa de
variável de ambiente pra isso.

Commit e push dessa alteração:

```bash
git add js/supabaseClient.js
git commit -m "Configura credenciais do Supabase"
git push
```

---

## 4. Vercel — deploy

### 4.1. Conectar o repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Conecte sua conta do GitHub (se ainda não conectou)
3. Selecione o repositório `prime-translado`
4. **Framework Preset:** deixe em **Other** (é site estático, sem build)
5. **Build Command:** deixe vazio
6. **Output Directory:** deixe vazio (raiz do projeto)
7. Clique em **Deploy**

Em ~30 segundos o Vercel te dá uma URL do tipo
`prime-translado.vercel.app`.

### 4.2. Configurar redirecionamento pra index.html (opcional, recomendado)

Crie um `vercel.json` na raiz pra garantir que rotas sem extensão
funcionem bem e pra travar o `dashboard.html`/`novo-voucher.html` como
página inicial se preferir:

```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" }
  ]
}
```

Commit, push — o Vercel faz redeploy automático a cada push na `main`.

### 4.3. Testar

1. Abra a URL do Vercel
2. Faça login com o usuário criado no passo 3.5
3. Cadastre um voucher de teste e gere os dois PDFs (agência/cliente)
4. Confira no Supabase (**Table Editor** → `vouchers`) se o registro foi criado com o `numero` certo

---

## 5. Domínio próprio (opcional)

Se quiser algo como `sistema.primetranslado.com.br` em vez do
`.vercel.app`:

1. No projeto na Vercel → **Settings** → **Domains** → **Add**
2. Digite o domínio/subdomínio
3. A Vercel mostra os registros DNS (CNAME ou A) pra você cadastrar no
   painel do seu provedor de domínio
4. Propagação leva de minutos a algumas horas

---

## Checklist rápido

- [ ] Repo privado criado e com push feito
- [ ] `schema.sql` executado no Supabase sem erro
- [ ] Logos subidas no bucket `logos`
- [ ] Transportadores cadastrados (com `is_padrao` certo)
- [ ] Usuário(s) de login criados e confirmados
- [ ] `SUPABASE_URL` e `SUPABASE_ANON_KEY` preenchidos em `supabaseClient.js`
- [ ] Deploy feito na Vercel
- [ ] Teste ponta a ponta: login → novo voucher → gerar os 2 PDFs
