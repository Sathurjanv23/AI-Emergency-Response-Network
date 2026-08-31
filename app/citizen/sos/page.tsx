'use client';

import { useState } from 'react';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { motion } from 'framer-motion';
import { Radio, Camera, Mic, MapPin, ChevronRight, AlertTriangle, Brain, CheckCircle } from 'lucide-react';
import { cn, getEmergencyTypeIcon } from '@/lib/utils';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { EmergencyType } from '@/types';

const EMERGENCY_TYPES: { type: EmergencyType; label: string; icon: string }[] = [
  { type: 'flood', label: 'Flood', icon: '🌊' },
  { type: 'landslide', label: 'Landslide', icon: '⛰️' },
  { type: 'fire', label: 'Fire', icon: '🔥' },
  { type: 'road_accident', label: 'Road Accident', icon: '🚗' },
  { type: 'medical', label: 'Medical Emergency', icon: '🏥' },
  { type: 'missing_person', label: 'Missing Person', icon: '👤' },
  { type: 'building_collapse', label: 'Building Collapse', icon: '🏚️' },
  { type: 'severe_weather', label: 'Severe Weather', icon: '🌪️' },
  { type: 'other', label: 'Other', icon: '⚠️' },
];

const TRANSLATIONS = {
  en: { title: 'Report Emergency', sos: 'SOS', placeholder: 'Describe what is happening...', submit: 'Submit Emergency Report', aiPreview: 'AI Pre-Analysis', sending: 'Sending...' },
  ta: { title: 'அவசர தகவல் தெரிவிக்க', sos: 'SOS', placeholder: 'என்ன நடக்கிறது என்று விவரிக்கவும்...', submit: 'அவசர அறிக்கை சமர்ப்பிக்கவும்', aiPreview: 'AI முன் பகுப்பாய்வு', sending: 'அனுப்புகிறது...' },
  si: { title: 'හදිසි තත්ත්වය වාර්තා කරන්න', sos: 'SOS', placeholder: 'සිදු වන්නේ කුමක්දැයි විස්තර කරන්න...', submit: 'හදිසි වාර්තාව ඉදිරිපත් කරන්න', aiPreview: 'AI පූර්ව විශ්ලේෂණය', sending: 'යවමින්...' },
};

export default function SOSPage() {
  const { language, addIncident, addNotification } = useNovaStore();
  const router = useRouter();
  const t = TRANSLATIONS[language];

  const [selectedType, setSelectedType] = useState<EmergencyType>('flood');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'form' | 'ai_preview' | 'submitted'>('form');
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  const detectLocation = () => {
    setLocationDetected(true);
    toast.success('GPS location detected — Kaduwela, Zone 04');
  };

  const runAIPreview = async () => {
    if (!description && selectedType) {
      setDescription(`Emergency: ${selectedType.replace('_', ' ')}. Need immediate assistance.`);
    }
    setStep('ai_preview');
  };

  const submitEmergency = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));

    const newIncident = {
      id: `NOV-${1043 + Math.floor(Math.random() * 100)}`,
      type: selectedType,
      severity: 'critical' as const,
      status: 'reported' as const,
      title: description.slice(0, 60) || `${selectedType} emergency reported`,
      description,
      location: {
        lat: 6.9271 + (Math.random() - 0.5) * 0.1,
        lng: 79.9817 + (Math.random() - 0.5) * 0.1,
        address: 'Kaduwela, Zone 04',
        district: 'Colombo',
        zone: 'Zone 04',
      },
      reportedBy: 'citizen-001',
      reporterName: 'You',
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      peopleAffected: 3,
      notes: [],
      attachments: [],
      updates: [{ id: 'upd-new', status: 'reported' as const, message: 'Emergency report received.', updatedBy: 'System', updatedAt: new Date().toISOString() }],
      resourcesAllocated: [],
      priority: 1,
    };

    addIncident(newIncident);
    addNotification({
      id: `notif-new-${Date.now()}`,
      type: 'critical_incident',
      title: '🔴 New Emergency Report Submitted',
      message: `Your ${selectedType} emergency report has been received and is being analyzed by AI.`,
      severity: 'critical',
      read: false,
      createdAt: new Date().toISOString(),
      relatedId: newIncident.id,
      relatedType: 'incident',
    });

    setSubmitting(false);
    setStep('submitted');
  };

  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-nova-bg flex items-center justify-center p-4">
        <motion.div
          className="max-w-sm w-full text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CheckCircle className="w-12 h-12 text-green-400" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-nova-text">Emergency Reported</h2>
            <p className="text-nova-text-dim mt-2">Your emergency has been received. AI is analyzing your report now.</p>
          </div>
          <div className="nova-glass border border-nova-border/50 rounded-2xl p-4 text-left space-y-2">
            <p className="text-xs text-nova-text-muted">WHAT HAPPENS NEXT</p>
            {['AI analyzing your report (<5 seconds)', 'Priority assigned automatically', 'Nearest rescue team identified', 'Team dispatched to your location'].map((step, i) => (
              <div key={step} className="flex items-center gap-2 text-sm text-nova-text-dim">
                <div className="w-5 h-5 rounded-full bg-nova-cyan/20 border border-nova-cyan/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-nova-cyan">{i + 1}</span>
                </div>
                {step}
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/citizen/tracking/NOV-1042')}
            className="w-full bg-nova-cyan text-nova-bg font-bold py-3 rounded-xl hover:bg-nova-cyan-dim transition-all"
          >
            Track My Emergency →
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === 'ai_preview') {
    return (
      <div className="min-h-screen bg-nova-bg p-4 flex items-center justify-center">
        <div className="max-w-sm w-full space-y-4">
          <div className="text-center">
            <Brain className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-nova-text">{t.aiPreview}</h2>
            <p className="text-sm text-nova-text-dim">AI detected the following from your report</p>
          </div>

          <div className="nova-card border border-purple-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-nova-text-muted">Emergency Type</span>
              <span className="text-sm font-bold text-nova-text">{getEmergencyTypeIcon(selectedType)} {selectedType.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-nova-text-muted">Severity</span>
              <SeverityBadge severity="critical" pulse />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-nova-text-muted">People Affected</span>
              <span className="text-sm font-bold text-nova-text">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-nova-text-muted">Vulnerable Person</span>
              <span className="text-sm font-bold text-orange-400">Elderly</span>
            </div>
            <div className="border-t border-nova-border pt-3">
              <p className="text-xs text-nova-text-muted mb-1">AI Recommendation</p>
              <p className="text-sm text-nova-cyan font-medium">Immediate rescue required. Deploy nearest water rescue team.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('form')} className="flex-1 py-3 border border-nova-border text-nova-text-dim rounded-xl hover:border-nova-border2 transition-all font-semibold">
              Edit Report
            </button>
            <motion.button
              onClick={submitEmergency}
              disabled={submitting}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              whileTap={{ scale: 0.98 }}
            >
              {submitting ? (
                <><motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity }} />{t.sending}</>
              ) : (
                <>{t.submit}</>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="citizen" showTicker={false} />
      <DashboardShell role="citizen">
        <div className="max-w-lg mx-auto p-4 space-y-5">
          {/* SOS Button */}
          <div className="text-center py-6">
            <motion.div
              className="relative w-28 h-28 mx-auto cursor-pointer"
              onClick={() => setSelectedType('flood')}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-500/30"
                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border border-red-500/50"
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
              <div className="absolute inset-4 rounded-full bg-red-500 flex items-center justify-center shadow-nova-critical">
                <span className="text-white font-black text-2xl tracking-widest">{t.sos}</span>
              </div>
            </motion.div>
            <h1 className="text-xl font-bold text-nova-text mt-4">{t.title}</h1>
          </div>

          {/* Emergency Type Selection */}
          <div>
            <p className="text-xs font-semibold text-nova-text-muted uppercase tracking-wider mb-3">Emergency Type</p>
            <div className="grid grid-cols-3 gap-2">
              {EMERGENCY_TYPES.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                    selectedType === type
                      ? 'border-nova-cyan bg-nova-cyan/10 text-nova-text'
                      : 'border-nova-border text-nova-text-dim hover:border-nova-border2'
                  )}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-nova-text-muted uppercase tracking-wider mb-2">Describe the Emergency</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-nova-surface border border-nova-border rounded-xl px-4 py-3 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan/40 resize-none"
              placeholder={t.placeholder}
            />
          </div>

          {/* Media Inputs */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setRecording(!recording); if (!recording) toast.info('Recording voice...'); }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                recording ? 'border-red-500/50 bg-red-500/10' : 'border-nova-border hover:border-nova-border2'
              )}
            >
              <motion.div
                animate={recording ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Mic className={cn('w-6 h-6', recording ? 'text-red-400' : 'text-nova-text-dim')} />
              </motion.div>
              <span className="text-xs text-nova-text-muted">{recording ? 'Recording...' : 'Voice'}</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-nova-border hover:border-nova-border2 transition-all">
              <Camera className="w-6 h-6 text-nova-text-dim" />
              <span className="text-xs text-nova-text-muted">Camera</span>
            </button>
            <button
              onClick={detectLocation}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                locationDetected ? 'border-green-500/50 bg-green-500/10' : 'border-nova-border hover:border-nova-border2'
              )}
            >
              <MapPin className={cn('w-6 h-6', locationDetected ? 'text-green-400' : 'text-nova-text-dim')} />
              <span className="text-xs text-nova-text-muted">{locationDetected ? 'Located ✓' : 'GPS'}</span>
            </button>
          </div>

          {/* Submit */}
          <motion.button
            onClick={runAIPreview}
            className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-nova-critical text-base"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <AlertTriangle className="w-5 h-5" />
            {t.submit}
            <ChevronRight className="w-5 h-5" />
          </motion.button>

          <p className="text-center text-xs text-nova-text-muted">
            Your report is processed by AI and sent to emergency authorities immediately.
          </p>
        </div>
      </DashboardShell>
    </div>
  );
}
