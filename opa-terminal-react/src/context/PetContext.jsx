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

// ─── How often we push to DB (only when dirty) ─────────────────────────────
const SYNC_INTERVAL_MS = 60_000; // 60s instead of 5s → 92% fewer writes

export function PetProvider({ children }) {
    const { user, profile, loading } = useAuthContext();
    const [pet, setPet] = useState(INITIAL_PET);
    const [hasLoadedCloud, setHasLoadedCloud] = useState(false);

    // Refs to avoid stale closures in async callbacks
    const petRef       = useRef(pet);
    const isSyncingRef = useRef(false);
    // Dirty flag — only sync when state actually changed since last write
    const isDirtyRef   = useRef(false);

    useEffect(() => { petRef.current = pet; }, [pet]);

    // ── 1. Initial Cloud Load ──────────────────────────────────────────────
    useEffect(() => {
        if (loading) return;
        if (!user) {
            setPet({ ...INITIAL_PET, lastUpdate: Date.now() });
            setHasLoadedCloud(false);
            isDirtyRef.current = false;
            return;
        }

        const loadCloudPet = async () => {
            const { data, error } = await supabase
                .from('pet_states')
                .select('state')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) console.error('[PET_CONTEXT] Erro ao carregar Pet:', error.message);

            setPet(prev => {
                const finalCoins = Math.max(profile?.coins || 0, data?.state?.coins || prev.coins || 0);
                const finalXp    = Math.max(profile?.xp    || 0, data?.state?.xp    || prev.xp    || 0);

                if (data?.state) return { ...INITIAL_PET, ...data.state, coins: finalCoins, xp: finalXp };
                return { ...INITIAL_PET, coins: finalCoins, xp: finalXp, lastUpdate: Date.now() };
            });

            setHasLoadedCloud(true);
            isDirtyRef.current = false; // fresh from DB, nothing to write yet
        };

        loadCloudPet();
    }, [user?.id, profile?.id, loading]);

    // ── 2. Local Decay & Tick (pure local, no DB) ─────────────────────────
    useEffect(() => {
        if (pet.isDead || !user || !hasLoadedCloud) return;

        const interval = setInterval(() => {
            setPet(prev => {
                const now  = Date.now();
                const diff = (now - prev.lastUpdate) / 1000;
                if (diff < 4) return prev;

                let { age, isSleeping } = prev;
                let energy    = Number(prev.energy    ?? 100);
                let mood      = Number(prev.mood      ?? 100);
                let stability = Number(prev.stability ?? 100);

                if (isNaN(energy))    energy    = 100;
                if (isNaN(mood))      mood      = 100;
                if (isNaN(stability)) stability = 100;

                if (isSleeping) {
                    energy = Math.min(100, energy + 2);
                } else {
                    energy = Math.max(0, energy - 0.1);
                    mood   = Math.max(0, mood   - 0.05);
                }

                if (energy < 20 || mood < 20) stability = Math.max(0, stability - 0.5);
                const isDead = energy <= 0 || mood <= 0 || stability <= 0;

                return { ...prev, energy, mood, stability, age: age + 1, isDead, lastUpdate: now };
            });
            // Decay counts as a change worth persisting
            isDirtyRef.current = true;
        }, 5000);

        return () => clearInterval(interval);
    }, [pet.isDead, user, hasLoadedCloud]);

    // ── 3. Periodic Cloud Sync — only when dirty ──────────────────────────
    useEffect(() => {
        if (!user || !hasLoadedCloud) return;

        const performSync = async () => {
            if (!isDirtyRef.current) return;          // nothing changed, skip
            if (isSyncingRef.current)  return;        // already in flight
            isSyncingRef.current = true;
            isDirtyRef.current   = false;             // optimistically clear

            try {
                const now   = new Date().toISOString();
                const state = petRef.current;

                const { error: upsertError } = await supabase
                    .from('pet_states')
                    .upsert({ user_id: user.id, state: { ...state, lastUpdate: Date.now() }, last_updated: now });

                if (upsertError) {
                    console.error('[PET_CONTEXT] pet_states upsert error:', upsertError);
                    isDirtyRef.current = true; // retry next cycle
                }

                const { error: userError } = await supabase
                    .from('usuarios')
                    .update({ coins: state.coins, xp: state.xp })
                    .eq('id', user.id);

                if (userError) {
                    console.error('[PET_CONTEXT] usuarios update error:', userError);
                    isDirtyRef.current = true;
                }
            } catch (e) {
                console.warn('[PET_CONTEXT] Sync failed:', e);
                isDirtyRef.current = true; // retry next cycle
            } finally {
                isSyncingRef.current = false;
            }
        };

        // Main interval: 60s, only fires if dirty
        const syncInterval = setInterval(performSync, SYNC_INTERVAL_MS);

        // Safety net: save whenever the tab goes hidden (user switches tab / closes)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') performSync();
        };

        // Save before page unload
        const handleBeforeUnload = () => performSync();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(syncInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            performSync(); // One last sync on unmount
        };
    }, [user, hasLoadedCloud]);

    // ── Updaters (mark dirty on every real change) ────────────────────────
    const updatePet = useCallback((updater) => {
        setPet(prev => {
            const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
            isDirtyRef.current = true;
            return { ...next, lastUpdate: Date.now() };
        });
    }, []);

    const addReward = useCallback((coins, xp) => {
        setPet(prev => {
            isDirtyRef.current = true;
            return { ...prev, coins: (prev.coins || 0) + coins, xp: (prev.xp || 0) + xp, lastUpdate: Date.now() };
        });
    }, []);

    const claimCoins = useCallback(() => {
        const now = Date.now();
        const waitTime = 24 * 60 * 60 * 1000;
        setPet(prev => {
            if (now >= (prev.lastCoinClaim || 0) + waitTime) {
                isDirtyRef.current = true;
                return { ...prev, coins: prev.coins + 100, lastCoinClaim: now, lastUpdate: Date.now() };
            }
            return prev;
        });
    }, []);

    const registerTranslation = useCallback(() => {
        setPet(prev => {
            const count      = (prev.translationCount || 0) + 1;
            const extraCoins = count % 10 === 0 ? 30 : 0;
            isDirtyRef.current = true;
            return { ...prev, translationCount: count, coins: prev.coins + extraCoins, lastUpdate: Date.now() };
        });
    }, []);

    const resetProtocol = useCallback(() => {
        setPet(prev => {
            isDirtyRef.current = true;
            return { ...INITIAL_PET, coins: prev.coins, xp: prev.xp, lastUpdate: Date.now() };
        });
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
    if (!context) throw new Error('usePet must be used within PetProvider');
    return context;
}
