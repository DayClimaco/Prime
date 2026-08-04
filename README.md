# Prime Translado — Sistema de Vouchers

Sistema simples de cadastro e geração de vouchers (Ordem de Serviço)
para transporte/translado, com dois transportadores configuráveis
(cada um com sua própria logo e dados) e geração de PDF em duas
versões: **agência** (com valor) e **cliente** (sem valor).

100% estático — sem backend próprio. Banco de dados e autenticação
via Supabase, deploy via Vercel, PDF gerado no navegador com
`html2pdf.js`.

## Estrutura

```
prime-translado/
├── index.html              -- login
├── dashboard.html           -- lista de vouchers, busca, reimpressão
├── novo-voucher.html        -- formulário de cadastro
├── /css
│   └── style.css
├── /js
│   ├── supabaseClient.js    -- inicializa o client do Supabase
│   ├── auth.js              -- login/logout/guarda de rotas
│   ├── voucher.js           -- CRUD de clientes/transportadores/vouchers
│   └── pdf-generator.js     -- popula o template e exporta em PDF
├── /templates
│   └── voucher-template.html -- layout do voucher (idêntico ao modelo original)
├── schema.sql                -- schema completo do Supabase
├── .env.example
├── vercel.json
├── DEPLOY.md                 -- passo a passo de deploy (Git + Supabase + Vercel)
└── README.md
```

## Como funciona

1. **Login** (`index.html`) — autenticação via Supabase Auth.
2. **Novo voucher** (`novo-voucher.html`) — formulário com todos os
   campos (cliente, transportador, ida/volta, valor, observações).
   Ao selecionar o transportador, a logo é pré-visualizada. Ao salvar,
   o `numero` é gerado automaticamente por uma `sequence` no Postgres
   (evita duplicidade em cadastros simultâneos).
3. **Geração de PDF** — o mesmo template é usado pras duas versões;
   a linha do valor é ocultada via CSS/JS na versão cliente.
4. **Dashboard** (`dashboard.html`) — lista todos os vouchers, com
   busca por cliente/agência/transportador e filtro por data da ida,
   e permite reimprimir o PDF de qualquer voucher já salvo.

## Primeiros passos

Veja o [`DEPLOY.md`](./DEPLOY.md) para o passo a passo completo de:

1. Subir o código no Git/GitHub
2. Configurar o Supabase (schema, storage, transportadores, usuários)
3. Fazer o deploy na Vercel

## Segurança

- RLS (Row Level Security) habilitada em todas as tabelas — só
  usuários autenticados leem/escrevem.
- A `anon key` do Supabase é pública por design; quem protege os
  dados é a RLS, não o segredo da chave.
- A `service_role key` **nunca** deve ser versionada ou usada no
  front — não é necessária neste projeto.
- O repositório Git deve ser **privado**, já que o banco guarda dados
  reais de clientes.
