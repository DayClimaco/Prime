-- =====================================================================
-- PRIME TRANSLADO — Schema Supabase / Postgres
-- =====================================================================
-- Como aplicar:
--   1. Supabase Dashboard > SQL Editor > cole este arquivo inteiro > Run
--   2. Ou via CLI: supabase db execute -f schema.sql
-- =====================================================================

-- Extensão pra gerar UUIDs
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. TRANSPORTADORES
-- ---------------------------------------------------------------------
create table if not exists transportadores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  telefone    text,
  instagram   text,
  logo_url    text,
  is_padrao   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Garante que só existe UM transportador padrão por vez
create unique index if not exists uq_transportador_padrao
  on transportadores (is_padrao)
  where is_padrao = true;

-- ---------------------------------------------------------------------
-- 2. CLIENTES
-- ---------------------------------------------------------------------
create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. VOUCHERS
-- ---------------------------------------------------------------------

-- Sequence dedicada pra numeração automática (evita corrida/duplicidade)
create sequence if not exists vouchers_numero_seq start 76;

create table if not exists vouchers (
  id                  uuid primary key default gen_random_uuid(),
  numero              integer not null default nextval('vouchers_numero_seq'),

  cliente_id          uuid references clientes(id) on delete restrict,
  transportador_id    uuid references transportadores(id) on delete restrict,

  agencia_nome        text,

  num_adultos         integer not null default 0,
  num_criancas        integer not null default 0,
  num_bebes           integer not null default 0,

  valor               numeric(10,2),
  servico_descricao   text,

  data_ida            date,
  origem_ida          text,
  destino_ida         text,
  horario_ida         time,
  voo_ida             text,

  data_volta          date,
  origem_volta        text,
  destino_volta       text,
  horario_volta       time,
  voo_volta           text,

  observacoes         text,
  atendente           text,
  motorista            text,
  veiculo             text,
  data_atendimento    date,

  pdf_agencia_url     text,  -- link do PDF (com valor) salvo no Storage
  pdf_cliente_url     text,  -- link do PDF (sem valor) salvo no Storage

  created_at          timestamptz not null default now()
);

-- Garante que o número nunca se repete (defesa extra além da sequence)
create unique index if not exists uq_vouchers_numero on vouchers (numero);

-- Índices úteis pra busca no dashboard
create index if not exists idx_vouchers_cliente   on vouchers (cliente_id);
create index if not exists idx_vouchers_agencia    on vouchers (agencia_nome);
create index if not exists idx_vouchers_data_ida    on vouchers (data_ida);
create index if not exists idx_vouchers_created_at on vouchers (created_at desc);

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
-- Só usuário autenticado (login do irmão/amigo) lê e escreve.
-- A anon key fica exposta no front sem problema; quem protege é a RLS.

alter table transportadores enable row level security;
alter table clientes        enable row level security;
alter table vouchers        enable row level security;

-- TRANSPORTADORES
drop policy if exists "authenticated_all_transportadores" on transportadores;
create policy "authenticated_all_transportadores"
  on transportadores
  for all
  to authenticated
  using (true)
  with check (true);

-- CLIENTES
drop policy if exists "authenticated_all_clientes" on clientes;
create policy "authenticated_all_clientes"
  on clientes
  for all
  to authenticated
  using (true)
  with check (true);

-- VOUCHERS
drop policy if exists "authenticated_all_vouchers" on vouchers;
create policy "authenticated_all_vouchers"
  on vouchers
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- 5. STORAGE — bucket de logos (público, só leitura pra qualquer um)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Leitura pública das logos (qualquer um pode ver, ninguém pode alterar)
drop policy if exists "public_read_logos" on storage.objects;
create policy "public_read_logos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'logos');

-- Só autenticado pode subir/alterar/apagar logo
drop policy if exists "authenticated_write_logos" on storage.objects;
create policy "authenticated_write_logos"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'logos')
  with check (bucket_id = 'logos');

-- Bucket opcional pra guardar os PDFs gerados (histórico)
insert into storage.buckets (id, name, public)
values ('vouchers-pdf', 'vouchers-pdf', true)
on conflict (id) do nothing;

drop policy if exists "public_read_vouchers_pdf" on storage.objects;
create policy "public_read_vouchers_pdf"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vouchers-pdf');

drop policy if exists "authenticated_write_vouchers_pdf" on storage.objects;
create policy "authenticated_write_vouchers_pdf"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'vouchers-pdf')
  with check (bucket_id = 'vouchers-pdf');

-- ---------------------------------------------------------------------
-- 6. SEED opcional — cadastra os dois transportadores já de cara
-- ---------------------------------------------------------------------
-- Descomente e edite com os dados reais antes de rodar:
--
-- insert into transportadores (nome, cnpj, telefone, instagram, is_padrao)
-- values
--   ('Prime Translado', '00.000.000/0000-00', '(00) 00000-0000', '@primetranslado', true),
--   ('Nome do Amigo',   null,                  '(00) 00000-0000', '@amigo_translado', false);
