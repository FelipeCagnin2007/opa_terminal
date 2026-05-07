import { useState, useCallback, useEffect } from 'react';
import { codificar } from '../utils/opaCore';

export function useLinguopa(pet, updatePet) {
  const [isActive, setIsActive] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentWord, setCurrentWord] = useState("");
  const [opaWord, setOpaWord] = useState("");
  const [status, setStatus] = useState("PREPARADO?");
  const [feedback, setFeedback] = useState(""); // 'correct', 'error'

  const nextWord = useCallback(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let word = "";
    for (let i = 0; i < level; i++) {
        word += chars[Math.floor(Math.random() * chars.length)];
    }
    setCurrentWord(word);
    setOpaWord(codificar(word));
    setFeedback("");
  }, [level]);

  const start = useCallback(() => {
    setIsActive(true);
    setScore(0);
    setLevel(1);
    setStatus("QUAL A TRADUÇÃO?");
    nextWord();
  }, [nextWord]);

  const stop = useCallback(() => {
    setIsActive(false);
    setStatus("PROTOCOLO ENCERRADO");
  }, []);

  const check = useCallback((input) => {
    if (!isActive) return;
    
    if (input.trim() === currentWord) {
      setScore(s => s + 1);
      setFeedback("correct");
      setStatus("CORRETO! +5 OPACOINS");
      
      updatePet({ coins: pet.coins + 5 });

      if ((score + 1) % 5 === 0) {
        setLevel(l => l + 1);
        setStatus("NÍVEL AUMENTOU!");
      }

      setTimeout(nextWord, 1000);
    } else {
      setFeedback("error");
      setStatus("FALHA NA SINCRO! TENTE NOVAMENTE.");
    }
  }, [isActive, currentWord, score, pet.coins, updatePet, nextWord]);

  return {
    isActive,
    score,
    level,
    opaWord,
    status,
    feedback,
    start,
    stop,
    check
  };
}
