import { useState, useCallback } from 'react';
import { codificar, decodificar } from '../utils/opaCore';
import { usePet } from '../context/PetContext';

export function useTranslator() {
  const [normalText, setNormalText] = useState("");
  const [opaText, setOpaText] = useState("");
  const { registerTranslation } = usePet();

  const handleNormalChange = useCallback((text) => {
    setNormalText(text);
    const encoded = codificar(text);
    setOpaText(encoded);
    if (text.length > 5 && text.endsWith(' ')) registerTranslation();
  }, [registerTranslation]);

  const handleOpaChange = useCallback((text) => {
    setOpaText(text);
    const decoded = decodificar(text);
    setNormalText(decoded);
    if (text.length > 10 && text.endsWith(' ')) registerTranslation();
  }, [registerTranslation]);

  const clear = useCallback(() => {
    setNormalText("");
    setOpaText("");
  }, []);

  return {
    normalText,
    opaText,
    handleNormalChange,
    handleOpaChange,
    clear
  };
}
