'use client';

import { useState } from 'react';

export default function Home() {
  const [path, setPath] = useState('');
  const [status, setStatus] = useState('');
  const [details, setDetails] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent, platform: 'android' | 'ios') => {
    e.preventDefault();
    if (!path) {
      setStatus('Please provide a directory path.');
      return;
    }

    setLoading(true);
    setStatus(`Generating ${platform} package for: ${path}...`);
    setDetails('');
    setDownloadUrl('');
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, platform }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setStatus(`✅ Success! ${data.message}`);
        setDetails(data.instructions || '');
        if (data.download_url) setDownloadUrl(data.download_url);
      } else {
        setStatus(`❌ Error: ${data.error}`);
        setDetails(data.details || '');
      }
    } catch (err) {
      setStatus('❌ Failed to connect to the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 md:p-24 bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PWA2Native 🚀</h1>
          <p className="text-gray-500 text-lg">
            Transform your PWA into a native Android or iOS application in seconds.
          </p>
        </header>

        <form className="space-y-8">
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
            <label htmlFor="path" className="block text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">
              1. Select PWA Source Directory
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                id="path"
                required
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm bg-white font-mono"
                placeholder="/Users/username/Projects/my-pwa/dist"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/select-dir');
                    if (res.ok) {
                      const data = await res.json();
                      if (data.path) {
                        setPath(data.path);
                        setStatus('Path selected! Now choose your platform below. 👇');
                      }
                    }
                  } catch (e) {
                    console.error('Failed to select directory', e);
                  }
                }}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-blue-600 font-bold rounded-lg border-2 border-blue-600 transition whitespace-nowrap shadow-sm active:scale-95"
              >
                Browse...
              </button>
            </div>
            {path && (
              <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Ready to build from this directory
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
              2. Choose Platform & Generate
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                disabled={loading || !path}
                onClick={(e) => handleGenerate(e, 'android')}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                  path 
                    ? 'border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 cursor-pointer' 
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="text-3xl mb-2">🤖</span>
                <span className="font-bold text-green-900">Build Android</span>
                <span className="text-xs text-green-700 mt-1">Generates APK/Android Project</span>
              </button>
              
              <button
                disabled={loading || !path}
                onClick={(e) => handleGenerate(e, 'ios')}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                  path 
                    ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer' 
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="text-3xl mb-2">🍎</span>
                <span className="font-bold text-indigo-900">Build iOS</span>
                <span className="text-xs text-indigo-700 mt-1">Generates Xcode Project</span>
              </button>
            </div>
          </div>
        </form>

        {status && (
          <div className={`mt-10 p-6 rounded-xl border animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            status.includes('❌') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>}
              {status}
            </h3>
            
            {details && (
              <div className="mt-4 p-4 bg-black/5 rounded-lg text-sm font-mono whitespace-pre-wrap break-all">
                {details}
              </div>
            )}

            {downloadUrl && (
              <a 
                href={downloadUrl} 
                download
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition shadow-lg active:scale-95"
              >
                ⬇️ Download Package
              </a>
            )}
          </div>
        )}

        <footer className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
          <p>© 2026 PWA2Native. All tools required (Android SDK/Xcode) must be installed locally for final compilation.</p>
        </footer>
      </div>
    </main>
  );
}
