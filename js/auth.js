// auth.js
// ---------------------------------------------------------------------
// Tudo relacionado a autenticação (Supabase Auth) fica aqui.
// index.html usa login(); as páginas protegidas (novo-voucher.html,
// dashboard.html) usam requireAuth() no carregamento.
// ---------------------------------------------------------------------

import { supabase } from './supabaseClient.js';

/**
 * Faz login com email/senha. Lança erro se as credenciais forem
 * inválidas — quem chama deve capturar e exibir a mensagem.
 */
export async function login(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw error;
  return data.session;
}

/**
 * Encerra a sessão atual e volta pro login.
 */
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
}

/**
 * Retorna a sessão atual (ou null se não estiver logado).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Guarda de rota: chame no topo de qualquer página protegida.
 * Se não houver sessão, redireciona pro login e interrompe o
 * carregamento da página (por isso é bom chamar antes do resto do
 * script rodar).
 *
 * Uso (no <script type="module"> da página protegida):
 *   import { requireAuth } from '/js/auth.js';
 *   await requireAuth();
 */
export async function requireAuth() {
  const sessao = await getSession();
  if (!sessao) {
    window.location.href = '/index.html';
    // interrompe a execução do restante do módulo que chamou isto
    throw new Error('Não autenticado — redirecionando para o login.');
  }
  return sessao;
}

/**
 * Mantém a página sincronizada se a sessão expirar ou for encerrada
 * em outra aba. Opcional: chame em páginas protegidas se quiser esse
 * comportamento reativo.
 */
export function observarSessao(callback) {
  supabase.auth.onAuthStateChange((_evento, sessao) => callback(sessao));
}
