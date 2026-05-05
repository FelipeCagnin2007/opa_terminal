/**
 * PokemonTab — Main router and container for the Pokémon ecosystem.
 * Handles switching between Team Builder, Battle Lobby, and Battle Arena.
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../../context/AuthContext';
import { PokemonTeamBuilder } from './PokemonTeamBuilder';
import { PokemonBattleLobby } from './PokemonBattleLobby';
import { PokemonBattleArena } from './PokemonBattleArena';

export function PokemonTab() {
  const { profile } = useAuthContext();
  
  // view: 'builder' | 'lobby' | 'arena'
  const [currentView, setCurrentView] = useState('builder');
  
  // Battle state passed from lobby -> arena
  const [battleState, setBattleState] = useState(null);
  
  // Store P2P message handlers so the arena can receive updates
  // Since we don't want to drill PeerJS connection through react state unnecessarily,
  // we use a ref that the Arena can attach to.
  const p2pHandlersRef = useRef({});

  const handleBattleStart = (state) => {
    setBattleState(state);
    setCurrentView('arena');
  };

  const handleExitArena = () => {
    setBattleState(null);
    setCurrentView('builder');
  };

  return (
    <div className="flex flex-col h-full p-2 md:p-6 lg:p-10 relative overflow-hidden">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {currentView === 'builder' && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full"
          >
            <PokemonTeamBuilder 
              userId={profile?.id} 
              onBattle={() => setCurrentView('lobby')} 
            />
          </motion.div>
        )}

        {currentView === 'lobby' && (
           <motion.div
             key="lobby"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="h-full pt-10"
           >
             <PokemonTab.Lobby 
               onBack={() => setCurrentView('builder')}
               onBattleStart={handleBattleStart}
               p2pHandlersRef={p2pHandlersRef}
             />
           </motion.div>
        )}

        {currentView === 'arena' && battleState && (
          <motion.div
            key="arena"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[5000] bg-black"
          >
            <PokemonBattleArena
              isHost={battleState.isHost}
              myTeamData={battleState.myTeam}
              opponentTeamData={battleState.opponentTeam}
              p2pHandlers={p2pHandlersRef}
              onExit={handleExitArena}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { usePokemonTeam } from '../../hooks/usePokemonTeam';

// Wrapper for Lobby to fetch team, to avoid prop drilling from Builder
function PokemonBattleLobbyWrapper(props) {
  const { profile } = useAuthContext();
  const { team } = usePokemonTeam(profile?.id);
  
  if (!team) return null; // loading handled in hook usually, or we can just pass empty array
  
  return <PokemonBattleLobby myTeam={team} {...props} />;
}

// Override component definition for Lobby rendering in the switch above
PokemonTab.Lobby = PokemonBattleLobbyWrapper;
