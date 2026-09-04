'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { motion } from 'framer-motion';
import { Truck, Package, HeartPulse, Bell, Users, Clock, Shield, MapPin, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn, formatDateTime, getTeamStatusColor } from '@/lib/utils';
import { toast } from 'sonner';

import { useTranslation } from '@/lib/i18n';

export default function CommandOperationsCatchAll() {
  const params = useParams<{ slug: string[] }>();
  const router = useRouter();
  const slug = params?.slug?.[0] || '';
  const { t, localize, statusLabel, timeAgo } = useTranslation();

  const { rescueTeams, resources, hospitals, alerts, loading, errors, updateTeam, updateResource, updateHospital } = useNovaStore();

  const [filterTerm, setFilterTerm] = useState('');

  const operationalKey = slug === 'rescue' ? 'teams' : slug === 'resources' ? 'resources' : slug === 'hospitals' ? 'hospitals' : slug === 'alerts' ? 'alerts' : null;
  const operationalLoading = operationalKey ? loading[operationalKey] : false;
  const operationalError = operationalKey ? errors[operationalKey] : null;

  if (operationalLoading) {
    return <div className="min-h-screen bg-nova-bg"><TopNav role="officer" /><DashboardShell role="officer"><div className="p-12 text-center text-nova-text-muted">Loading operational data...</div></DashboardShell></div>;
  }

  if (operationalError) {
    return <div className="min-h-screen bg-nova-bg"><TopNav role="officer" /><DashboardShell role="officer"><div className="p-12 text-center"><AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" /><h2 className="text-base font-bold text-nova-text">Unable to load operational data</h2><p className="text-xs text-red-300 mt-2">{operationalError}</p></div></DashboardShell></div>;
  }

  // ─── Render Panels based on slug ─────────────────────────────

  // 1. RESCUE OPERATIONS
  const renderRescueOps = () => {
    const filteredTeams = rescueTeams.filter(t => t.name.toLowerCase().includes(filterTerm.toLowerCase()));
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
            <Truck className="w-5 h-5 text-nova-cyan" /> {t('heading.rescue_deployments')}
          </h2>
          <span className="text-xs text-nova-text-muted">{rescueTeams.length} {t('common.active')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeams.map((team) => (
            <div key={team.id} className="nova-card border border-nova-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-nova-text">{localize(team.name)}</p>
                  <p className="text-xs text-nova-text-dim mt-0.5">{localize(team.district)} · {team.capabilities.join(', ')}</p>
                </div>
                <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase', {
                  'bg-green-500/10 border-green-500/30 text-green-400': team.status === 'available',
                  'bg-yellow-500/10 border-yellow-500/30 text-yellow-400': team.status === 'assigned',
                  'bg-orange-500/10 border-orange-500/30 text-orange-400': team.status === 'en_route',
                  'bg-red-500/10 border-red-500/30 text-red-400': team.status === 'on_scene',
                })}>
                  {statusLabel(team.status)}
                </span>
              </div>
              <div className="text-xs text-nova-text-muted flex justify-between pt-2.5 border-t border-nova-border/50">
                <span>{t('common.eta')}: {team.eta !== undefined ? `${team.eta}${t('common.min')}` : 'N/A'}</span>
                <span>Incident: {team.currentIncident || 'None'}</span>
              </div>
            </div>
          ))}
          {filteredTeams.length === 0 && <p className="text-sm text-nova-text-muted py-8 text-center">No rescue deployments returned by the backend.</p>}
        </div>
      </div>
    );
  };

  // 2. RESOURCE MANAGEMENT
  const renderResources = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
            <Package className="w-5 h-5 text-nova-cyan" /> {t('heading.resources_inventory')}
          </h2>
          <span className="text-xs text-nova-text-muted">{resources.length} {t('nav.resources')}</span>
        </div>
        <div className="nova-card border border-nova-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-nova-border bg-nova-surface/40 text-[10px] font-bold text-nova-text-muted uppercase tracking-wider">
                  <th className="p-4">{t('nav.resources')}</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">{t('status.available')}</th>
                  <th className="p-4">{t('stats.status')}</th>
                  <th className="p-4">Low Stock Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nova-border/50 text-sm">
                {resources.map((res) => (
                  <tr key={res.id} className="hover:bg-nova-surface/10 transition-colors">
                    <td className="p-4 font-semibold text-nova-text">{localize(res.name)}</td>
                    <td className="p-4 text-xs text-nova-text-muted capitalize">{res.category}</td>
                    <td className="p-4 font-mono text-nova-text">{res.available} {res.unit}</td>
                    <td className="p-4">
                      <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', {
                        'bg-green-500/10 border-green-500/30 text-green-400': res.status === 'available',
                        'bg-orange-500/10 border-orange-500/30 text-orange-400': res.status === 'low_stock',
                        'bg-red-500/10 border-red-500/30 text-red-400': res.status === 'critical_stock',
                      })}>
                        {statusLabel(res.status)}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-nova-text-muted">{res.lowStockThreshold} {res.unit}</td>
                  </tr>
                ))}
                {resources.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-nova-text-muted">No resources returned by the backend.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 3. HOSPITALS CAPACITY
  const renderHospitals = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-nova-cyan" /> {t('heading.hospital_capacity')}
          </h2>
          <span className="text-xs text-nova-text-muted">{hospitals.length} {t('nav.hospitals')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hospitals.map((hosp) => {
            const occupiedPercent = Math.round(((hosp.totalBeds - hosp.availableBeds) / hosp.totalBeds) * 100);
            return (
              <div key={hosp.id} className="nova-card border border-nova-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-nova-text">{localize(hosp.name)}</p>
                    <p className="text-xs text-nova-text-muted mt-0.5">{localize(hosp.district)}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', {
                    'bg-red-500/10 border-red-500/30 text-red-400': hosp.availableBeds < 30,
                    'bg-green-500/10 border-green-500/30 text-green-400': hosp.availableBeds >= 30,
                  })}>
                    {hosp.availableBeds} {t('stats.available_beds')}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-nova-text-muted">
                    <span>Bed Occupancy</span>
                    <span>{occupiedPercent}% ({hosp.totalBeds - hosp.availableBeds}/{hosp.totalBeds})</span>
                  </div>
                  <div className="h-2 bg-nova-border rounded-full overflow-hidden">
                    <div className={cn('h-full', occupiedPercent > 90 ? 'bg-red-500' : 'bg-nova-cyan')} style={{ width: `${occupiedPercent}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs pt-2.5 border-t border-nova-border/50 text-nova-text-muted">
                  <span>{t('stats.icu_available')}: <strong className="text-nova-text">{hosp.icuAvailable}/{hosp.icuTotal}</strong></span>
                  <span>Ambulance Status: <strong className="text-nova-text">{t('common.ready')}</strong></span>
                </div>
              </div>
            );
          })}
          {hospitals.length === 0 && <p className="text-sm text-nova-text-muted py-8 text-center">No hospitals returned by the backend.</p>}
        </div>
      </div>
    );
  };

  // 4. LIVE ALERTS
  const renderAlerts = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
            <Bell className="w-5 h-5 text-nova-cyan" /> {t('heading.alert_logs')}
          </h2>
          <span className="text-xs text-nova-text-muted">{alerts.length} {t('nav.alerts')}</span>
        </div>
        <div className="nova-card border border-nova-border rounded-xl p-3 divide-y divide-nova-border/50">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-3 flex items-start gap-3 hover:bg-nova-surface/10 transition-colors">
              <span className="text-lg mt-0.5">
                {alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : '🟡'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-nova-text">{localize(alert.title || alert.type)}</p>
                <p className="text-xs text-nova-text-dim mt-0.5">{localize(alert.message)}</p>
                <p className="text-[10px] text-nova-text-muted mt-1">{timeAgo(alert.timestamp)}</p>
              </div>
            </div>
          ))}
          {alerts.length === 0 && <p className="p-8 text-center text-sm text-nova-text-muted">No live alerts returned by the backend.</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="officer" />
      <DashboardShell role="officer">
        <div className="p-6 space-y-6">
          {slug === 'rescue' && renderRescueOps()}
          {slug === 'resources' && renderResources()}
          {slug === 'hospitals' && renderHospitals()}
          {slug === 'alerts' && renderAlerts()}
          {!['rescue', 'resources', 'hospitals', 'alerts'].includes(slug) && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-nova-cyan mx-auto mb-3" />
              <p className="text-lg font-bold text-nova-text">Operational View Not Found</p>
              <p className="text-sm text-nova-text-muted mt-1">This module is under development or has been relocated.</p>
              <button onClick={() => router.push('/command')} className="mt-4 px-4 py-2 bg-nova-cyan text-nova-bg font-bold rounded-lg hover:bg-nova-cyan-dim transition-colors text-sm">
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </DashboardShell>
    </div>
  );
}
