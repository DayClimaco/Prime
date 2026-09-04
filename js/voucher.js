// voucher.js
// ---------------------------------------------------------------------
// Camada de dados: tudo que fala com as tabelas als_transportadores,
// als_clientes e als_vouchers passa por aqui. novo-voucher.html importa essas
// funções em vez de chamar o supabase diretamente.
// ---------------------------------------------------------------------

import { supabase } from './supabaseClient.js';

/**
 * Lista todos os als_transportadores cadastrados, com o padrão (is_padrao)
 * sempre vindo primeiro — pra pré-selecionar no <select> do formulário.
 */
export async function listarTransportadores() {
  const { data, error } = await supabase
    .from('als_transportadores')
    .select('*')
    .order('is_padrao', { ascending: false })
    .order('nome', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Busca um cliente existente pelo telefone (evita cadastro duplicado
 * do mesmo cliente em als_vouchers diferentes). Se não existir, cria.
 * Retorna o id do cliente.
 */
export async function buscarOuCriarCliente({ nome, telefone }) {
  if (telefone) {
    const { data: existente, error: erroBusca } = await supabase
      .from('als_clientes')
      .select('id')
      .eq('telefone', telefone)
      .maybeSingle();

    if (erroBusca) throw erroBusca;
    if (existente) return existente.id;
  }

  const { data: novo, error: erroInsert } = await supabase
    .from('als_clientes')
    .insert({ nome, telefone })
    .select('id')
    .single();

  if (erroInsert) throw erroInsert;
  return novo.id;
}

/**
 * Atualiza os dados de um cliente já existente (usado quando se edita
 * um voucher e o nome/telefone do cliente mudou).
 */
export async function atualizarCliente(id, { nome, telefone }) {
  const { error } = await supabase
    .from('als_clientes')
    .update({ nome, telefone })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Atualiza um voucher já existente. Usado pela tela de edição
 * (novo-voucher.html?id=...). Retorna o registro já com cliente e
 * transportador populados, pronto pra gerar PDF na sequência.
 */
export async function atualizarVoucher(id, dados) {
  const { data, error } = await supabase
    .from('als_vouchers')
    .update(dados)
    .eq('id', id)
    .select(`
      *,
      cliente:als_clientes(nome, telefone),
      transportador:als_transportadores(nome, cnpj, telefone, instagram, logo_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cria o voucher no banco. O campo `numero` é preenchido automaticamente
 * pela sequence configurada no schema.sql — não precisa (e não deve)
 * ser calculado aqui no front.
 *
 * @param {object} dados - todos os campos do formulário já validados,
 *   incluindo cliente_id e transportador_id.
 * @returns {object} o voucher recém-criado, já com `numero` e `id`.
 */
export async function criarVoucher(dados) {
  const { data, error } = await supabase
    .from('als_vouchers')
    .insert(dados)
    .select(`
      *,
      cliente:als_clientes(nome, telefone),
      transportador:als_transportadores(nome, cnpj, telefone, instagram, logo_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Lista todos os als_vouchers, já com cliente e transportador populados —
 * usado pelo dashboard. Filtro (texto/data) é feito no client, já que
 * o volume de als_vouchers é baixo (uso pessoal).
 */
export async function listarVouchers() {
  const { data, error } = await supabase
    .from('als_vouchers')
    .select(`
      *,
      cliente:als_clientes(nome, telefone),
      transportador:als_transportadores(nome, cnpj, telefone, instagram, logo_url)
    `)
    .order('numero', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Busca um voucher já salvo (com cliente e transportador populados)
 * — útil pro dashboard reabrir e reimprimir um voucher antigo.
 */
export async function buscarVoucher(id) {
  const { data, error } = await supabase
    .from('als_vouchers')
    .select(`
      *,
      cliente:als_clientes(nome, telefone),
      transportador:als_transportadores(nome, cnpj, telefone, instagram, logo_url)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Salva o link do PDF gerado (upload feito separadamente pro Storage)
 * de volta no registro do voucher — histórico acessível no dashboard.
 */
/**
 * Exclui um voucher definitivamente do banco. Usado quando um voucher
 * foi criado errado e precisa ser removido do dashboard.
 */
export async function excluirVoucher(id) {
  const { error } = await supabase
    .from('als_vouchers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function salvarLinkPdf(voucherId, tipo, url) {
  const campo = tipo === 'agencia' ? 'pdf_agencia_url' : 'pdf_cliente_url';
  const { error } = await supabase
    .from('als_vouchers')
    .update({ [campo]: url })
    .eq('id', voucherId);

  if (error) throw error;
}
