import { useState, useCallback, useEffect } from 'react';

const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function useBlackopa(pet, updatePet) {
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("AGUARDANDO APOSTA...");
  const [showDealer, setShowDealer] = useState(false);
  const [bet, setBet] = useState(10);

  const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
      if (['J', 'Q', 'K'].includes(card.val)) score += 10;
      else if (card.val === 'A') { score += 11; aces++; }
      else score += parseInt(card.val);
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  };

  const createDeck = () => {
    const newDeck = [];
    for (let suit of SUITS) {
      for (let val of VALUES) {
        newDeck.push({ suit, val });
      }
    }
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const startDeal = useCallback(() => {
    if (pet.coins < bet) {
      setStatus("SALDO INSUFICIENTE!");
      return;
    }

    updatePet({ coins: pet.coins - bet });
    
    const newDeck = createDeck();
    const pHand = [newDeck.pop(), newDeck.pop()];
    const dHand = [newDeck.pop(), newDeck.pop()];

    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setIsActive(true);
    setShowDealer(false);
    setStatus("JOGO EM ANDAMENTO...");

    // Immediate Blackjack check
    if (calculateScore(pHand) === 21) {
      // Stand logic will trigger via hit detection or manual call
      setStatus("BLACKJACK DETECTADO!");
    }
  }, [bet, pet.coins, updatePet]);

  const hit = useCallback(() => {
    if (!isActive) return;
    const newDeck = [...deck];
    const newHand = [...playerHand, newDeck.pop()];
    setDeck(newDeck);
    setPlayerHand(newHand);

    if (calculateScore(newHand) > 21) {
      setIsActive(false);
      setShowDealer(true);
      setStatus("BUSTED! BUFFER ESTOUROU.");
    }
  }, [isActive, deck, playerHand]);

  const stand = useCallback(() => {
    if (!isActive) return;
    
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];
    
    while (calculateScore(currentDealerHand) < 17) {
      currentDealerHand.push(currentDeck.pop());
    }

    setDeck(currentDeck);
    setDealerHand(currentDealerHand);
    setShowDealer(true);
    setIsActive(false);

    const pScore = calculateScore(playerHand);
    const dScore = calculateScore(currentDealerHand);

    if (dScore > 21 || pScore > dScore) {
      setStatus("VOCÊ VENCEU! PROTOCOLO SUPERADO.");
      updatePet({ coins: pet.coins + (bet * 2) });
    } else if (dScore > pScore) {
      setStatus("DEALER VENCEU! FLUXO INTERROMPIDO.");
    } else {
      setStatus("EMPATE! BUFFER SINCRONIZADO.");
      updatePet({ coins: pet.coins + bet });
    }
  }, [isActive, dealerHand, deck, playerHand, bet, pet.coins, updatePet]);

  return {
    playerHand,
    dealerHand,
    isActive,
    status,
    showDealer,
    bet,
    setBet,
    startDeal,
    hit,
    stand,
    calculateScore
  };
}
