import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch or create profile with timeout safety
  const executeProfileFetch = async (authenticatedUser) => {
    if (!authenticatedUser) return null;
    console.log("[AUTH] Fetching profile for:", authenticatedUser.id);
    
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', authenticatedUser.id)
            .maybeSingle();
        
        if (error) {
            console.error("[AUTH] Select Profile Error:", error.message);
            throw error;
        }

        if (!data) {
            console.log("[AUTH] Profile not found. Executing insert...");
            const { data: newProfile, error: createError } = await supabase
                .from('usuarios')
                .insert([{ 
                    id: authenticatedUser.id, 
                    nome: authenticatedUser.user_metadata?.nome || 'USUÁRIO_OPA',
                    coins: 100,
                    xp: 0
                }])
                .select()
                .single();

            if (createError) {
                console.error("[AUTH] Insert Profile Error:", createError.message);
                throw createError;
            }
            console.log("[AUTH] Profile created successfully.");
            return newProfile;
        }
        
        console.log("[AUTH] Profile fetched successfully.");
        return data;
    } catch (err) {
        console.error("[AUTH] executeProfileFetch critical error:", err.message);
        return null; // Return null but don't hang
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

    const initialize = async () => {
        try {
            console.log("[AUTH] Running initial session check...");
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error("[AUTH] sessionError:", sessionError.message);
                // If session is corrupt in localStorage, clear it
                if (sessionError.message.includes("JWK") || sessionError.message.includes("invalid")) {
                    console.warn("[AUTH] Corrupt session detected. Clearing localStorage.");
                    localStorage.removeItem('sb-rjqrcuzmtwijwxbhcexes-auth-token'); // Clear specifically if needed
                }
            }

            if (session?.user && mounted) {
                await handleAuthEvent(session.user);
            } else {
                console.log("[AUTH] No initial session found.");
                if (mounted) {
                    // We don't release loading YET because onAuthStateChange might fire INITIAL_SESSION
                }
            }
        } catch (err) {
            console.error("[AUTH] Initialization Catch:", err);
            if (mounted) setLoading(false);
        }
    };

    initialize();

    // Listen for changes
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

  // Realtime Profile Sync
  useEffect(() => {
    if (!user?.id) return;

    const channelId = `sync_${user.id}_${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'usuarios', 
        filter: `id=eq.${user.id}` 
      }, (payload) => {
        console.log("[AUTH] Profile Realtime Update:", payload.new);
        setProfile(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const logout = async () => {
    console.log("[AUTH] Signing out...");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
