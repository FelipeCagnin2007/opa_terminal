import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainTerminalLayout } from './components/templates/MainTerminalLayout';
import { TranslatorTab } from './components/organisms/TranslatorTab';
import { ReferenceTab } from './components/organisms/ReferenceTab';
import { OpaGotchiTab } from './components/organisms/OpaGotchiTab';
import { ChatTab } from './components/organisms/ChatTab';
import { MultiplayerTab } from './components/organisms/MultiplayerTab';
import { BlackopaTab } from './components/organisms/BlackopaTab';
import { LinguopaTab } from './components/organisms/LinguopaTab';
import { ExecutorTab } from './components/organisms/ExecutorTab';
import { LeaderboardTab } from './components/organisms/LeaderboardTab';
import { PokemonTab } from './components/organisms/PokemonTab';
import { AboutTab } from './components/organisms/AboutTab';
import { useAuthContext } from './context/AuthContext';
import { AuthScreen } from './components/organisms/AuthScreen';

function AppContent() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-bg flex items-center justify-center font-terminal text-glow text-lg animate-pulse">
        &gt; INICIALIZANDO PROTOCOLO OPA...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Routes>
      <Route element={<MainTerminalLayout />}>
        <Route path="/" element={<Navigate to="/tradutor" replace />} />
        <Route path="/tradutor" element={<TranslatorTab />} />
        <Route path="/sobre" element={<AboutTab />} />
        <Route path="/referencia" element={<ReferenceTab />} />
        <Route path="/executor" element={<ExecutorTab />} />
        <Route path="/chat" element={<ChatTab />} />
        <Route path="/leaderboard" element={<LeaderboardTab />} />
        <Route path="/multiplayer" element={<MultiplayerTab />} />
        <Route path="/blackopa" element={<BlackopaTab />} />
        <Route path="/linguopa" element={<LinguopaTab />} />
        <Route path="/pokemon" element={<PokemonTab />} />
        <Route path="/gotchi" element={<OpaGotchiTab />} />
        <Route path="*" element={<Navigate to="/tradutor" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
