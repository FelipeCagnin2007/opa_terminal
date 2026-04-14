import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuthContext } from './AuthContext';

const PetContext = createContext();

const INITIAL_PET = {
    name: null,
    energy: 100,
    mood: 100,
    stability: 100,
    agility: 100,
    age: 0,
    interactions: 0,
    coins: 100,
    lastCoinClaim: 0,
    translationCount: 0,
    stage: 'EGG',
    lastUpdate: Date.now(),
    isSleeping: false,
    isDead: false,
    thoughts: ""
};

export function PetProvider({ children }) {
    const { user, profile } = useAuthContext();
    const [pet, setPet] = useState(INITIAL_PET);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasLoadedCloud, setHasLoadedCloud] = useState(false);

    // 1. Initial Cloud Load
    useEffect(() => {
        if (!user) {
            setPet(INITIAL_PET);
            setHasLoadedCloud(false);
            return;
        }

        const loadCloudPet = async () => {
            const { data, error } = await supabase
                .from('pet_states')
                .select('state')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (error) {
                console.error("[PET_CONTEXT] Erro ao carregar Pet da nuvem:", error.message);
            }

            if (data?.state) {
                setPet(prev => {
                    const finalCoins = profile?.coins ?? data.state.coins ?? prev.coins;
                    // Merge cloud state but keep current coins if profile is newer
                    return { ...data.state, coins: finalCoins };
                });
            }
            setHasLoadedCloud(true);
        };

        loadCloudPet();
    }, [user?.id, profile?.id]);

    // 2. Local Decay & Tick Logic
    useEffect(() => {
        if (pet.isDead || !user || !hasLoadedCloud) return;

        const interval = setInterval(() => {
            setPet(prev => {
                const now = Date.now();
                const diff = (now - prev.lastUpdate) / 1000;
                if (diff < 4) return prev;

                let { energy, mood, stability, age, isSleeping } = prev;
                
                if (isSleeping) {
                    energy = Math.min(100, energy + 2);
                } else {
                    energy = Math.max(0, energy - 0.1);
                    mood = Math.max(0, mood - 0.05);
                }

                if (energy < 20 || mood < 20) stability = Math.max(0, stability - 0.5);
                const isDead = energy <= 0 || mood <= 0 || stability <= 0;

                return {
                    ...prev,
                    energy, mood, stability,
                    age: age + 1,
                    isDead,
                    lastUpdate: now
                };
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [pet.isDead, user, hasLoadedCloud]);

    // 3. Periodic Cloud Sync
    useEffect(() => {
        if (!user || !hasLoadedCloud || isSyncing) return;

        const syncTimeout = setTimeout(async () => {
            setIsSyncing(true);
            try {
                const now = new Date().toISOString();
                await supabase.from('pet_states')
                    .upsert({ 
                        user_id: user.id, 
                        state: { ...pet, lastUpdate: Date.now() }, 
                        last_updated: now 
                    });
                
                // Sync coins/xp to usuarios table for leaderboard
                await supabase.from('usuarios')
                    .update({ 
                        coins: pet.coins, 
                        xp: pet.xp,
                        updated_at: now 
                    })
                    .eq('id', user.id);
            } catch (e) {
                console.warn("[PET_CONTEXT] Sync failed:", e);
            } finally {
                setIsSyncing(false);
            }
        }, 15000);

        return () => clearTimeout(syncTimeout);
    }, [pet, user, hasLoadedCloud]);

    // 4. Multi-tab Realtime Sync
    useEffect(() => {
        if (!user) return;

        const channelId = `pet_global_${user.id}_${Math.random().toString(36).slice(2, 7)}`;
        const channel = supabase
            .channel(channelId)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'pet_states', 
                filter: `user_id=eq.${user.id}` 
            }, (payload) => {
                const cloudPet = payload.new.state;
                if (cloudPet) {
                    setPet(prev => {
                        if (cloudPet.lastUpdate > prev.lastUpdate) {
                            return { ...prev, ...cloudPet };
                        }
                        return prev;
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const updatePet = useCallback((updater) => {
        setPet(prev => {
            const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
            return { ...next, lastUpdate: Date.now() };
        });
    }, []);

    const addReward = useCallback((coins, xp) => {
        setPet(prev => ({
            ...prev,
            coins: (prev.coins || 0) + coins,
            xp: (prev.xp || 0) + xp,
            lastUpdate: Date.now()
        }));
    }, []);

    const claimCoins = useCallback(() => {
        const now = Date.now();
        const waitTime = 24 * 60 * 60 * 1000;
        setPet(prev => {
            if (now >= (prev.lastCoinClaim || 0) + waitTime) {
                return { ...prev, coins: prev.coins + 100, lastCoinClaim: now, lastUpdate: Date.now() };
            }
            return prev;
        });
    }, []);

    const registerTranslation = useCallback(() => {
        setPet(prev => {
            const count = (prev.translationCount || 0) + 1;
            const extraCoins = count % 10 === 0 ? 30 : 0;
            return { ...prev, translationCount: count, coins: prev.coins + extraCoins, lastUpdate: Date.now() };
        });
    }, []);

    const resetProtocol = useCallback(() => {
        setPet(INITIAL_PET);
    }, []);

    return (
        <PetContext.Provider value={{ 
        pet, 
        updatePet, 
        addReward,
        claimCoins, 
        registerTranslation, 
        resetProtocol, 
        loading: !hasLoadedCloud 
    }}>
            {children}
        </PetContext.Provider>
    );
}

export function usePet() {
    const context = useContext(PetContext);
    if (!context) throw new Error("usePet must be used within PetProvider");
    return context;
}
