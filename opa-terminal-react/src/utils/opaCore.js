// OPA Protocol Core - Refactored for React
const ALF_LOWER = "abcdefghijklmnopqrstuvwxyz";
const ALF_SIMB = "<>{}[]()\\/|!@#$%^&*-=_+;:,.\"'`~?\t";

const MODO_TEXTO = 0;
const MODO_NUMERO = 1;

const mapaAcentos = {
    'á': ['a', 1], 'à': ['a', 2], 'ã': ['a', 3], 'â': ['a', 4], 'ä': ['a', 5],
    'é': ['e', 1], 'è': ['e', 2], 'ê': ['e', 4], 'ë': ['e', 5],
    'í': ['i', 1], 'ì': ['i', 2], 'î': ['i', 4], 'ï': ['i', 5],
    'ó': ['o', 1], 'ò': ['o', 2], 'õ': ['o', 3], 'ô': ['o', 4], 'ö': ['o', 5],
    'ú': ['u', 1], 'ù': ['u', 2], 'û': ['u', 4], 'ü': ['u', 5],
    'ç': ['c', 1], 'ñ': ['n', 3]
};

/**
 * Encodes any character into OPA format.
 */
export function codificar(texto) {
    if (!texto) return "";
    let res = "";
    let mode = MODO_TEXTO;

    for (let i = 0; i < texto.length; i++) {
        const char = texto[i];
        const isDigit = char >= '0' && char <= '9';

        if (isDigit && mode === MODO_TEXTO) {
            res += (res && !res.endsWith(' ') && !res.endsWith('\n') ? " " : "") + "opa ";
            mode = MODO_NUMERO;
        } else if (!isDigit && mode === MODO_NUMERO && char !== ' ' && char !== '\n') {
            res += (res && !res.endsWith(' ') && !res.endsWith('\n') ? " " : "") + "opa ";
            mode = MODO_TEXTO;
        }

        if (mode === MODO_NUMERO) {
            if (isDigit) {
                const n = parseInt(char);
                if (n === 9) res += "oopa ";
                else res += "o" + "p".repeat(n + 2) + "a ";
            } else if (char === ' ') res += "/ ";
            else if (char === '\n') res += "\n ";
        } else {
            if (char === ' ') { res += "/ "; continue; }
            if (char === '\n') { res += "\n "; continue; }
            
            let o, p, a = 1;
            let found = false;

            const lowIdx = ALF_LOWER.indexOf(char);
            if (lowIdx !== -1) {
                o = Math.floor(lowIdx / 9) + 1;
                p = (lowIdx % 9) + 2;
                found = true;
            } else {
                const upIdx = ALF_LOWER.indexOf(char.toLowerCase());
                if (upIdx !== -1 && char === char.toUpperCase()) {
                    o = Math.floor(upIdx / 9) + 4;
                    p = (upIdx % 9) + 2;
                    found = true;
                }
            }

            if (!found) {
                const simbIdx = ALF_SIMB.indexOf(char);
                if (simbIdx !== -1) {
                    o = Math.floor(simbIdx / 9) + 7;
                    p = (simbIdx % 9) + 2;
                    found = true;
                }
            }

            if (!found && mapaAcentos[char]) {
                const base = mapaAcentos[char][0];
                const extrasA = mapaAcentos[char][1];
                const baseEnc = codificar(base);
                res += baseEnc.split(' ')[0] + "a".repeat(extrasA) + " ";
                continue;
            }

            if (!found) {
                const code = char.charCodeAt(0);
                o = Math.floor(code / 9) + 11;
                p = (code % 9) + 2;
            }

            res += "o".repeat(o) + "p".repeat(p) + "a".repeat(a) + " ";
        }
    }
    if (mode === MODO_NUMERO) res = res.trim() + " opa";
    return res.trim();
}

/**
 * Decodes OPA format back to original text.
 */
export function decodificar(opa) {
    if (!opa) return "";
    let mode = MODO_TEXTO;
    let res = "";
    let i = 0;
    
    while (i < opa.length) {
        const char = opa[i];
        if (char === ' ' || char === '\t' || char === '\r') { i++; continue; }
        if (char === '/') { res += ' '; i++; continue; }
        if (char === '\n') { res += '\n'; i++; continue; }
        
        let token = "";
        while (i < opa.length && (opa[i] === 'o' || opa[i] === 'p' || opa[i] === 'a')) {
            token += opa[i];
            i++;
        }
        
        if (!token) { res += opa[i]; i++; continue; }
        if (token === "opa") { mode = (mode === MODO_TEXTO) ? MODO_NUMERO : MODO_TEXTO; continue; }
        
        if (mode === MODO_NUMERO) {
            if (token === "oopa") res += "9";
            else {
                let pCount = 0;
                for (let j = 0; j < token.length; j++) if (token[j] === 'p') pCount++;
                const n = pCount - 2;
                if (n >= 0 && n <= 8) res += n.toString();
            }
        } else {
            let o = 0, p = 0, a = 0;
            for (let j = 0; j < token.length; j++) {
                if (token[j] === 'o') o++;
                else if (token[j] === 'p') p++;
                else if (token[j] === 'a') a++;
            }
            
            if (o >= 1 && o <= 3) {
                let idx = (o - 1) * 9 + (p - 2);
                let base = ALF_LOWER[idx];
                if (base) {
                    if (a > 1) {
                        let foundA = false;
                        for (let k in mapaAcentos) {
                            if (mapaAcentos[k][0] === base && mapaAcentos[k][1] === a - 1) {
                                res += k; foundA = true; break;
                            }
                        }
                        if (!foundA) res += base;
                    } else res += base;
                }
            } else if (o >= 4 && o <= 6) {
                let idx = (o - 4) * 9 + (p - 2);
                let base = ALF_LOWER[idx];
                if (base) res += base.toUpperCase();
            } else if (o >= 7 && o <= 10) {
                let idx = (o - 7) * 9 + (p - 2);
                let simb = ALF_SIMB[idx];
                if (simb) res += simb;
            } else if (o >= 11) {
                let code = (o - 11) * 9 + (p - 2);
                res += String.fromCharCode(code);
            } else {
                res += token;
            }
        }
    }
    return res;
}

export const CONSTANTS = {
  ALF_LOWER,
  ALF_SIMB,
  mapaAcentos
};
