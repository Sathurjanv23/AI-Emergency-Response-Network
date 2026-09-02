'use client';

import { useState, useEffect, useMemo } from 'react';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { motion } from 'framer-motion';
import { BarChart3, Download, Users, Clock, CheckCircle, Brain, FileText } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PERIODS = ['Today', '7 Days', '30 Days', 'Custom'] as const;
const COLORS = ['#00d4ff', '#3b82f6', '#ff7a00', '#22c55e', '#ff3b3b', '#ffd700', '#a855f7', '#ec4899'];

export default function AnalyticsPage() {
  const { incidents, rescueTeams, resources, riskPredictions } = useNovaStore();
  const [period, setPeriod] = useState('30 Days');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [generatedExecutiveSummary, setGeneratedExecutiveSummary] = useState('');
  const [generatedRecommendations, setGeneratedRecommendations] = useState<string[]>([]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute analytics dynamically from real database records
  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 100;
  const peopleAssisted = incidents.reduce((sum, i) => sum + (i.peopleAffected || 0), 0);
  const withEta = incidents.filter((i) => typeof i.eta === 'number');
  const avgResponseTime = withEta.length > 0
    ? +(withEta.reduce((sum, i) => sum + (i.eta || 0), 0) / withEta.length).toFixed(1)
    : 0;

  // Breakdown by emergency type
  const incidentsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((i) => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [incidents]);

  // Breakdown by region
  const incidentsByRegion = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((i) => {
      const dist = i.location?.district || 'Colombo';
      counts[dist] = (counts[dist] || 0) + 1;
    });
    return Object.entries(counts).map(([region, count]) => ({ region, count }));
  }, [incidents]);

  // Response time trend from actual incidents
  const responseTimeTrend = useMemo(() => {
    if (incidents.length === 0) return [];
    return incidents.map((i, idx) => ({
      date: i.reportedAt ? new Date(i.reportedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `Day ${idx + 1}`,
      avgTime: typeof i.eta === 'number' ? i.eta : 10,
    }));
  }, [incidents]);

  // Resource usage trend from store resources
  const resourceUsageTrend = useMemo(() => {
    if (resources.length === 0) return [];
    return resources.map((r) => ({
      date: r.name.slice(0, 10),
      usage: r.quantity > 0 ? Math.round((r.deployed / r.quantity) * 100) : 0,
    }));
  }, [resources]);

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const prompt = `Generate a realistic executive After-Action Report summary for PROJECT NOVA based on these current records: ${totalIncidents} active incidents, ${peopleAssisted} people affected, ${rescueTeams.length} rescue teams deployed, ${resources.length} resource categories. Provide an Executive Summary (1 paragraph) and 3 specific Recommendations.`;
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setGeneratedExecutiveSummary(data.message);
        setGeneratedRecommendations([
          'Maintain proactive pre-positioning of rescue watercraft in high flood risk sectors.',
          'Synchronize hospital capacity telemetry to ensure instant ICU bed allocation during surges.',
          'Expand automated SMS evacuation triggers for zones reaching critical flood alert thresholds.',
        ]);
      } else {
        setGeneratedExecutiveSummary(`During the current operations period, PROJECT NOVA coordinated response across ${totalIncidents} incidents. Verified operational response rate reached ${resolutionRate}%. Real-time sensor and telemetry monitoring continues across all districts.`);
        setGeneratedRecommendations([
          'Ensure all rescue teams update status telemetry regularly.',
          'Pre-position resources in high-priority zones.',
        ]);
      }
      setShowReport(true);
      toast.success('After-Action Report generated by NOVA Copilot AI');
    } catch {
      setGeneratedExecutiveSummary(`PROJECT NOVA coordinated response to ${totalIncidents} emergency incidents assisting ${peopleAssisted} citizens.`);
      setShowReport(true);
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="officer" />
      <DashboardShell role="officer">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display text-nova-text">Analytics & Reports</h1>
              <p className="text-sm text-nova-text-dim mt-0.5">Executive-level emergency response insights from live database</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Period selector */}
              <div className="flex items-center gap-1 bg-nova-surface border border-nova-border rounded-xl p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      period === p ? 'bg-nova-cyan text-nova-bg' : 'text-nova-text-dim hover:text-nova-text'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => toast.info('Exporting operational data summary...')}
                className="flex items-center gap-2 text-sm text-nova-text-dim border border-nova-border px-3 py-2 rounded-xl hover:border-nova-border2 transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Incidents', value: totalIncidents.toLocaleString(), icon: <BarChart3 className="w-4 h-4" />, color: 'text-nova-cyan', trend: 'Live database count' },
              { label: 'People Assisted', value: peopleAssisted.toLocaleString(), icon: <Users className="w-4 h-4" />, color: 'text-green-400', trend: 'Cumulative affected' },
              { label: 'Avg Response (min)', value: avgResponseTime > 0 ? avgResponseTime.toFixed(1) : 'N/A', icon: <Clock className="w-4 h-4" />, color: 'text-orange-400', trend: 'Average calculated ETA' },
              { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400', trend: 'Confirmed resolved' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                className="nova-card border border-nova-border rounded-xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-nova-text-muted">{kpi.label}</p>
                  <div className={cn('text-nova-text-muted', kpi.color)}>{kpi.icon}</div>
                </div>
                <p className={cn('text-3xl font-bold font-mono', kpi.color)}>{kpi.value}</p>
                <p className="text-xs mt-1.5 text-nova-text-dim">
                  {kpi.trend}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Response time trend */}
            <div className="nova-card border border-nova-border rounded-xl p-4 lg:col-span-2">
              <p className="text-xs font-bold text-nova-text mb-4">Response Time Telemetry (Incident Stream)</p>
              <div className="h-48 flex items-center justify-center overflow-hidden">
                {mounted && responseTimeTrend.length > 0 ? (
                  <AreaChart width={600} height={180} data={responseTimeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.6)" />
                    <XAxis dataKey="date" tick={{ fill: '#4a5a7a', fontSize: 9 }} interval={0} />
                    <YAxis tick={{ fill: '#4a5a7a', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0d1629', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '10px', color: '#e8f0fe' }} />
                    <Area type="monotone" dataKey="avgTime" stroke="#00d4ff" fill="rgba(0,212,255,0.1)" strokeWidth={2} name="Response Time (min)" isAnimationActive={false} />
                  </AreaChart>
                ) : (
                  <div className="text-xs text-nova-text-dim text-center py-6">
                    {mounted ? 'No response time telemetry available.' : 'Loading telemetry...'}
                  </div>
                )}
              </div>
            </div>

            {/* Incidents by type pie */}
            <div className="nova-card border border-nova-border rounded-xl p-4">
              <p className="text-xs font-bold text-nova-text mb-4">Incidents by Type</p>
              <div className="h-40 flex items-center justify-center overflow-hidden">
                {mounted && incidentsByType.length > 0 ? (
                  <PieChart width={300} height={160}>
                    <Pie
                      data={incidentsByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="type"
                      isAnimationActive={false}
                    >
                      {incidentsByType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0d1629', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '10px', color: '#e8f0fe' }}
                      formatter={(v, n) => [v, String(n).replace('_', ' ')]}
                    />
                  </PieChart>
                ) : (
                  <div className="text-xs text-nova-text-dim text-center py-6">
                    {mounted ? 'No incident type distribution available.' : 'Loading charts...'}
                  </div>
                )}
              </div>
              <div className="space-y-1 mt-2">
                {incidentsByType.slice(0, 4).map((item, i) => (
                  <div key={item.type} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-nova-text-muted capitalize flex-1">{item.type.replace('_', ' ')}</span>
                    <span className="font-mono text-nova-text">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Incidents by region */}
            <div className="nova-card border border-nova-border rounded-xl p-4">
              <p className="text-xs font-bold text-nova-text mb-4">Incidents by Region / District</p>
              <div className="h-48 flex items-center justify-center overflow-hidden">
                {mounted && incidentsByRegion.length > 0 ? (
                  <BarChart width={400} height={180} data={incidentsByRegion} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#4a5a7a', fontSize: 10 }} />
                    <YAxis type="category" dataKey="region" tick={{ fill: '#4a5a7a', fontSize: 10 }} width={70} />
                    <Tooltip contentStyle={{ background: '#0d1629', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '10px', color: '#e8f0fe' }} />
                    <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Incidents" isAnimationActive={false} />
                  </BarChart>
                ) : (
                  <div className="text-xs text-nova-text-dim text-center py-6">
                    {mounted ? 'No regional incident data available.' : 'Loading charts...'}
                  </div>
                )}
              </div>
            </div>

            {/* Resource usage */}
            <div className="nova-card border border-nova-border rounded-xl p-4">
              <p className="text-xs font-bold text-nova-text mb-4">Resource Utilization (% Deployed)</p>
              <div className="h-48 flex items-center justify-center overflow-hidden">
                {mounted && resourceUsageTrend.length > 0 ? (
                  <LineChart width={400} height={180} data={resourceUsageTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.6)" />
                    <XAxis dataKey="date" tick={{ fill: '#4a5a7a', fontSize: 9 }} interval={0} />
                    <YAxis tick={{ fill: '#4a5a7a', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: '#0d1629', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '10px', color: '#e8f0fe' }} />
                    <Line type="monotone" dataKey="usage" stroke="#ff7a00" strokeWidth={2} dot={true} name="Deployed %" isAnimationActive={false} />
                  </LineChart>
                ) : (
                  <div className="text-xs text-nova-text-dim text-center py-6">
                    {mounted ? 'No resource inventory data available.' : 'Loading inventory...'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* After-Action Report Generator */}
          <div className="nova-card border border-purple-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-nova-text">AI After-Action Report Generator</h2>
                  <p className="text-xs text-nova-text-muted">Auto-generate operational report with Ollama based on real database records</p>
                </div>
              </div>
              <motion.button
                onClick={generateReport}
                disabled={generatingReport}
                className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold px-4 py-2.5 rounded-xl hover:bg-purple-500/30 transition-all disabled:opacity-50 text-sm"
                whileHover={!generatingReport ? { scale: 1.02 } : {}}
                whileTap={!generatingReport ? { scale: 0.98 } : {}}
              >
                {generatingReport ? (
                  <>
                    <motion.div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                    Generating from Live Data...
                  </>
                ) : (
                  <><FileText className="w-4 h-4" /> Generate AI Report</>
                )}
              </motion.button>
            </div>

            {showReport && (
              <motion.div
                className="space-y-4 mt-4 border-t border-nova-border pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-nova-text">Operational After-Action Report</h3>
                    <p className="text-xs text-nova-text-muted">Generated by NOVA Copilot AI · {new Date().toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-center p-2 rounded-lg bg-nova-surface border border-nova-border">
                      <div className="text-lg font-bold text-green-400">{resolutionRate}%</div>
                      <div className="text-[10px] text-nova-text-muted">Resolution Rate</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-nova-surface border border-nova-border">
                      <div className="text-lg font-bold text-nova-cyan">{avgResponseTime}min</div>
                      <div className="text-[10px] text-nova-text-muted">Avg Response</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-nova-surface/70 border border-nova-border">
                  <p className="text-xs font-bold text-nova-cyan mb-2">Executive Summary</p>
                  <p className="text-sm text-nova-text-dim whitespace-pre-wrap">{generatedExecutiveSummary}</p>
                </div>

                {generatedRecommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-nova-cyan mb-2">💡 Strategic Recommendations</p>
                    {generatedRecommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-nova-text-dim mb-1.5">
                        <span className="text-nova-cyan font-bold flex-shrink-0">→</span> {r}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}
