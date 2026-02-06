import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PlaylistDetail from './pages/PlaylistDetail';
import MultiPlaylistManager from './pages/MultiPlaylistManager';
import PlaylistAnalyzer from './pages/PlaylistAnalyzer';

function App() {
  const { user, isLoading, error, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-spotify-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-spotify-green border-t-transparent rounded-full animate-spin" />
          <p className="text-spotify-text text-lg">Connecting to Spotify...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage login={login} error={error} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard user={user} onLogout={logout} />} />
        <Route path="/playlist/:playlistId" element={<PlaylistDetail />} />
        <Route path="/multi" element={<MultiPlaylistManager />} />
        <Route path="/analyzer" element={<PlaylistAnalyzer />} />
        <Route path="/callback" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
