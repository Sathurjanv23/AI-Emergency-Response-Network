'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { motion } from 'framer-motion';
import { AlertTriangle, ClipboardList, ShieldAlert, Send, Clock, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function CitizenOperationsCatchAll() {
  const params = useParams<{ slug: string[] }>();
  const router = useRouter();
  const slug = params?.slug?.[0] || '';
  const { t } = useTranslation();

  const { incidents, addIncident } = useNovaStore();
  const citizenReports = incidents.filter(i => i.reporterName === 'Amal Perera');

  // Form State for Report Emergency
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('flood');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !address) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));

    const newId = `NOV-${1000 + incidents.length + 1}`;
    addIncident({
      id: newId,
      title,
      description,
      type: type as any,
      severity: 'medium',
      status: 'reported',
      location: { lat: 6.9271, lng: 79.8612, address, district: 'Colombo' },
      reportedAt: new Date().toISOString(),
      reporterName: 'Amal Perera',
      reporterPhone: phone || '+94771234567',
      peopleAffected: 1,
      updates: [{ id: `upd-${Date.now()}`, status: 'reported', message: 'Citizen report filed via portal.', updatedBy: 'Amal Perera', updatedAt: new Date().toISOString() }],
    });

    setSubmitting(false);
    toast.success('distress report submitted successfully. AI is triaging...');
    router.push('/citizen/reports');
  };

  // 1. REPORT EMERGENCY DISTRESS FORM
  const renderReportForm = () => {
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h2 className="text-lg font-bold text-nova-text">{t('heading.distress_form')}</h2>
        </div>
        <form onSubmit={handleReportSubmit} className="nova-card border border-nova-border rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-1.5">Emergency Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-nova-surface border border-nova-border rounded-xl px-3 py-2.5 text-sm text-nova-text focus:outline-none focus:border-nova-cyan/40"
            >
              <option value="flood">Flood / Rising Water</option>
              <option value="landslide">Landslide / Mudflow</option>
              <option value="fire">Fire Incident</option>
              <option value="road_accident">Road Accident</option>
              <option value="medical">Medical Emergency</option>
              <option value="missing_person">Missing Person</option>
              <option value="building_collapse">Building Collapse</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-1.5">Short Title</label>
            <input
              type="text"
              placeholder="e.g. Water flooded into first floor of residence"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-nova-surface border border-nova-border rounded-xl px-3 py-2.5 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan/40"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-1.5">Full Details</label>
            <textarea
              rows={4}
              placeholder="Provide details about trapped people, medical needs, or direct hazards..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-nova-surface border border-nova-border rounded-xl px-3 py-2.5 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan/40"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-1.5">Location Address</label>
            <input
              type="text"
              placeholder="Provide exact street address, house number or landmark..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-nova-surface border border-nova-border rounded-xl px-3 py-2.5 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan/40"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-1.5">Contact Phone</label>
            <input
              type="tel"
              placeholder="+94771234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-nova-surface border border-nova-border rounded-xl px-3 py-2.5 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan/40"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 bg-red-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {submitting ? 'Submitting Report...' : 'File Emergency Report'}
          </button>
        </form>
      </div>
    );
  };

  // 2. MY SUBMITTED REPORTS
  const renderMyReports = () => {
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-nova-cyan" /> {t('heading.my_reports')}
        </h2>
        {citizenReports.length > 0 ? (
          <div className="space-y-3">
            {citizenReports.map((rep) => (
              <div key={rep.id} className="nova-card border border-nova-border rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-nova-text-muted">{rep.id}</span>
                    <p className="text-sm font-bold text-nova-text mt-0.5">{rep.title}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase', {
                    'bg-green-500/10 border-green-500/30 text-green-400': rep.status === 'resolved',
                    'bg-yellow-500/10 border-yellow-500/30 text-yellow-400': rep.status === 'assigned' || rep.status === 'en_route',
                    'bg-nova-surface border-nova-border text-nova-text-muted': rep.status === 'reported',
                  })}>
                    {rep.status}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-nova-border/50 text-[10px] text-nova-text-muted">
                  <span>Filed: {formatDateTime(rep.reportedAt).split(',')[1]}</span>
                  {rep.status !== 'reported' && (
                    <button onClick={() => router.push(`/citizen/tracking/${rep.id}`)} className="text-nova-cyan hover:underline flex items-center gap-0.5">
                      Track Dispatch <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="nova-card border border-nova-border rounded-xl p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-nova-text-muted mx-auto mb-3" />
            <p className="text-base font-bold text-nova-text">No active reports</p>
            <p className="text-xs text-nova-text-muted mt-1">You haven't submitted any emergency reports.</p>
          </div>
        )}
      </div>
    );
  };

  // 3. SAFETY GUIDE
  const renderSafetyGuide = () => {
    const tips = [
      { category: '🌧️ Storms & Monsoon', text: 'Stay indoors, disconnect all electric systems, do not walk or drive through flooded areas, and stay clear of downed power cables.' },
      { category: '🌋 Landslides risk', text: 'If located in steep hillside districts, look out for ground crackings, tilting tree lines, or sudden trickling of soil. Evacuate pre-emptively.' },
      { category: '🏥 Medical Care', text: 'Keep emergency supplies ready, store clean drinking water, prepare a first-aid kit, and locate your closest local shelter zone.' },
    ];
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <h2 className="text-lg font-bold text-nova-text flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-nova-cyan" /> {t('heading.safety_guidelines')}
        </h2>
        <div className="space-y-3">
          {tips.map((tip, idx) => (
            <div key={idx} className="nova-card border border-nova-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-nova-cyan">{tip.category}</p>
              <p className="text-xs text-nova-text-dim leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="citizen" />
      <DashboardShell role="citizen">
        <div className="p-6 space-y-6">
          {slug === 'report' && renderReportForm()}
          {slug === 'reports' && renderMyReports()}
          {slug === 'safety' && renderSafetyGuide()}
        </div>
      </DashboardShell>
    </div>
  );
}
