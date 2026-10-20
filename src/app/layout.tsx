import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tesla Roadster 2.0 Web Game | SpaceX Thruster Flight Simulator',
  description: 'Climb the J-ramp on suction downforce, break away into supersonic 360° flips, fire SpaceX cold gas thrusters, and leap over parked vehicles in real-time WebGL 3D.',
  keywords: ['Tesla Roadster', 'Tesla Roadster Game', 'WebGL', 'Three.js', 'SpaceX Thrusters', 'Next.js 3D Game', 'Interactive Simulator'],
  authors: [{ name: 'Tesla Roadster Web' }],
  openGraph: {
    title: 'Tesla Roadster 2.0 Web Game',
    description: 'Play the Tesla Roadster SpaceX Package game in your browser with real-time physics and WebGL 3D graphics.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
