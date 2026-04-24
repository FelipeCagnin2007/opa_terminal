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
    const { user, profile, loading } = useAuthContext();
    const [pet, setPet] = useState(INITIAL_PET);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasLoadedCloud, setHasLoadedCloud] = useState(false);

    // 1. Initial Cloud Load
    useEffect(() => {
        if (loading) return; // Critical: Wait for AuthContext to finish loading profile
        if (!user) {
            setPet({ ...INITIAL_PET, lastUpdate: Date.now() });
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

            setPet(prev => {
                // Safeguard against RLS blocks on 'usuarios' by taking the max known value from both tables
                const finalCoins = Math.max(profile?.coins || 0, data?.state?.coins || prev.coins || 0);
                const finalXp = Math.max(profile?.xp || 0, data?.state?.xp || prev.xp || 0);
                
                if (data?.state) {
                    return { ...INITIAL_PET, ...data.state, coins: finalCoins, xp: finalXp };
                }
                
                // If no pet state exists but we have profile, inherit the wealth
                return { ...INITIAL_PET, coins: finalCoins, xp: finalXp, lastUpdate: Date.now() };
            });
            
            setHasLoadedCloud(true);
        };

        loadCloudPet();
    }, [user?.id, profile?.id, loading]);

    // 2. Local Decay & Tick Logic
    useEffect(() => {
        if (pet.isDead || !user || !hasLoadedCloud) return;

        const interval = setInterval(() => {
            setPet(prev => {
                const now = Date.now();
                const diff = (now - prev.lastUpdate) / 1000;
                if (diff < 4) return prev;

                let { age, isSleeping } = prev;
                let energy = prev.energy;
                let mood = prev.mood;
                let stability = prev.stability;
                
                // Fallback to max if states somehow corrupted via DB (null, undefined, NaN)
                if (energy == null || isNaN(Number(energy))) energy = 100;
                if (mood == null || isNaN(Number(mood))) mood = 100;
                if (stability == null || isNaN(Number(stability))) stability = 100;
                
                energy = Number(energy);
                mood = Number(mood);
                stability = Number(stability);
                
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

    const isSyncingRef = useRef(false);
    const petRef = useRef(pet);
    
    // Maintain a fresh ref of pet state for sync to avoid closure staleness
    useEffect(() => {
        petRef.current = pet;
    }, [pet]);

    // 3. Periodic Cloud Sync & Exit Save
    useEffect(() => {
        if (!user || !hasLoadedCloud) return;

        const performSync = async () => {
            if (isSyncingRef.current) return;
            isSyncingRef.current = true;
            try {
                const now = new Date().toISOString();
                const latestPetState = petRef.current;
                
                // Safe upsert relying on user_id as primary key to avoid 400/409 errors
                const { error: upsertError } = await supabase.from('pet_states')
                    .upsert({ 
                        user_id: user.id, 
                        state: { ...latestPetState, lastUpdate: Date.now() }, 
                        last_updated: now 
                    });

                if (upsertError) {
                    console.error("[PET_CONTEXT] pet_states upsert error:", upsertError);
                }
                
                // Sync coins/xp to usuarios table (without updated_at which caused table schema errors)
                const { error: userError } = await supabase.from('usuarios')
                    .update({ 
                        coins: latestPetState.coins, 
                        xp: latestPetState.xp
                    })
                    .eq('id', user.id);

                if (userError) {
                    console.error("[PET_CONTEXT] usuarios update error:", userError);
                }
            } catch (e) {
                console.warn("[PET_CONTEXT] Sync failed:", e);
            } finally {
                isSyncingRef.current = false;
            }
        };

        const syncInterval = setInterval(performSync, 5000); // 5 seconds to reduce data loss

        const handleBeforeUnload = () => {
            performSync();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(syncInterval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            performSync(); // One last sync on unmount
        };
    }, [user, hasLoadedCloud]);

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
        setPet(prev => ({ 
            ...INITIAL_PET, 
            coins: prev.coins,
            xp: prev.xp,
            lastUpdate: Date.now() 
        }));
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
