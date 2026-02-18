import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyService } from '../services/spotify';
import type { SpotifyPlaylist, PlaylistTrackWithFeatures, AudioFeatures } from '../types/spotify';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AnalysisData {
  tracks: PlaylistTrackWithFeatures[];
  features: AudioFeatures[];
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getMoodLabel(valence: number): string {
  if (valence < 0.2) return 'Very Sad';
  if (valence < 0.4) return 'Sad';
  if (valence < 0.6) return 'Neutral';
  if (valence < 0.8) return 'Happy';
  return 'Very Happy';
}

function getDecade(releaseDate: string): string {
  const year = parseInt(releaseDate.substring(0, 4), 10);
  if (isNaN(year)) return 'Unknown';
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function getDanceabilityColor(danceability: number): string {
  if (danceability < 0.3) return '#b91c1c';
  if (danceability < 0.5) return '#d97706';
  if (danceability < 0.7) return '#1DB954';
  return '#22d3ee';
}

async function loadAnalysis(
  playlistId: string,
  onProgress: (pct: number) => void
): Promise<AnalysisData> {
  onProgress(10);
  const tracks = await spotifyService.getAllPlaylistTracks(playlistId);
  onProgress(50);

  const trackIds = tracks.map((t) => t.track.id).filter(Boolean);
  const features = await spotifyService.getAudioFeatures(trackIds);
  onProgress(100);

  const featureMap = new Map(features.map((f) => [f.id, f]));
  const enriched: PlaylistTrackWithFeatures[] = tracks.map((t) => ({
    ...t,
    audioFeatures: featureMap.get(t.track.id),
  }));

  return { tracks: enriched, features };
}

function PlaylistAnalyzer() {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  const [selectedId, setSelectedId] = useState<string>('');
  const [compareId, setCompareId] = useState<string>('');
  const [compareEnabled, setCompareEnabled] = useState(false);

  const [primaryData, setPrimaryData] = useState<AnalysisData | null>(null);
  const [compareData, setCompareData] = useState<AnalysisData | null>(null);

  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPlaylists() {
      try {
        const all = await spotifyService.getAllPlaylists();
        if (!cancelled) {
          setPlaylists(all);
          setLoadingPlaylists(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load playlists');
          setLoadingPlaylists(false);
        }
      }
    }
    fetchPlaylists();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPrimaryData(null);
      return;
    }
    let cancelled = false;
    async function analyze() {
      setLoading(true);
      setError(null);
      setProgress(0);
      try {
        const data = await loadAnalysis(selectedId, (pct) => {
          if (!cancelled) setProgress(pct);
        });
        if (!cancelled) setPrimaryData(data);
      } catch (err) {
        if (!cancelled) setError('Failed to analyze playlist');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    analyze();
    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    if (!compareId || !compareEnabled) {
      setCompareData(null);
      return;
    }
    let cancelled = false;
    async function analyze() {
      setLoading(true);
      setError(null);
      setProgress(0);
      try {
        const data = await loadAnalysis(compareId, (pct) => {
          if (!cancelled) setProgress(pct);
        });
        if (!cancelled) setCompareData(data);
      } catch (err) {
        if (!cancelled) setError('Failed to analyze comparison playlist');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    analyze();
    return () => { cancelled = true; };
  }, [compareId, compareEnabled]);

  return (
    <div className="min-h-screen bg-[#121212] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Playlist Analyzer</h1>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full bg-[#282828] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3e3e3e]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* Playlist selector */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="playlist-select" className="mb-1.5 block text-sm font-medium text-gray-400">
              Select a playlist
            </label>
            <select
              id="playlist-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loadingPlaylists}
              className="w-full rounded-lg border border-[#3e3e3e] bg-[#282828] px-4 py-2.5 text-white focus:border-[#1DB954] focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
            >
              <option value="">
                {loadingPlaylists ? 'Loading playlists...' : '-- Choose a playlist --'}
              </option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.items?.total ?? p.tracks?.total ?? 0} tracks)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={compareEnabled}
                onChange={(e) => {
                  setCompareEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setCompareId('');
                    setCompareData(null);
                  }
                }}
                className="h-4 w-4 rounded border-[#3e3e3e] bg-[#282828] text-[#1DB954] focus:ring-[#1DB954]"
              />
              Compare
            </label>
          </div>

          {compareEnabled && (
            <div className="flex-1">
              <label htmlFor="compare-select" className="mb-1.5 block text-sm font-medium text-gray-400">
                Compare with
              </label>
              <select
                id="compare-select"
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                disabled={loadingPlaylists}
                className="w-full rounded-lg border border-[#3e3e3e] bg-[#282828] px-4 py-2.5 text-white focus:border-[#1DB954] focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
              >
                <option value="">-- Choose a playlist --</option>
                {playlists
                  .filter((p) => p.id !== selectedId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.items?.total ?? p.tracks?.total ?? 0} tracks)
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {loading && (
          <div className="mb-6">
            <div className="mb-1 text-sm text-gray-400">Analyzing playlist...</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#282828]">
              <div
                className="h-full rounded-full bg-[#1DB954] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {primaryData && !loading && (
          <AnalysisResults
            data={primaryData}
            compareData={compareEnabled ? compareData : null}
            playlistName={playlists.find((p) => p.id === selectedId)?.name ?? 'Playlist'}
            compareName={playlists.find((p) => p.id === compareId)?.name ?? 'Comparison'}
          />
        )}

        {/* Empty state */}
        {!selectedId && !loading && (
          <div className="flex flex-col items-center justify-center rounded-lg bg-[#282828] py-20 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-lg text-gray-400">Select a playlist above to see analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats computation hook                                             */
/* ------------------------------------------------------------------ */

interface Stats {
  avgBpm: number;
  avgEnergy: number;
  avgDanceability: number;
  avgValence: number;
  totalTracks: number;
  totalDuration: number;
  topArtists: { name: string; count: number }[];
  bpmDistribution: { range: string; count: number }[];
  decadeDistribution: { decade: string; count: number }[];
  scatterData: { energy: number; valence: number; danceability: number; name: string }[];
}

function useStats(data: AnalysisData | null): Stats | null {
  return useMemo(() => {
    if (!data || data.tracks.length === 0) return null;

    const withFeatures = data.tracks.filter((t) => t.audioFeatures);
    const features = withFeatures.map((t) => t.audioFeatures!);

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const avgBpm = features.length > 0 ? sum(features.map((f) => f.tempo)) / features.length : 0;
    const avgEnergy = features.length > 0 ? sum(features.map((f) => f.energy)) / features.length : 0;
    const avgDanceability = features.length > 0 ? sum(features.map((f) => f.danceability)) / features.length : 0;
    const avgValence = features.length > 0 ? sum(features.map((f) => f.valence)) / features.length : 0;

    const totalTracks = data.tracks.length;
    const totalDuration = sum(data.tracks.map((t) => t.track.duration_ms));

    // Top 5 artists
    const artistCounts = new Map<string, number>();
    for (const t of data.tracks) {
      for (const artist of t.track.artists) {
        artistCounts.set(artist.name, (artistCounts.get(artist.name) ?? 0) + 1);
      }
    }
    const topArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // BPM distribution
    const bpmRanges = [
      { range: '<100', min: 0, max: 100 },
      { range: '100-120', min: 100, max: 120 },
      { range: '120-140', min: 120, max: 140 },
      { range: '140-160', min: 140, max: 160 },
      { range: '160+', min: 160, max: Infinity },
    ];
    const bpmDistribution = bpmRanges.map(({ range, min, max }) => ({
      range,
      count: features.filter((f) => f.tempo >= min && f.tempo < max).length,
    }));

    // Decade distribution
    const decadeCounts = new Map<string, number>();
    for (const t of data.tracks) {
      const decade = getDecade(t.track.album.release_date);
      if (decade !== 'Unknown') {
        decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
      }
    }
    const decadeDistribution = [...decadeCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([decade, count]) => ({ decade, count }));

    // Scatter data
    const scatterData = withFeatures.map((t) => ({
      energy: parseFloat(t.audioFeatures!.energy.toFixed(3)),
      valence: parseFloat(t.audioFeatures!.valence.toFixed(3)),
      danceability: t.audioFeatures!.danceability,
      name: t.track.name,
    }));

    return {
      avgBpm,
      avgEnergy,
      avgDanceability,
      avgValence,
      totalTracks,
      totalDuration,
      topArtists,
      bpmDistribution,
      decadeDistribution,
      scatterData,
    };
  }, [data]);
}

/* ------------------------------------------------------------------ */
/*  AnalysisResults component                                          */
/* ------------------------------------------------------------------ */

interface AnalysisResultsProps {
  data: AnalysisData;
  compareData: AnalysisData | null;
  playlistName: string;
  compareName: string;
}

function AnalysisResults({ data, compareData, playlistName, compareName }: AnalysisResultsProps) {
  const stats = useStats(data);
  const cmpStats = useStats(compareData);

  if (!stats) return null;

  const isComparing = cmpStats !== null;

  return (
    <div className="space-y-8">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Average BPM"
          value={`${Math.round(stats.avgBpm)}`}
          compare={cmpStats ? `${Math.round(cmpStats.avgBpm)}` : undefined}
          playlistName={playlistName}
          compareName={compareName}
        />
        <StatCard
          label="Average Energy"
          value={`${Math.round(stats.avgEnergy * 100)}%`}
          compare={cmpStats ? `${Math.round(cmpStats.avgEnergy * 100)}%` : undefined}
          playlistName={playlistName}
          compareName={compareName}
        />
        <StatCard
          label="Average Danceability"
          value={`${Math.round(stats.avgDanceability * 100)}%`}
          compare={cmpStats ? `${Math.round(cmpStats.avgDanceability * 100)}%` : undefined}
          playlistName={playlistName}
          compareName={compareName}
        />
        <StatCard
          label="Mood (Valence)"
          value={`${getMoodLabel(stats.avgValence)} (${Math.round(stats.avgValence * 100)}%)`}
          compare={
            cmpStats
              ? `${getMoodLabel(cmpStats.avgValence)} (${Math.round(cmpStats.avgValence * 100)}%)`
              : undefined
          }
          playlistName={playlistName}
          compareName={compareName}
        />
        <StatCard
          label="Total Tracks"
          value={`${stats.totalTracks}`}
          compare={cmpStats ? `${cmpStats.totalTracks}` : undefined}
          playlistName={playlistName}
          compareName={compareName}
        />
        <StatCard
          label="Total Duration"
          value={formatDuration(stats.totalDuration)}
          compare={cmpStats ? formatDuration(cmpStats.totalDuration) : undefined}
          playlistName={playlistName}
          compareName={compareName}
        />
      </div>

      {/* Top artists */}
      <div className={`grid gap-4 ${isComparing ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        <TopArtistsCard artists={stats.topArtists} title={isComparing ? playlistName : 'Top 5 Artists'} />
        {cmpStats && <TopArtistsCard artists={cmpStats.topArtists} title={compareName} />}
      </div>

      {/* Charts */}
      <div className="space-y-8">
        {/* Energy vs Valence scatter */}
        <div className={`grid gap-4 ${isComparing ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <ChartCard title={isComparing ? `Energy vs Valence - ${playlistName}` : 'Energy vs Valence'}>
            <EnergyValenceScatter data={stats.scatterData} />
          </ChartCard>
          {cmpStats && (
            <ChartCard title={`Energy vs Valence - ${compareName}`}>
              <EnergyValenceScatter data={cmpStats.scatterData} />
            </ChartCard>
          )}
        </div>

        {/* BPM distribution */}
        <div className={`grid gap-4 ${isComparing ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <ChartCard title={isComparing ? `BPM Distribution - ${playlistName}` : 'BPM Distribution'}>
            <BpmDistributionChart data={stats.bpmDistribution} />
          </ChartCard>
          {cmpStats && (
            <ChartCard title={`BPM Distribution - ${compareName}`}>
              <BpmDistributionChart data={cmpStats.bpmDistribution} />
            </ChartCard>
          )}
        </div>

        {/* Decade distribution */}
        <div className={`grid gap-4 ${isComparing ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <ChartCard title={isComparing ? `Decades - ${playlistName}` : 'Decade Distribution'}>
            <DecadeDistributionChart data={stats.decadeDistribution} />
          </ChartCard>
          {cmpStats && (
            <ChartCard title={`Decades - ${compareName}`}>
              <DecadeDistributionChart data={cmpStats.decadeDistribution} />
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Presentational sub-components                                      */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string;
  compare?: string;
  playlistName: string;
  compareName: string;
}

function StatCard({ label, value, compare, playlistName, compareName }: StatCardProps) {
  return (
    <div className="rounded-lg bg-[#282828] p-6">
      <p className="mb-2 text-sm font-medium text-gray-400">{label}</p>
      {compare !== undefined ? (
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">{playlistName}</span>
            <span className="text-2xl font-bold text-white">{value}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">{compareName}</span>
            <span className="text-2xl font-bold text-[#1DB954]">{compare}</span>
          </div>
        </div>
      ) : (
        <p className="text-3xl font-bold text-white">{value}</p>
      )}
    </div>
  );
}

interface TopArtistsCardProps {
  artists: { name: string; count: number }[];
  title: string;
}

function TopArtistsCard({ artists, title }: TopArtistsCardProps) {
  return (
    <div className="rounded-lg bg-[#282828] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      {artists.length === 0 ? (
        <p className="text-sm text-gray-500">No artist data available</p>
      ) : (
        <ol className="space-y-2">
          {artists.map((a, i) => (
            <li key={a.name} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                <span className="mr-2 inline-block w-5 text-right text-gray-500">{i + 1}.</span>
                {a.name}
              </span>
              <span className="rounded-full bg-[#1DB954]/20 px-2.5 py-0.5 text-xs font-medium text-[#1DB954]">
                {a.count} {a.count === 1 ? 'track' : 'tracks'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[#282828] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart components                                                   */
/* ------------------------------------------------------------------ */

interface ScatterDataPoint {
  energy: number;
  valence: number;
  danceability: number;
  name: string;
}

function EnergyValenceScatter({ data }: { data: ScatterDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" />
        <XAxis
          type="number"
          dataKey="energy"
          name="Energy"
          domain={[0, 1]}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          label={{ value: 'Energy', position: 'bottom', fill: '#9ca3af', fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="valence"
          name="Valence"
          domain={[0, 1]}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          label={{ value: 'Valence', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ backgroundColor: '#181818', border: '1px solid #3e3e3e', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#9ca3af' }}
          formatter={(value: number | undefined, name: string | undefined) => [
            value != null ? value.toFixed(2) : '—',
            name ?? '',
          ]}
          labelFormatter={(_: unknown, payload: ReadonlyArray<{ payload?: ScatterDataPoint }>) => {
            if (payload && payload.length > 0 && payload[0].payload) {
              return payload[0].payload.name;
            }
            return '';
          }}
        />
        <Legend
          verticalAlign="top"
          content={() => (
            <div className="mb-2 flex items-center justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#b91c1c' }} />
                Low dance
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#d97706' }} />
                Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#1DB954' }} />
                High
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#22d3ee' }} />
                Very high
              </span>
            </div>
          )}
        />
        <Scatter data={data} fill="#1DB954">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getDanceabilityColor(entry.danceability)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function BpmDistributionChart({ data }: { data: { range: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          label={{ value: 'BPM Range', position: 'bottom', fill: '#9ca3af', fontSize: 12 }}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#181818', border: '1px solid #3e3e3e', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#1DB954' }}
        />
        <Bar dataKey="count" name="Tracks" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill="#1DB954" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DecadeDistributionChart({ data }: { data: { decade: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" vertical={false} />
        <XAxis
          dataKey="decade"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          label={{ value: 'Decade', position: 'bottom', fill: '#9ca3af', fontSize: 12 }}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#181818', border: '1px solid #3e3e3e', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#1DB954' }}
        />
        <Bar dataKey="count" name="Tracks" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill="#1DB954" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default PlaylistAnalyzer;
