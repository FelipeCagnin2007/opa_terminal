import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile — DB trigger handles creation automatically on signup,
  // so we only need a single SELECT here (no more INSERT race condition).
  const executeProfileFetch = async (authenticatedUser) => {
    if (!authenticatedUser) return null;
    console.log("[AUTH] Fetching profile for:", authenticatedUser.id);
    
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome, coins, xp') // select específico — sem overfetch
            .eq('id', authenticatedUser.id)
            .maybeSingle();
        
        if (error) {
            console.error("[AUTH] Select Profile Error:", error.message);
            throw error;
        }

        // Profile not found yet (trigger may be processing) — retry once after 800ms
        if (!data) {
            console.warn("[AUTH] Profile not found on first attempt — retrying in 800ms (trigger may be processing)...");
            await new Promise(res => setTimeout(res, 800));
            const { data: retryData, error: retryErr } = await supabase
                .from('usuarios')
                .select('id, nome, coins, xp')
                .eq('id', authenticatedUser.id)
                .maybeSingle();
            if (retryErr) throw retryErr;
            console.log(retryData ? "[AUTH] Profile found on retry." : "[AUTH] Profile still not found — trigger may be delayed.");
            return retryData;
        }
        
        console.log("[AUTH] Profile fetched successfully.");
        return data;
    } catch (err) {
        console.error("[AUTH] executeProfileFetch critical error:", err.message);
        return null;
    }
  };

  const processedSessionUser = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Force release loading after 10s if anything hangs
    const globalTimeout = setTimeout(() => {
        if (mounted && loading) {
            console.warn("[AUTH] Global initialization timeout reached. Forcing loading = false");
            setLoading(false);
        }
    }, 10000);

    const handleAuthEvent = async (userObj) => {
        if (!userObj || !mounted) return;
        
        // Prevent double-processing the same user in the same mount
        if (processedSessionUser.current === userObj.id) {
            console.log("[AUTH] User already processed, skipping duplicate fetch.");
            if (mounted) setLoading(false);
            return;
        }
        
        processedSessionUser.current = userObj.id;
        setUser(userObj);
        
        try {
            const profileObj = await executeProfileFetch(userObj);
            if (mounted) {
                setProfile(profileObj);
                setLoading(false);
            }
        } catch (err) {
            console.error("[AUTH] handleAuthEvent Error:", err);
            if (mounted) setLoading(false);
        }
    };

    // Listen for changes. INITIAL_SESSION will fire immediately upon subscription,
    // handling the initial load without race conditions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[AUTH] AuthStateChange Event:", event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            if (session?.user) {
                await handleAuthEvent(session.user);
            } else {
                if (mounted) setLoading(false);
            }
        } else if (event === 'SIGNED_OUT') {
            processedSessionUser.current = null;
            setUser(null);
            setProfile(null);
            if (mounted) setLoading(false);
        } else {
            // Unhandled events (MFA, etc)
            if (mounted) setLoading(false);
        }
    });

    return () => {
        mounted = false;
        clearTimeout(globalTimeout);
        subscription.unsubscribe();
    };
  }, []);


  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
