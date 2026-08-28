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
const SUPABASE_URL = 'https://iqetxpjkbgkktgytvitv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXR4cGprYmdra3RneXR2aXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDA5MjMsImV4cCI6MjEwMTM3NjkyM30.TnYl2uaea6MagurrEDno9TDlfcGP9Xm42WzdhfzNCMQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
