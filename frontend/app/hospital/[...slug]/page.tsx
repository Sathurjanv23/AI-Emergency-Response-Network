'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { motion } from 'framer-motion';
import { HeartPulse, Bed, Truck, ClipboardList, AlertTriangle, CheckCircle, Clock, Plus, Minus } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function HospitalOperationsCatchAll() {
  const params = useParams<{ slug: string[] }>();
  const router = useRouter();
  const slug = params?.slug?.[0] || '';
  const { t, localize, statusLabel } = useTranslation();

  const { hospitals, updateHospital } = useNovaStore();
  const myHospital = hospitals.find((h) => h.id === 'h001') || hospitals[0];

  const [triageFilter, setTriageFilter] = useState<'all' | 'critical' | 'high'>('all');

  const updateBeds = (delta: number) => {
    const newAvailable = Math.max(0, Math.min(myHospital.totalBeds, myHospital.availableBeds + delta));
    updateHospital(myHospital.id, { availableBeds: newAvailable });
    toast.success(`Bed availability updated: ${newAvailable} ${t('status.available')}`);
  };

  const updateICU = (delta: number) => {
    const newAvailable = Math.max(0, Math.min(myHospital.icuTotal, myHospital.icuAvailable + delta));
    updateHospital(myHospital.id, { icuAvailable: newAvailable });
    toast.success(`ICU availability updated: ${newAvailable} ${t('status.available')}`);
  };

  // 1. INCOMING EMERGENCIES PANEL
  const renderEmergencies = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" /> {t('heading.incoming_emergencies')}
        </h2>
        <div className="space-y-3">
          {myHospital.incomingCases.map((ic) => (
            <div key={ic.id} className="nova-card border border-nova-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-nova-text-muted">{ic.incidentId}</span>
                <p className="text-sm font-bold text-nova-text mt-0.5">{localize(ic.condition)}</p>
                <p className="text-xs text-nova-text-muted mt-1">Specialties: {ic.requiredCare.join(', ')}</p>
              </div>
              <div className="flex items-center gap-3">
                <SeverityBadge severity={ic.severity} size="sm" pulse={ic.severity === 'critical'} />
                <div className="text-right">
                  <p className="text-xs text-nova-text-muted">{t('common.eta')}</p>
                  <p className="text-sm font-bold text-nova-high">{ic.eta} {t('common.min')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 2. TRIAGE QUEUE PANEL
  const renderTriage = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-nova-cyan" /> {t('heading.triage_queue')}
        </h2>
        <div className="nova-card border border-nova-border rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-nova-border bg-nova-surface/40 text-[10px] font-bold text-nova-text-muted uppercase tracking-wider">
                <th className="p-4">Patient Code</th>
                <th className="p-4">{t('stats.status')}</th>
                <th className="p-4">Medical Condition</th>
                <th className="p-4">{t('heading.triage_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nova-border/50 text-sm text-nova-text">
              {myHospital.incomingCases.map((ic, i) => (
                <tr key={ic.id} className="hover:bg-nova-surface/10 transition-colors">
                  <td className="p-4 font-mono text-nova-cyan">PT-{1024 + i}</td>
                  <td className="p-4"><SeverityBadge severity={ic.severity} size="sm" /></td>
                  <td className="p-4">{localize(ic.condition)}</td>
                  <td className="p-4 text-xs text-nova-high font-bold">Priority {i + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 3. CAPACITY CONTROL PANEL
  const renderCapacity = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <Bed className="w-5 h-5 text-nova-cyan" /> {t('heading.ward_capacity')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="nova-card border border-nova-border rounded-xl p-5 space-y-4">
            <div>
              <p className="text-sm font-bold text-nova-text">{t('stats.available_beds')}</p>
              <p className="text-xs text-nova-text-muted mt-0.5">Directly controls available emergency beds</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold font-mono text-nova-text">{myHospital.availableBeds}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateBeds(-1)} className="w-10 h-10 bg-nova-surface border border-nova-border rounded-lg text-nova-text hover:bg-nova-surface2 transition-colors flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                <button onClick={() => updateBeds(1)} className="w-10 h-10 bg-nova-surface border border-nova-border rounded-lg text-nova-text hover:bg-nova-surface2 transition-colors flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          <div className="nova-card border border-nova-border rounded-xl p-5 space-y-4">
            <div>
              <p className="text-sm font-bold text-nova-text">{t('stats.icu_available')}</p>
              <p className="text-xs text-nova-text-muted mt-0.5">Critical care patient ventilators count</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold font-mono text-nova-text">{myHospital.icuAvailable}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateICU(-1)} className="w-10 h-10 bg-nova-surface border border-nova-border rounded-lg text-nova-text hover:bg-nova-surface2 transition-colors flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                <button onClick={() => updateICU(1)} className="w-10 h-10 bg-nova-surface border border-nova-border rounded-lg text-nova-text hover:bg-nova-surface2 transition-colors flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. AMBULANCE LOG PANEL
  const renderAmbulances = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <Truck className="w-5 h-5 text-nova-cyan" /> {t('heading.ambulance_fleet')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myHospital.ambulances.map((amb) => (
            <div key={amb.id} className="nova-card border border-nova-border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-nova-text">{amb.code}</p>
                <p className="text-xs text-nova-text-muted mt-0.5">Location tracking enabled</p>
                {amb.assignedCase && <p className="text-[10px] text-nova-cyan mt-1">→ Case: {amb.assignedCase}</p>}
              </div>
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase', {
                'bg-green-500/10 border-green-500/20 text-green-400': amb.status === 'available',
                'bg-orange-500/10 border-orange-500/20 text-orange-400': amb.status === 'dispatched',
              })}>
                {statusLabel(amb.status)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="hospital" />
      <DashboardShell role="hospital">
        <div className="p-6 space-y-6">
          {slug === 'emergencies' && renderEmergencies()}
          {slug === 'triage' && renderTriage()}
          {slug === 'capacity' && renderCapacity()}
          {slug === 'ambulances' && renderAmbulances()}
        </div>
      </DashboardShell>
    </div>
  );
}
