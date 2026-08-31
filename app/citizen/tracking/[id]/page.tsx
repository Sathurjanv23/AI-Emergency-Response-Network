'use client';

import { useParams } from 'next/navigation';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { IncidentTimeline } from '@/components/emergency/IncidentTimeline';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, Users, Clock, Phone, ChevronLeft } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { incidents } = useNovaStore();
  const incident = incidents.find((i) => i.id === id) || incidents[0];

  if (!incident) {
    return (
      <div className="min-h-screen bg-nova-bg flex items-center justify-center">
        <p className="text-nova-text-dim">Incident not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="citizen" showTicker={false} />
      <DashboardShell role="citizen">
        <div className="max-w-lg mx-auto p-4 space-y-5">
          {/* Back */}
          <Link href="/citizen" className="flex items-center gap-2 text-xs text-nova-text-muted hover:text-nova-text">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Incident Header */}
          <div className="nova-card border border-nova-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-mono text-nova-text-muted mb-1">{incident.id}</p>
                <h1 className="text-lg font-bold text-nova-text">{incident.title}</h1>
              </div>
              <SeverityBadge severity={incident.severity} pulse={incident.severity === 'critical'} />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-nova-text-dim">
                <MapPin className="w-4 h-4 text-nova-cyan flex-shrink-0" />
                <span>{incident.location.address || incident.location.district}</span>
              </div>
              <div className="flex items-center gap-2 text-nova-text-dim">
                <Users className="w-4 h-4 text-nova-cyan flex-shrink-0" />
                <span>{incident.peopleAffected} people affected</span>
              </div>
              <div className="flex items-center gap-2 text-nova-text-dim">
                <Clock className="w-4 h-4 text-nova-cyan flex-shrink-0" />
                <span>Reported: {formatDateTime(incident.reportedAt)}</span>
              </div>
            </div>
          </div>

          {/* ETA Banner */}
          {incident.status === 'en_route' && incident.eta !== undefined && (
            <motion.div
              className="p-4 rounded-2xl bg-nova-cyan/10 border border-nova-cyan/30 text-center"
              animate={{ opacity: [1, 0.8, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-xs text-nova-text-muted mb-1">Rescue Team En Route</p>
              <p className="text-4xl font-bold font-mono text-nova-cyan">{incident.eta} min</p>
              <p className="text-xs text-nova-text-muted mt-1">Estimated arrival time</p>
              {incident.assignedTeamName && (
                <p className="text-sm text-nova-text mt-2 font-semibold">{incident.assignedTeamName}</p>
              )}
            </motion.div>
          )}

          {/* Timeline */}
          <div className="nova-card border border-nova-border rounded-2xl p-5">
            <h2 className="text-sm font-bold text-nova-text mb-4">Emergency Response Progress</h2>
            <IncidentTimeline
              currentStatus={incident.status}
              updates={incident.updates}
            />
          </div>

          {/* AI Analysis */}
          {incident.aiAnalysis && (
            <div className="nova-card border border-purple-500/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-400 mb-3">🤖 AI Analysis Result</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'Emergency Type', value: incident.aiAnalysis.emergencyType },
                  { label: 'AI Confidence', value: `${incident.aiAnalysis.confidenceScore}%` },
                  { label: 'People Affected', value: incident.aiAnalysis.peopleAffected.toString() },
                  { label: 'Response Time', value: `${incident.aiAnalysis.estimatedResponseTime} min` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-nova-text-muted">{label}</p>
                    <p className="text-sm font-bold text-nova-text capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="p-4 rounded-xl bg-nova-surface border border-nova-border">
            <p className="text-xs font-bold text-nova-text-muted mb-2">Emergency Contacts</p>
            <div className="space-y-2">
              {[
                { label: 'Emergency Hotline', number: '1122' },
                { label: 'Police', number: '119' },
                { label: 'Fire & Rescue', number: '110' },
              ].map(({ label, number }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-nova-text-dim">{label}</span>
                  <a href={`tel:${number}`} className="flex items-center gap-1.5 text-sm font-bold text-nova-cyan hover:underline">
                    <Phone className="w-3 h-3" />
                    {number}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}
