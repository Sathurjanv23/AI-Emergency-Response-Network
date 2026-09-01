'use client';

import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { useNovaStore } from '@/lib/store/nova-store';
import { EmergencyCard } from '@/components/emergency/EmergencyCard';
import { StatCard } from '@/components/emergency/StatCard';
import { RiskGauge } from '@/components/emergency/RiskGauge';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { AlertTriangle, Map, Brain, Users, Clock, Activity, Zap, BarChart3, Cpu } from 'lucide-react';
import { cn, getTeamStatusColor, formatTimeAgo } from '@/lib/utils';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  LineChart, Line, Tooltip, XAxis
} from 'recharts';
import { MOCK_ANALYTICS } from '@/lib/mock/data';
import { useTranslation } from '@/lib/i18n';

// ─── NOVA Copilot Mini Widget ────────────────────────────────

function CopilotMini() {
  const { t } = useTranslation();
  return (
    <div className="nova-card border border-nova-border rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-nova-text">{t('nav.copilot')}</p>
          <p className="text-[10px] text-purple-400">AI Active</p>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="p-3 rounded-lg bg-nova-surface/70 border border-nova-border/50 text-xs text-nova-text-dim">
          <p className="font-semibold text-nova-text mb-1">{t('copilot.situation_summary')}</p>
          <p>{t('copilot.summary_text')}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 text-xs">
          <p className="font-semibold text-orange-300 mb-1">{t('copilot.risk_alert')}</p>
          <p className="text-nova-text-dim">{t('copilot.risk_text')}</p>
        </div>
        <div className="p-3 rounded-lg bg-nova-cyan/5 border border-nova-cyan/20 text-xs">
          <p className="font-semibold text-nova-cyan mb-1">{t('copilot.recommendation')}</p>
          <p className="text-nova-text-dim">{t('copilot.rec_text')}</p>
        </div>
      </div>
      <Link href="/command/copilot" className="mt-3 text-xs text-center text-nova-cyan hover:underline block">
        {t('copilot.full_copilot')} →
      </Link>
    </div>
  );
}

// ─── Command Center Dashboard ────────────────────────────────

export default function CommandCenterPage() {
  const { incidents: allIncidents, stats, rescueTeams, riskPredictions, simulation } = useNovaStore();
  const incidents = useMemo(() => allIncidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed'), [allIncidents]);
  const criticalIncidents = useMemo(() => incidents.filter((i) => i.severity === 'critical'), [incidents]);
  const trendData = useMemo(() => MOCK_ANALYTICS.responseTimeTrend.slice(-14), []);
  const { t, localize, statusLabel } = useTranslation();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AuthGuard allowedRoles={['officer']}>
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="officer" />
      <DashboardShell role="officer">
        <div className="p-6 space-y-6">
          {/* Simulation Banner */}
          <AnimatePresence>
            {simulation.isActive && (
              <motion.div
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <motion.div
                  className="w-2.5 h-2.5 rounded-full bg-red-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <div>
                  <p className="text-sm font-bold text-red-300">
                    {t('common.live')} {t('btn.start_sim')} — {localize('SIMULATION MODE ACTIVE — Flood Crisis Scenario')}
                  </p>
                  <p className="text-xs text-red-400/70">Step {simulation.currentStep}/13: All dashboard data is simulated</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display text-nova-text">{t('heading.command_center')}</h1>
              <p className="text-sm text-nova-text-dim mt-0.5">{t('heading.authority_dashboard')} · {mounted ? new Date().toLocaleString('en-LK') : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/command/map"
                className="flex items-center gap-2 bg-nova-cyan text-nova-bg font-bold px-4 py-2 rounded-xl hover:bg-nova-cyan-dim transition-all text-sm"
              >
                <Map className="w-4 h-4" />
                {t('nav.map')}
              </Link>
              <Link
                href="/command/ai-analysis"
                className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold px-4 py-2 rounded-xl hover:bg-purple-500/30 transition-all text-sm"
              >
                <Brain className="w-4 h-4" />
                {t('nav.ai_analysis')}
              </Link>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label={t('stats.active_incidents')} value={stats.activeIncidents} icon={<AlertTriangle className="w-4 h-4" />} variant={stats.activeIncidents > 5 ? 'critical' : 'default'} />
            <StatCard label={t('stats.critical')} value={stats.criticalIncidents} icon={<Zap className="w-4 h-4" />} variant="critical" />
            <StatCard label={t('stats.people_affected')} value={stats.peopleAffected} icon={<Users className="w-4 h-4" />} variant="warning" />
            <StatCard label={t('stats.teams_deployed')} value={stats.teamsDeployed} icon={<Activity className="w-4 h-4" />} variant="cyan" />
            <StatCard label={t('stats.avg_response')} value={`${stats.avgResponseTime}`} suffix={` ${t('common.min')}`} icon={<Clock className="w-4 h-4" />} />
            <StatCard label={t('stats.ai_predictions')} value={stats.aiPredictions} icon={<Brain className="w-4 h-4" />} variant="success" />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* LEFT — Incident Feed */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-nova-text">{t('heading.queue')}</h2>
                  <motion.span
                    className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full"
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {t('common.live')}
                  </motion.span>
                </div>
                <Link href="/command/incidents" className="text-xs text-nova-cyan hover:underline">{t('heading.view_all')} →</Link>
              </div>

              {/* Priority legend */}
              <div className="flex gap-3 text-xs">
                {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                  <SeverityBadge key={sev} severity={sev} size="sm" />
                ))}
              </div>

              {/* Incident cards */}
              <div className="space-y-3">
                {incidents.slice(0, 5).map((incident) => (
                  <EmergencyCard
                    key={incident.id}
                    incident={incident}
                    variant="feed"
                    href={`/command/incidents`}
                  />
                ))}
              </div>
            </div>

            {/* RIGHT — Side panels */}
            <div className="space-y-4">
              {/* NOVA Copilot */}
              <CopilotMini />

              {/* Risk Overview */}
              <div className="nova-card border border-nova-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-nova-cyan" />
                  <p className="text-xs font-bold text-nova-text">{t('heading.risk_overview')}</p>
                </div>
                <div className="flex justify-around">
                  {riskPredictions.slice(0, 3).map((rp) => (
                    <div key={rp.id} className="text-center">
                      <RiskGauge value={rp.floodRisk} size="sm" />
                      <p className="text-[10px] text-nova-text-muted mt-1">{localize(rp.zone)}</p>
                    </div>
                  ))}
                </div>
                <Link href="/command/prediction" className="block text-center text-xs text-nova-cyan hover:underline mt-3">
                  {t('heading.full_prediction')} →
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Response time trend */}
            <div className="nova-card border border-nova-border rounded-xl p-4 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-nova-cyan" />
                  <p className="text-xs font-bold text-nova-text">{t('stats.avg_response')}</p>
                </div>
                <span className="text-[10px] font-mono text-nova-text-muted">Last 14 days</span>
              </div>
              <div className="h-24 flex items-center justify-center">
                {mounted ? (
                  <LineChart width={400} height={96} data={trendData}>
                    <Tooltip
                      contentStyle={{ background: '#0d1629', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '10px', color: '#e8f0fe' }}
                      formatter={(v: any) => [`${parseFloat(v).toFixed(1)} ${t('common.min')}`, t('stats.avg_response')]}
                    />
                    <Line type="monotone" dataKey="avgTime" stroke="#00d4ff" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : (
                  <div className="text-xs text-nova-text-dim">Loading charts...</div>
                )}
              </div>
            </div>

            {/* Active Deployments Summary */}
            <div className="nova-card border border-nova-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-nova-cyan" />
                  <p className="text-xs font-bold text-nova-text">{t('heading.team_status')}</p>
                </div>
                <span className="text-[10px] font-mono text-nova-text-muted">{rescueTeams.length} {t('common.active')}</span>
              </div>
              <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                {rescueTeams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-1.5 rounded bg-nova-surface/50 border border-nova-border/30 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full', {
                        'bg-green-400': team.status === 'available',
                        'bg-yellow-400': team.status === 'assigned',
                        'bg-orange-400': team.status === 'en_route',
                        'bg-red-400': team.status === 'on_scene',
                        'bg-gray-500': team.status === 'unavailable',
                      })} />
                      <span className="font-semibold text-nova-text">{localize(team.name)}</span>
                    </div>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize', getTeamStatusColor(team.status))}>
                      {statusLabel(team.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    </div>
    </AuthGuard>
  );
}
