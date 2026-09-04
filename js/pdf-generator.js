// pdf-generator.js
// ---------------------------------------------------------------------
// Carrega /templates/voucher-template.html, popula com os dados de um
// voucher e exporta em PDF — 100% no client, sem backend.
//
// Usa html2canvas + jsPDF diretamente (cada um com seu próprio script,
// não o bundle do html2pdf.js — esse empacota as duas libs escondidas
// dentro dele e não expõe window.html2canvas/window.jspdf).
//
// Pré-requisito: a página que importar este módulo precisa incluir,
// nessa ordem, ANTES do jsPDF/html2canvas serem usados:
//
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
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
  if (typeof window.html2canvas !== 'function') {
    throw new Error(
      'html2canvas não encontrado. Inclua o script https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js na página antes de chamar gerarPDF().'
    );
  }
  const JsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
  if (typeof JsPDFConstructor !== 'function') {
    throw new Error(
      'jsPDF não encontrado. Inclua o script https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js na página antes de chamar gerarPDF().'
    );
  }

  const container = await montarContainerPopulado(voucher);

  if (tipo === 'cliente') {
    const linhaValor = container.querySelector('.valor-row');
    if (linhaValor) linhaValor.style.display = 'none';

    const secaoObservacoes = container.querySelector('#secao-observacoes');
    if (secaoObservacoes) secaoObservacoes.style.display = 'none';
  }

  const voucherRoot = container.querySelector('#voucher-root');
  const nomeArquivo = `voucher-${voucher.numero}-${tipo === 'cliente' ? 'motorista' : tipo}.pdf`;

  // Espera as fontes (Poppins/Dancing Script) carregarem antes de
  // renderizar. Sem isso, o layout pode mudar de tamanho no meio do
  // processo (fonte de fallback -> fonte real) e distorcer o resultado.
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => setTimeout(resolve, 80));

  try {
    // 1) Desenha o voucher inteiro numa única imagem (canvas).
    const canvas = await window.html2canvas(voucherRoot, {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
    });

    // 2) Cria um PDF com UMA página do tamanho EXATO da imagem gerada
    // (em pixels do próprio canvas). Isso evita completamente a lógica
    // de "fatiar em várias páginas" do html2pdf.js, que é o que estava
    // cortando/embaralhando o voucher.
    const imagemBase64 = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new JsPDFConstructor({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imagemBase64, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(nomeArquivo);
  } finally {
    container.remove();
  }
}
