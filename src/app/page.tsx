'use client';

import dynamic from 'next/dynamic';

const RoadsterGame = dynamic(
  () => import('../components/RoadsterGame').then((mod) => mod.RoadsterGame),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontFamily: 'Outfit, sans-serif',
        gap: '16px'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          border: '3px solid rgba(255, 255, 255, 0.15)',
          borderTopColor: '#ff3326',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.04em' }}>
          Initializing Tesla Roadster SpaceX System...
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    )
  }
);

export default function HomePage() {
  return (
    <main style={{ width: '100%', height: '100%', position: 'relative' }}>
      <RoadsterGame />
    </main>
  );
}
