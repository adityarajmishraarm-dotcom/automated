import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIH26077 | Hyper-Local Severe Weather Nowcasting & Disaster Workspace',
  description: 'National Disaster Nowcasting Operating System with Doppler Radar, 120-Minute Predictive Horizon, Threat Polygons, and Authority Warning Gateway.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
