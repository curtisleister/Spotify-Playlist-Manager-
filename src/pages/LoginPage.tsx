interface LoginPageProps {
  login: () => void;
  error: string | null;
}

function LoginPage({ login, error }: LoginPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212]">
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        {/* Playlist / music note icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          fill="none"
          className="h-20 w-20"
        >
          <rect x="4" y="4" width="56" height="56" rx="12" fill="#1DB954" fillOpacity="0.15" />
          <path
            d="M20 18h18a2 2 0 0 1 0 4H20a2 2 0 0 1 0-4Z"
            fill="#1DB954"
          />
          <path
            d="M20 26h24a2 2 0 0 1 0 4H20a2 2 0 0 1 0-4Z"
            fill="#1DB954"
          />
          <path
            d="M20 34h14a2 2 0 0 1 0 4H20a2 2 0 0 1 0-4Z"
            fill="#1DB954"
          />
          <circle cx="44" cy="44" r="6" fill="#1DB954" />
          <rect x="48" y="30" width="4" height="16" rx="2" fill="#1DB954" />
        </svg>

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Spotify Playlist Manager
          </h1>
          <p className="text-lg text-gray-400">
            Manage, analyze, and organize your Spotify playlists
          </p>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-500">
            {error}
          </p>
        )}

        <button
          onClick={login}
          className="rounded-full bg-[#1DB954] px-10 py-4 text-lg font-semibold text-white transition-colors duration-200 hover:bg-[#1ed760] focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2 focus:ring-offset-[#121212]"
        >
          Connect to Spotify
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
