// supabaseClient.js
// ---------------------------------------------------------------------
// Inicializa o client do Supabase. Importado como módulo ES em todas
// as páginas que precisam falar com o banco (novo-voucher.html,
// dashboard.html, auth.js).
//
// A anon key é pública por design — quem protege os dados é a RLS
// configurada no schema.sql, não o segredo dessa chave.
// ---------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// TODO: trocar pelos valores reais do seu projeto Supabase
// (Project Settings > API no dashboard do Supabase)
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
