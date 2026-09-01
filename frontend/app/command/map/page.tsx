'use client';

import { useEffect, useRef, useState } from 'react';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Search, X, MapPin, Users, Clock, Zap } from 'lucide-react';
import type { Incident } from '@/types';
import { useTranslation } from '@/lib/i18n';

// ─── Map Popup ───────────────────────────────────────────────

function IncidentPopup({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const { t, localize, severityLabel } = useTranslation();
  return (
    <motion.div
      className="absolute bottom-6 left-6 w-72 nova-card border rounded-xl p-4 z-50 shadow-nova"
      style={{ borderColor: incident.severity === 'critical' ? 'rgba(255,59,59,0.4)' : 'rgba(26,39,68,0.8)' }}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-mono text-nova-text-muted">{incident.id}</p>
          <p className="text-sm font-bold text-nova-text mt-0.5">{localize(incident.title)}</p>
        </div>
        <button onClick={onClose} className="text-nova-text-muted hover:text-nova-text ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-nova-text-muted">{severityLabel('critical')}</span>
          <SeverityBadge severity={incident.severity} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-nova-text-muted">Location</span>
          <span className="text-nova-text">{localize(incident.location.district || '')}, {localize(incident.location.zone || '')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-nova-text-muted">{t('common.affected')}</span>
          <span className="text-nova-text font-semibold">{incident.peopleAffected}</span>
        </div>
        {incident.aiAnalysis && (
          <div className="flex items-center justify-between">
            <span className="text-nova-text-muted">AI Confidence</span>
            <span className="text-purple-400 font-semibold">{incident.aiAnalysis.confidenceScore}%</span>
          </div>
        )}
        {incident.assignedTeamName && (
          <div className="flex items-center justify-between">
            <span className="text-nova-text-muted">Assigned Team</span>
            <span className="text-nova-cyan">{localize(incident.assignedTeamName)}</span>
          </div>
        )}
        {incident.eta !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-nova-text-muted">{t('common.eta')}</span>
            <span className="text-nova-high font-semibold">{incident.eta} {t('common.min')}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-nova-border">
        <p className="text-xs text-nova-text-muted">
          {incident.aiAnalysis?.recommendedAction ? localize(incident.aiAnalysis.recommendedAction) : 'Awaiting AI analysis'}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Map Page ───────────────────────────────────────────

export default function LiveMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(['incidents', 'teams', 'hospitals', 'risk']);
  const [mapError, setMapError] = useState(false);

  const { incidents, rescueTeams, hospitals } = useNovaStore();
  const { t, localize, timeAgo } = useTranslation();

  // Try to load Mapbox
  useEffect(() => {
    let mapboxgl: any = null;

    const initMap = async () => {
      try {
        const mb = await import('mapbox-gl');
        mapboxgl = (mb as any).default || mb;
        mapboxgl.accessToken =
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
          'pk.eyJ1IjoiYW50aWdyYXZpdHkiLCJhIjoiY2x6MDAwMDAwMDAwMDAwMDAwMDAwMDAwMCJ9.placeholder';

        if (!mapContainer.current) return;

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [80.7718, 7.8731], // Sri Lanka center
          zoom: 8,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on('load', () => {
          setMapLoaded(true);

          // Add incident markers
          incidents.forEach((incident) => {
            if (!incident.location.lat || !incident.location.lng) return;
            const el = document.createElement('div');
            el.className = 'cursor-pointer';
            el.innerHTML = `
              <div style="
                width: 20px; height: 20px; border-radius: 50%;
                background: ${incident.severity === 'critical' ? '#ff3b3b' : incident.severity === 'high' ? '#ff7a00' : incident.severity === 'medium' ? '#ffd700' : '#22c55e'};
                border: 2px solid rgba(255,255,255,0.4);
                box-shadow: 0 0 0 4px ${incident.severity === 'critical' ? 'rgba(255,59,59,0.3)' : 'transparent'};
                animation: ${incident.severity === 'critical' ? 'incident-pulse 2s ease-in-out infinite' : 'none'};
              "></div>`;

            new mapboxgl.Marker({ element: el })
              .setLngLat([incident.location.lng, incident.location.lat])
              .addTo(map);

            el.addEventListener('click', () => setSelectedIncident(incident));
          });

          // Add team markers
          rescueTeams.forEach((team) => {
            const el = document.createElement('div');
            el.innerHTML = `<div style="
              width: 14px; height: 14px; border-radius: 3px;
              background: ${team.status === 'available' ? '#22c55e' : team.status === 'en_route' ? '#ffd700' : '#00d4ff'};
              border: 1px solid rgba(255,255,255,0.4);
            "></div>`;
            new mapboxgl.Marker({ element: el })
              .setLngLat([team.location.lng, team.location.lat])
              .addTo(map);
          });
        });
      } catch {
        setMapError(true);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        (mapRef.current as any).remove?.();
      }
    };
  }, [incidents, rescueTeams]);

  const critCount = incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length;
  const highCount = incidents.filter((i) => i.severity === 'high' && i.status !== 'resolved').length;

  return (
    <div className="min-h-screen bg-nova-bg flex flex-col">
      <TopNav role="officer" />
      <DashboardShell role="officer">
        <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
          {/* Main Map Viewport */}
          <div className="flex-1 relative bg-nova-bg flex items-center justify-center overflow-hidden">
            {/* Map Container */}
            <div ref={mapContainer} className="w-full h-full" />

            {/* Fallback Simulation Map Grid if WebGL not available */}
            {(!mapLoaded || mapError) && (
              <div className="absolute inset-0 bg-[#070b14] flex flex-col items-center justify-center p-8 text-center bg-grid">
                <div className="relative w-full max-w-2xl h-80 border border-nova-border/60 rounded-2xl bg-nova-surface/20 p-6 flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-radial-gradient opacity-30 pointer-events-none" />
                  <MapPin className="w-12 h-12 text-nova-cyan mb-3 animate-bounce" />
                  <h3 className="text-lg font-bold text-nova-text">{t('heading.tactical_map')}</h3>
                  <p className="text-xs text-nova-text-dim max-w-md mt-1 mb-4">
                    Mapbox Vector Engine · Live GPS telemetry across Western Province & Sri Lanka
                  </p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <span className="text-xs px-3 py-1 bg-nova-cyan/10 text-nova-cyan border border-nova-cyan/20 rounded-full">
                      📍 {incidents.length} {t('stats.active_incidents')}
                    </span>
                    <span className="text-xs px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                      🚑 {rescueTeams.length} {t('heading.rescue_deployments')}
                    </span>
                    <span className="text-xs px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                      🏥 {hospitals.length} {t('nav.hospitals')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Map Filter Floating Controls */}
            <div className="absolute top-4 left-4 z-40 flex items-center gap-2 bg-nova-surface/90 backdrop-blur-md border border-nova-border rounded-xl p-1.5 shadow-lg">
              <Layers className="w-4 h-4 text-nova-cyan ml-2" />
              {['incidents', 'teams', 'hospitals', 'risk'].map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    setActiveFilters((prev) =>
                      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
                    )
                  }
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all',
                    activeFilters.includes(f)
                      ? 'bg-nova-cyan text-nova-bg'
                      : 'text-nova-text-muted hover:text-nova-text'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Stats Overlay Top Right */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <div className="bg-nova-surface/90 border border-red-500/30 backdrop-blur-lg rounded-xl px-3 py-1.5 text-center">
                <p className="text-lg font-bold font-mono text-red-400">{critCount}</p>
                <p className="text-[9px] text-nova-text-muted">{t('stats.critical')}</p>
              </div>
              <div className="bg-nova-surface/90 border border-orange-500/30 backdrop-blur-lg rounded-xl px-3 py-1.5 text-center">
                <p className="text-lg font-bold font-mono text-orange-400">{highCount}</p>
                <p className="text-[9px] text-nova-text-muted">High</p>
              </div>
            </div>

            {/* Popup */}
            <AnimatePresence>
              {selectedIncident && (
                <IncidentPopup
                  incident={selectedIncident}
                  onClose={() => setSelectedIncident(null)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar — Incident List */}
          <div className="w-80 border-l border-nova-border bg-nova-surface/50 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Zap className="w-4 h-4 text-nova-cyan" />
              <p className="text-xs font-bold text-nova-text">{t('stats.active_incidents')}</p>
              <span className="ml-auto text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {incidents.filter((i) => i.status !== 'resolved').length}
              </span>
            </div>
            {incidents
              .filter((i) => i.status !== 'resolved')
              .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
              .map((incident) => (
                <button
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    selectedIncident?.id === incident.id
                      ? 'border-nova-cyan/40 bg-nova-cyan/5'
                      : 'border-nova-border hover:border-nova-border2 hover:bg-nova-surface2'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-nova-text-muted">{incident.id}</span>
                    <SeverityBadge severity={incident.severity} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-nova-text line-clamp-1">{localize(incident.title)}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-nova-text-muted">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{localize(incident.location.district || '')}</span>
                    <span>·</span>
                    <Users className="w-2.5 h-2.5" />
                    <span>{incident.peopleAffected}</span>
                    <span>·</span>
                    <Clock className="w-2.5 h-2.5" />
                    <span>{timeAgo(incident.reportedAt)}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}
