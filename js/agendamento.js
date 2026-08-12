// agendamento.js
// ---------------------------------------------------------------------
// Camada de dados da agenda. Um "agendamento" é uma reserva rápida de
// data com um transportador, feita ANTES de existir um voucher
// completo — agendamento.html usa essas funções em vez de chamar o
// supabase diretamente.
// ---------------------------------------------------------------------

import { supabase } from './supabaseClient.js';

const SELECT_PADRAO = `
  *,
  transportador:transportadores(nome, cnpj, telefone, instagram, logo_url)
`;

/**
 * Lista todos os agendamentos (todos os meses/transportadores).
 * O filtro por mês e por transportador é feito no client, já que o
 * volume é baixo (mesmo padrão usado em listarVouchers()).
 */
export async function listarAgendamentos() {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(SELECT_PADRAO)
    .order('data', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Busca um agendamento específico — usado pela tela de novo voucher
 * quando ela é aberta a partir de "Gerar voucher" na agenda.
 */
export async function buscarAgendamento(id) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(SELECT_PADRAO)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cria um novo agendamento (reserva rápida, sem voucher ainda).
 */
export async function criarAgendamento(dados) {
  const { data, error } = await supabase
    .from('agendamentos')
    .insert(dados)
    .select(SELECT_PADRAO)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza um agendamento existente (edição via painel do dia).
 */
export async function atualizarAgendamento(id, dados) {
  const { data, error } = await supabase
    .from('agendamentos')
    .update(dados)
    .eq('id', id)
    .select(SELECT_PADRAO)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Exclui um agendamento (ex: cliente desistiu antes de virar voucher).
 */
export async function excluirAgendamento(id) {
  const { error } = await supabase
    .from('agendamentos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Marca o agendamento como "convertido" e guarda o voucher_id — chamado
 * automaticamente por novo-voucher.html depois que o voucher é salvo
 * com sucesso. Não apaga o agendamento, só sinaliza que virou voucher.
 */
export async function marcarAgendamentoConvertido(id, voucherId) {
  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'convertido', voucher_id: voucherId })
    .eq('id', id);

  if (error) throw error;
}
