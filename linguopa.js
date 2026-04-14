/**
 * LINGUOPA - OPA Protocol Translation Quiz
 */

let linScore = 0;
let linCurrentWord = "";
let linLevel = 1;

function startLinguopa() {
    isLinguopaActive = true;
    linScore = 0;
    linLevel = 1;
    
    document.getElementById('btnLinStart').style.display = 'none';
    document.getElementById('btnLinStop').style.display = 'inline-block';
    document.getElementById('linInput').disabled = false;
    document.getElementById('btnLinCheck').disabled = false;
    document.getElementById('linInput').value = "";
    document.getElementById('linInput').focus();
    
    updateLinUI();
    nextLinWord();
}

function stopLinguopa() {
    isLinguopaActive = false;
    
    document.getElementById('btnLinStart').style.display = 'inline-block';
    document.getElementById('btnLinStop').style.display = 'none';
    document.getElementById('linInput').disabled = true;
    document.getElementById('btnLinCheck').disabled = true;
    document.getElementById('linWordArea').textContent = "PROTOCOLO ENCERRADO";
    
    if (typeof showTemporaryMsg === 'function') {
        showTemporaryMsg(`Quiz finalizado! Pontuação: ${linScore}`);
    }
}

function nextLinWord() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let word = "";
    for (let i = 0; i < linLevel; i++) {
        word += chars[Math.floor(Math.random() * chars.length)];
    }
    
    linCurrentWord = word;
    const opaWord = typeof codificar === 'function' ? codificar(word) : "???";
    
    document.getElementById('linWordArea').textContent = opaWord;
    document.getElementById('linInput').value = "";
    document.getElementById('linStatus').textContent = "QUAL A TRADUÇÃO?";
    document.getElementById('linStatus').style.color = "var(--energy)";
}

function checkLinguopa() {
    const input = document.getElementById('linInput').value.trim().toLowerCase();
    
    if (input === linCurrentWord) {
        linScore++;
        
        // Reward
        if (typeof pet !== 'undefined') {
            pet.coins += 5;
            if (typeof savePet === 'function') savePet();
            if (typeof updateUI === 'function') updateUI();
        }
        
        document.getElementById('linStatus').textContent = "CORRETO! +5 OPACOINS";
        document.getElementById('linStatus').style.color = "var(--glow)";
        
        // Level up
        if (linScore % 5 === 0) {
            linLevel++;
            document.getElementById('linStatus').textContent = "NÍVEL AUMENTOU!";
        }
        
        setTimeout(nextLinWord, 1000);
    } else {
        document.getElementById('linStatus').textContent = "FALHA NA SINCRO! TENTE NOVAMENTE.";
        document.getElementById('linStatus').style.color = "var(--danger)";
    }
    
    updateLinUI();
}

function updateLinUI() {
    document.getElementById('linScore').textContent = linScore;
}

// Add Enter key support
document.getElementById('linInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && isLinguopaActive) {
        checkLinguopa();
    }
});
