'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { motion } from 'framer-motion';
import { Compass, Users, MapPin, AlertTriangle, Navigation, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { cn, formatDateTime, getEmergencyTypeIcon } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function RescueOperationsCatchAll() {
  const params = useParams<{ slug: string[] }>();
  const router = useRouter();
  const slug = params?.slug?.[0] || '';
  const { t } = useTranslation();

  const { rescueTeams, incidents, updateTeam, updateIncident } = useNovaStore();
  const myTeam = rescueTeams.find((t) => t.id === 'RT-ALPHA-02') || rescueTeams[0];
  const assignedIncident = incidents.find((i) => i.id === myTeam.currentIncident);

  // 1. ASSIGNED INCIDENTS PANEL
  const renderIncidents = () => {
    const activeAssignments = incidents.filter(i => i.id === myTeam.currentIncident);
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" /> {t('heading.assigned_incidents')}
        </h2>
        {activeAssignments.length > 0 ? (
          <div className="space-y-3">
            {activeAssignments.map((inc) => (
              <div key={inc.id} className="nova-card border border-nova-border rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-nova-text-muted">{inc.id}</span>
                    <h3 className="text-sm font-bold text-nova-text mt-0.5">{getEmergencyTypeIcon(inc.type)} {inc.title}</h3>
                  </div>
                  <SeverityBadge severity={inc.severity} size="sm" pulse={inc.severity === 'critical'} />
                </div>
                <p className="text-xs text-nova-text-dim">{inc.description}</p>
                <div className="flex justify-between items-center pt-3 border-t border-nova-border/50 text-xs text-nova-text-muted">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {inc.location.address}</span>
                  <span className="text-nova-high font-bold">ETA: {inc.eta || 8} min</span>
                </div>
                <button
                  onClick={() => router.push(`/rescue/navigation`)}
                  className="w-full flex items-center justify-center gap-1.5 bg-nova-cyan text-nova-bg font-bold py-2 rounded-xl text-xs hover:bg-nova-cyan-dim transition-all"
                >
                  Start Mission Navigation <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="nova-card border border-nova-border rounded-xl p-8 text-center">
            <CheckCircle className="w-10 h-10 text-nova-low mx-auto mb-3" />
            <p className="text-base font-bold text-nova-text">No Incidents Assigned</p>
            <p className="text-xs text-nova-text-muted mt-1">Your squad is currently on standby. Await dispatch alerts.</p>
          </div>
        )}
      </div>
    );
  };

  // 2. MISSION NAVIGATION PANEL
  const renderNavigation = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <Compass className="w-5 h-5 text-nova-cyan" /> {t('heading.mission_navigation')}
        </h2>
        {assignedIncident ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 nova-card border border-nova-border rounded-xl h-96 relative overflow-hidden flex flex-col items-center justify-center bg-nova-surface2/50">
              {/* Mock Map Layout */}
              <div className="absolute inset-0 hero-grid-bg opacity-30" />
              <div className="relative text-center p-6 space-y-3 z-10">
                <Navigation className="w-10 h-10 text-nova-cyan animate-pulse mx-auto" />
                <p className="text-base font-bold text-nova-text">GPS Route Active</p>
                <p className="text-xs text-nova-text-dim max-w-xs mx-auto">Navigating from HQ to Kaduwela, Zone 04. ETA {assignedIncident.eta || 8} mins.</p>
                <div className="flex gap-2 justify-center">
                  <span className="text-[10px] bg-nova-surface border border-nova-border px-2.5 py-1 rounded-full text-nova-text-muted">Distance: 4.8 km</span>
                  <span className="text-[10px] bg-nova-surface border border-nova-border px-2.5 py-1 rounded-full text-nova-text-muted">Speed: 45 km/h</span>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-nova-bg/90 border border-nova-border flex items-center justify-between text-xs">
                <span className="text-nova-text-muted">Destination:</span>
                <span className="font-semibold text-nova-text truncate max-w-[200px]">{assignedIncident.location.address}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="nova-card border border-nova-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider">{t('heading.mission_details') || 'Mission Details'}</p>
                <p className="text-sm font-bold text-nova-text capitalize">{assignedIncident.title}</p>
                <p className="text-xs text-nova-text-dim">{assignedIncident.description}</p>
              </div>
              <div className="nova-card border border-nova-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider">{t('heading.triage_action')}</p>
                <button
                  onClick={() => {
                    updateIncident(assignedIncident.id, { status: 'responding' });
                    updateTeam(myTeam.id, { status: 'on_scene' });
                    toast.success('Status updated: ON SCENE');
                  }}
                  className="w-full bg-green-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-green-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Report Arrival On Scene
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="nova-card border border-nova-border rounded-xl p-8 text-center">
            <Compass className="w-10 h-10 text-nova-text-muted mx-auto mb-3" />
            <p className="text-base font-bold text-nova-text">No active mission route</p>
            <p className="text-xs text-nova-text-muted mt-1">Assign an incident to see routing paths.</p>
          </div>
        )}
      </div>
    );
  };

  // 3. TEAM MEMBERS PANEL
  const renderTeam = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <Users className="w-5 h-5 text-nova-cyan" /> {t('heading.roster')}
        </h2>
        <div className="nova-card border border-nova-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-2">My Crew ({myTeam.members.length} members)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myTeam.members.map((member) => (
              <div key={member.id} className="p-3 rounded-xl bg-nova-surface/50 border border-nova-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nova-cyan/20 to-nova-blue/20 border border-nova-cyan/30 flex items-center justify-center text-xs font-bold text-nova-cyan">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-nova-text">{member.name}</p>
                    <p className="text-[10px] text-nova-text-muted">{member.role}</p>
                  </div>
                </div>
                <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase', {
                  'bg-green-500/10 border-green-500/20 text-green-400': member.status === 'active',
                  'bg-yellow-500/10 border-yellow-500/20 text-yellow-400': member.status === 'standby',
                })}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="rescue_team" />
      <DashboardShell role="rescue_team">
        <div className="p-6 space-y-6">
          {slug === 'incidents' && renderIncidents()}
          {slug === 'navigation' && renderNavigation()}
          {slug === 'team' && renderTeam()}
        </div>
      </DashboardShell>
    </div>
  );
}
