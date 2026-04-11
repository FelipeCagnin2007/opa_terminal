// OPA Protocol Terminal UI Handling
const areaNormal = document.getElementById('inNormal');
const areaOpa = document.getElementById('inOpa');
const areaExecutor = document.getElementById('inExecutor');

// --- Tab System ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    
    // Set active button
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.getAttribute('onclick').includes(tabId)
    );
    if (activeBtn) activeBtn.classList.add('active');
}

// --- Translator Logic ---
if (areaNormal && areaOpa) {
    areaNormal.addEventListener('input', () => {
        areaOpa.value = codificar(areaNormal.value);
    });

    areaOpa.addEventListener('input', () => {
        areaNormal.value = decodificar(areaOpa.value);
    });
}

function limpar() {
    if (areaNormal) areaNormal.value = "";
    if (areaOpa) areaOpa.value = "";
    if (areaExecutor) areaExecutor.value = "";
}

function copiarOpa(elementId) {
    const el = document.getElementById(elementId);
    if (!el || !el.value) return;
    el.select();
    navigator.clipboard.writeText(el.value);
    showToast("Copiado com sucesso!");
}

// --- Executor Logic ---
function executarOpa() {
    const encoded = areaExecutor.value || areaOpa.value;
    if (!encoded) {
        showToast("Erro: Nenhum código OPA para executar.");
        return;
    }
    localStorage.setItem('opa_code_payload', encoded);
    window.open('criptografia.html#' + encodeURIComponent(encoded), '_blank');
}

// --- Reference Table Logic ---
function criarCard(label, valor) {
    const card = document.createElement('div');
    card.className = 'ref-card';
    const b = document.createElement('b');
    b.textContent = label;
    const span = document.createElement('span');
    span.textContent = codificar(valor);
    card.appendChild(b);
    card.appendChild(span);
    return card;
}

function popularTabela() {
    const container = document.getElementById('tabelaRef');
    if (!container) return;
    container.innerHTML = '';

    const addSection = (title, items) => {
        const h = document.createElement('div');
        h.className = 'section-title';
        h.textContent = title;
        container.appendChild(h);
        items.forEach(([l, v]) => container.appendChild(criarCard(l, v)));
    };

    // Alfabeto & Maiúsculas
    addSection('Alfabeto Base (Minúsculas)', ALF_LOWER.split('').map(l => [l, l]));
    addSection('Alfabeto Base (Maiúsculas)', ALF_LOWER.split('').map(l => [l.toUpperCase(), l.toUpperCase()]));

    // Números (FSM Compression)
    addSection('Numerais (Modo FSM)', "0123456789".split('').map(n => [n, n]));

    // Símbolos de Programação
    addSection('Símbolos Code', ALF_SIMB.split('').map(s => [s === '\t' ? 'TAB' : s, s]));

    // Acentuação
    addSection('Acentuação & Especiais', Object.keys(mapaAcentos).map(a => [a, a]));
    
    // Controles
    addSection('Tokens de Controle', [['Toggle Num', 'opa'], ['Espaço', ' '], ['Quebra Linha', '\n']]);
}

// --- Utils ---
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => toast.style.display = "none", 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    popularTabela();
});
