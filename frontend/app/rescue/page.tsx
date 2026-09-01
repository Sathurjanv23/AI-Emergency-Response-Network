'use client';

import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { useNovaStore } from '@/lib/store/nova-store';
import { StatCard } from '@/components/emergency/StatCard';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Navigation, Users, Package, CheckCircle, Radio, MapPin, Clock, Zap } from 'lucide-react';
import { cn, getTeamStatusColor, formatTimeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

import { useTranslation } from '@/lib/i18n';

export default function RescueDashboardPage() {
  const { rescueTeams, incidents, updateTeam, updateIncident } = useNovaStore();
  const { t, localize, statusLabel } = useTranslation();
  const myTeam = rescueTeams.find((t) => t.id === 'RT-ALPHA-02') || rescueTeams[0];
  const assignedIncident = incidents.find((i) => i.id === myTeam.currentIncident);

  const handleStatusChange = (status: 'available' | 'en_route' | 'on_scene') => {
    updateTeam(myTeam.id, { status });
    if (status === 'on_scene' && myTeam.currentIncident) {
      updateIncident(myTeam.currentIncident, { status: 'responding' });
    }
    toast.success(`Status updated: ${statusLabel(status)}`);
  };

  return (
    <AuthGuard allowedRoles={['rescue_team']}>
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="rescue_team" />
      <DashboardShell role="rescue_team">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display text-nova-text">{t('heading.rescue_dashboard')}</h1>
              <p className="text-sm text-nova-text-dim">{localize(myTeam.name)} · {localize(myTeam.district)}</p>
            </div>
            <div className={cn('px-3 py-1.5 rounded-full text-xs font-bold border', {
              'bg-green-500/10 border-green-500/30 text-green-400': myTeam.status === 'available',
              'bg-yellow-500/10 border-yellow-500/30 text-yellow-400': myTeam.status === 'assigned',
              'bg-orange-500/10 border-orange-500/30 text-orange-400': myTeam.status === 'en_route',
              'bg-red-500/10 border-red-500/30 text-red-400': myTeam.status === 'on_scene',
            })}>
              {statusLabel(myTeam.status)}
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={t('stats.team_members')} value={myTeam.members.length} icon={<Users className="w-4 h-4" />} variant="cyan" />
            <StatCard label={t('stats.equipment_items')} value={myTeam.equipment.length} icon={<Package className="w-4 h-4" />} />
            <StatCard label={t('stats.active_assignment')} value={myTeam.currentIncident ? 1 : 0} icon={<Activity className="w-4 h-4" />} variant={myTeam.currentIncident ? 'warning' : 'default'} />
            {myTeam.eta !== undefined && myTeam.status === 'en_route' ? (
              <StatCard label={t('stats.eta_minutes')} value={myTeam.eta} icon={<Clock className="w-4 h-4" />} variant="warning" />
            ) : (
              <StatCard label={t('stats.status')} value={statusLabel(myTeam.status)} icon={<Radio className="w-4 h-4" />} variant={myTeam.status === 'available' ? 'success' : 'warning'} animate={false} />
            )}
          </div>

          {/* Status Controls */}
          <div className="nova-card border border-nova-border rounded-xl p-4">
            <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">{t('heading.team_status')}</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { status: 'available', label: statusLabel('available'), color: 'border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20' },
                { status: 'en_route', label: statusLabel('en_route'), color: 'border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20' },
                { status: 'on_scene', label: statusLabel('on_scene'), color: 'border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20' },
              ].map((opt) => (
                <motion.button
                  key={opt.status}
                  onClick={() => handleStatusChange(opt.status as 'available' | 'en_route' | 'on_scene')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm transition-all',
                    opt.color,
                    myTeam.status === opt.status && 'ring-1 ring-current'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {myTeam.status === opt.status && <CheckCircle className="w-3.5 h-3.5" />}
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Assigned Incident */}
          {assignedIncident ? (
            <div className="nova-card border border-red-500/25 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-red-400 mb-1">🔴 {t('heading.assigned_incidents')}</p>
                  <p className="text-xs font-mono text-nova-text-muted">{assignedIncident.id}</p>
                  <h3 className="text-sm font-bold text-nova-text mt-1">{localize(assignedIncident.title)}</h3>
                </div>
                <SeverityBadge severity={assignedIncident.severity} pulse />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="flex items-center gap-2 text-nova-text-dim">
                  <MapPin className="w-4 h-4 text-nova-cyan" />
                  <span>{localize(assignedIncident.location.district)}</span>
                </div>
                <div className="flex items-center gap-2 text-nova-text-dim">
                  <Users className="w-4 h-4 text-nova-cyan" />
                  <span>{assignedIncident.peopleAffected} {t('common.affected')}</span>
                </div>
                {assignedIncident.eta !== undefined && (
                  <div className="flex items-center gap-2 text-nova-high font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>{t('common.eta')}: {assignedIncident.eta} {t('common.min')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-nova-text-dim">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>AI: {assignedIncident.aiAnalysis?.confidenceScore}%</span>
                </div>
              </div>

              {assignedIncident.aiAnalysis?.recommendedAction && (
                <div className="p-3 rounded-xl bg-nova-cyan/5 border border-nova-cyan/15 text-xs text-nova-text-dim">
                  <strong className="text-nova-cyan">{t('copilot.recommendation')}: </strong>
                  {localize(assignedIncident.aiAnalysis.recommendedAction)}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Link
                  href="/rescue/navigation"
                  className="flex-1 flex items-center justify-center gap-2 bg-nova-cyan text-nova-bg font-bold py-2.5 rounded-xl hover:bg-nova-cyan-dim transition-all text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  {t('nav.navigation')}
                </Link>
                <button
                  onClick={() => handleStatusChange('on_scene')}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/30 text-green-300 font-bold py-2.5 rounded-xl hover:bg-green-500/30 transition-all text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('btn.arrival_scene')}
                </button>
              </div>
            </div>
          ) : (
            <div className="nova-card border border-nova-border rounded-xl p-8 text-center">
              <CheckCircle className="w-10 h-10 text-nova-low mx-auto mb-3" />
              <p className="text-base font-bold text-nova-text">{t('common.no_active_incidents')}</p>
              <p className="text-sm text-nova-text-dim mt-1">{t('heading.authority_dashboard')}</p>
            </div>
          )}

          {/* Team Members */}
          <div className="nova-card border border-nova-border rounded-xl p-4">
            <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">{t('heading.roster')}</p>
            <div className="space-y-2">
              {myTeam.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2.5 rounded-lg bg-nova-surface/50 border border-nova-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nova-cyan/30 to-nova-blue/30 border border-nova-cyan/20 flex items-center justify-center text-xs font-bold text-nova-cyan">
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-nova-text">{member.name}</p>
                      <p className="text-[10px] text-nova-text-muted">{member.role}</p>
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', {
                    'text-green-400 bg-green-400/10': member.status === 'active',
                    'text-yellow-400 bg-yellow-400/10': member.status === 'standby',
                    'text-nova-text-muted bg-nova-border': member.status === 'off_duty',
                  })}>
                    {statusLabel(member.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="nova-card border border-nova-border rounded-xl p-4">
            <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">{t('stats.equipment_items')}</p>
            <div className="grid grid-cols-2 gap-2">
              {myTeam.equipment.map((eq, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-nova-surface/50 border border-nova-border/50">
                  <div>
                    <p className="text-xs font-medium text-nova-text">{eq.type}</p>
                    <p className="text-[10px] text-nova-text-muted">Qty: {eq.quantity}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold', {
                    'text-green-400': eq.status === 'available',
                    'text-orange-400': eq.status === 'in_use',
                    'text-red-400': eq.status === 'maintenance',
                  })}>
                    {statusLabel(eq.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardShell>
    </div>
    </AuthGuard>
  );
}
