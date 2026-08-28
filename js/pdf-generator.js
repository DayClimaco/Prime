// pdf-generator.js
// ---------------------------------------------------------------------
// Carrega /templates/voucher-template.html, popula com os dados de um
// voucher e exporta em PDF usando html2pdf.js — 100% no client, sem
// backend.
//
// Pré-requisito: a página que importar este módulo precisa incluir
// o script do html2pdf antes (via CDN):
//
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
//
// Uso:
//   import { gerarPDF } from './pdf-generator.js';
//   await gerarPDF(voucher, 'agencia');  // com valor
//   await gerarPDF(voucher, 'cliente');  // sem valor
// ---------------------------------------------------------------------

const TEMPLATE_URL = '/templates/voucher-template.html';

let templateHtmlCache = null;

async function carregarTemplate() {
  if (templateHtmlCache) return templateHtmlCache;

  const resposta = await fetch(TEMPLATE_URL);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar o template (${resposta.status})`);
  }
  templateHtmlCache = await resposta.text();
  return templateHtmlCache;
}

// ---------- Helpers de formatação ----------

function formatarData(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  if (!ano || !mes || !dia) return dataISO;
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(horaISO) {
  if (!horaISO) return '';
  // aceita "07:00:00" ou "07:00" e devolve "07:00:00" (como no modelo original)
  const partes = horaISO.split(':');
  if (partes.length === 2) partes.push('00');
  return partes.join(':');
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte o registro de voucher (vindo do voucher.js, já com
 * cliente/transportador populados via join) no dicionário simples
 * de campo -> valor que o template espera.
 */
function montarDadosParaTemplate(voucher) {
  const cliente = voucher.cliente || {};
  const transportador = voucher.transportador || {};

  return {
    numero: voucher.numero,

    transportador_cnpj: transportador.cnpj || '',
    transportador_telefone: transportador.telefone || '',
    transportador_instagram: transportador.instagram || '',
    transportador_logo_url: transportador.logo_url || '',

    cliente_nome: cliente.nome || '',
    cliente_telefone: cliente.telefone || '',

    num_adultos: voucher.num_adultos ?? 0,
    num_criancas: voucher.num_criancas ?? 0,
    num_bebes: voucher.num_bebes ?? 0,

    valor: formatarMoeda(voucher.valor),
    servico_descricao: voucher.servico_descricao || '',

    data_ida: formatarData(voucher.data_ida),
    origem_ida: voucher.origem_ida || '',
    destino_ida: voucher.destino_ida || '',
    horario_ida: formatarHora(voucher.horario_ida),
    voo_ida: voucher.voo_ida || '',

    data_volta: formatarData(voucher.data_volta),
    origem_volta: voucher.origem_volta || '',
    destino_volta: voucher.destino_volta || '',
    horario_volta: formatarHora(voucher.horario_volta),
    voo_volta: voucher.voo_volta || '',

    observacoes: voucher.observacoes || '',
    atendente: voucher.atendente || '',
    data_atendimento: formatarData(voucher.data_atendimento),
    motorista: voucher.motorista || '',
    veiculo: voucher.veiculo || '',
  };
}

/**
 * Injeta o template num container fora da tela, popula os campos e
 * aplica a logo do transportador.
 */
async function montarContainerPopulado(voucher) {
  const templateHtml = await carregarTemplate();

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-9999px'; // fora da área visível, mas renderizado
  container.innerHTML = templateHtml;
  document.body.appendChild(container);

  const dados = montarDadosParaTemplate(voucher);

  container.querySelectorAll('[data-field]').forEach((el) => {
    const campo = el.dataset.field;
    if (campo === 'transportador_logo_url') return; // tratado separadamente (é <img>)
    if (campo in dados) {
      el.textContent = dados[campo] ?? '';
    }
  });

  const logoEl = container.querySelector('#transportador-logo');
  if (logoEl && dados.transportador_logo_url) {
    logoEl.src = dados.transportador_logo_url;
  }

  return container;
}

/**
 * Gera e baixa o PDF do voucher.
 *
 * @param {object} voucher - registro do voucher (com cliente e
 *   transportador já populados, como retornado por criarVoucher/buscarVoucher).
 * @param {'agencia'|'cliente'} tipo - 'agencia' mostra o valor, 'cliente' oculta.
 */
export async function gerarPDF(voucher, tipo = 'agencia') {
  if (tipo !== 'agencia' && tipo !== 'cliente') {
    throw new Error("tipo deve ser 'agencia' ou 'cliente'");
  }
  if (typeof window.html2pdf !== 'function') {
    throw new Error(
      'html2pdf.js não encontrado. Inclua o script via CDN na página antes de chamar gerarPDF().'
    );
  }

  const container = await montarContainerPopulado(voucher);

  if (tipo === 'cliente') {
    const linhaValor = container.querySelector('.valor-row');
    if (linhaValor) linhaValor.style.display = 'none';
  }

  const voucherRoot = container.querySelector('#voucher-root');
  const nomeArquivo = `voucher-${voucher.numero}-${tipo}.pdf`;

  const opcoes = {
    margin: 0,
    filename: nomeArquivo,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
    // Evita que o html2pdf corte no meio de uma seção, linha de tabela
    // ou do bloco de contatos internacionais ao quebrar de página.
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['tr', '.secao', '.trajeto-tabela', '.contatos-internacionais', '.aviso-final'],
    },
  };

  try {
    await window.html2pdf().set(opcoes).from(voucherRoot).save();
  } finally {
    container.remove();
  }
}
