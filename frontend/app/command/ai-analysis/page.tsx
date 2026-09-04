'use client';

import { useState } from 'react';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Cpu, Mic, Image as ImageIcon, FileText, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { SeverityBadge } from '@/components/emergency/SeverityBadge';
import type { AIAnalysis } from '@/types';
import { getEmergencyTypeIcon } from '@/lib/utils';

// ─── AI Processing Animation ─────────────────────────────────

function AIProcessingAnimation({ stage }: { stage: string }) {
  const stages = [
    { id: 'language', label: 'Language Detection', icon: '🌐' },
    { id: 'speech', label: 'Speech-to-Text', icon: '🎙️' },
    { id: 'image', label: 'Image Understanding', icon: '👁️' },
    { id: 'classify', label: 'Emergency Classification', icon: '📋' },
    { id: 'severity', label: 'Severity Analysis', icon: '⚡' },
    { id: 'vulnerability', label: 'Vulnerability Detection', icon: '🛡️' },
    { id: 'location', label: 'Location Analysis', icon: '📍' },
  ];

  const currentIdx = stages.findIndex((s) => s.id === stage);

  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <motion.div
          key={s.id}
          className="flex items-center gap-3 p-2.5 rounded-lg"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
            i < currentIdx ? 'bg-nova-low/20 border border-nova-low' :
            i === currentIdx ? 'bg-nova-cyan/20 border border-nova-cyan' :
            'bg-nova-border border border-nova-border'
          }`}>
            {i < currentIdx ? (
              <CheckCircle className="w-3.5 h-3.5 text-nova-low" />
            ) : i === currentIdx ? (
              <motion.div
                className="w-2 h-2 rounded-full bg-nova-cyan"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            ) : (
              <span className="text-nova-text-muted">{i + 1}</span>
            )}
          </div>
          <span className={`text-xs ${i <= currentIdx ? 'text-nova-text' : 'text-nova-text-muted'}`}>
            {s.icon} {s.label}
          </span>
          {i === currentIdx && (
            <div className="ml-auto typing-dots">
              <span /><span /><span />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Analysis Result Card ─────────────────────────────────────

function AnalysisResult({ analysis }: { analysis: AIAnalysis }) {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main result */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getEmergencyTypeIcon(analysis.emergencyType)}</span>
              <span className="text-lg font-bold text-nova-text capitalize">{analysis.emergencyType.replace('_', ' ')}</span>
            </div>
            <SeverityBadge severity={analysis.severity} pulse size="lg" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-nova-cyan">{analysis.confidenceScore}%</div>
            <div className="text-xs text-nova-text-muted">Confidence</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-nova-surface/70 border border-nova-border">
            <p className="text-xs text-nova-text-muted mb-1">People Affected</p>
            <p className="text-xl font-bold text-nova-text">{analysis.peopleAffected}</p>
          </div>
          <div className="p-3 rounded-xl bg-nova-surface/70 border border-nova-border">
            <p className="text-xs text-nova-text-muted mb-1">Vulnerable Persons</p>
            <div className="space-y-0.5">
              {analysis.vulnerablePersons.map((vp) => (
                <p key={vp.type} className="text-sm font-bold text-orange-400">{vp.count} {vp.type}</p>
              ))}
              {analysis.vulnerablePersons.length === 0 && <p className="text-sm text-nova-text-dim">None detected</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Required Resources */}
      <div className="nova-card border border-nova-border rounded-xl p-4">
        <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">Required Resources</p>
        <div className="space-y-2">
          {analysis.requiredResources.map((res, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-nova-surface/50 border border-nova-border/50">
              <span className="text-sm text-nova-text">{res.quantity}× {res.type}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                res.priority === 'immediate' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                res.priority === 'urgent' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                'bg-nova-cyan/10 text-nova-cyan border border-nova-cyan/20'
              }`}>
                {res.priority.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Factors */}
      {analysis.riskFactors.length > 0 && (
        <div className="nova-card border border-nova-border rounded-xl p-4">
          <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">Risk Factors</p>
          <div className="flex flex-wrap gap-2">
            {analysis.riskFactors.map((factor) => (
              <span key={factor} className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-300 px-2 py-1 rounded-full">
                ⚠️ {factor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendation */}
      <div className="p-4 rounded-xl bg-nova-cyan/5 border border-nova-cyan/20">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-nova-cyan" />
          <p className="text-xs font-bold text-nova-cyan">AI Recommendation</p>
        </div>
        <p className="text-sm text-nova-text font-medium">"{analysis.recommendedAction}"</p>
        <p className="text-xs text-nova-text-muted mt-2">Est. Response Time: {analysis.estimatedResponseTime} minutes</p>
      </div>
    </motion.div>
  );
}

// ─── Main AI Analysis Page ───────────────────────────────────

export default function AIAnalysisPage() {
  const { incidents } = useNovaStore();
  const [inputText, setInputText] = useState('House surrounded by flood water. Elderly father cannot walk. 3 children at home.');
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'image'>('text');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [result, setResult] = useState<AIAnalysis | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('NOV-1042');

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setResult(null);

    const stages = ['language', 'speech', 'image', 'classify', 'severity', 'vulnerability', 'location'];
    for (const stage of stages) {
      setAnalysisStage(stage);
      await new Promise((r) => setTimeout(r, 400));
    }

    // Dynamic intelligent analysis derived from input text or selected incident
    if (selectedIncident?.aiAnalysis) {
      setResult(selectedIncident.aiAnalysis);
    } else {
      const lower = inputText.toLowerCase();
      const isFlood = lower.includes('flood') || lower.includes('water') || lower.includes('river');
      const isFire = lower.includes('fire') || lower.includes('smoke') || lower.includes('burn');
      const isLandslide = lower.includes('landslide') || lower.includes('mud') || lower.includes('slope');
      const isMedical = lower.includes('heart') || lower.includes('bleed') || lower.includes('injured') || lower.includes('unconscious');

      const type = isFlood ? 'flood' : isFire ? 'fire' : isLandslide ? 'landslide' : isMedical ? 'medical' : 'other';
      const hasElderly = lower.includes('elderly') || lower.includes('old') || lower.includes('father') || lower.includes('mother');
      const hasChild = lower.includes('child') || lower.includes('baby') || lower.includes('children');
      const isCritical = hasElderly || hasChild || lower.includes('trapped') || lower.includes('cannot walk') || lower.includes('urgent');

      const vulnerable = [];
      if (hasElderly) vulnerable.push({ type: 'elderly' as const, count: 1 });
      if (hasChild) vulnerable.push({ type: 'child' as const, count: 2 });

      setResult({
        id: `analysis-${Date.now()}`,
        incidentId: selectedIncident?.id || 'DIRECT-REPORT',
        emergencyType: type as any,
        severity: isCritical ? 'critical' : 'high',
        confidenceScore: 88,
        peopleAffected: (hasElderly ? 1 : 0) + (hasChild ? 2 : 1),
        vulnerablePersons: vulnerable,
        requiredResources: [
          { type: isFlood ? 'Rescue Boat' : 'First Aid Unit', quantity: 1, priority: 'immediate' },
          { type: 'Medical Response Team', quantity: 1, priority: 'immediate' },
          { type: 'Emergency Ration Pack', quantity: 10, priority: 'urgent' },
        ],
        recommendedAction: isCritical
          ? 'Dispatch immediate priority rescue squad. Initiate evacuation protocols.'
          : 'Dispatch standard response team and verify situational stability.',
        detectedLanguage: lower.includes('හා') ? 'si' : lower.includes('இல்') ? 'ta' : 'en',
        processedAt: new Date().toISOString(),
        inputModalities: [inputMode],
        riskFactors: [
          ...(isFlood ? ['Water ingress danger'] : []),
          ...(hasElderly ? ['Mobility-impaired occupant'] : []),
          ...(hasChild ? ['Minors present on scene'] : []),
        ],
        estimatedResponseTime: isCritical ? 7 : 15,
      });
    }
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="officer" />
      <DashboardShell role="officer">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display text-nova-text">AI Emergency Analysis</h1>
            <p className="text-sm text-nova-text-dim mt-0.5">Multimodal AI analyzes text, voice, and image emergency reports</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left — Input */}
            <div className="space-y-4">
              {/* Existing incident selector */}
              <div className="nova-card border border-nova-border rounded-xl p-4">
                <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">Analyze Existing Incident</p>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => {
                    setSelectedIncidentId(e.target.value);
                    setResult(null);
                  }}
                  className="w-full bg-nova-surface border border-nova-border rounded-xl px-3 py-2.5 text-sm text-nova-text focus:outline-none focus:border-nova-cyan/40"
                >
                  {incidents.filter((i) => i.aiAnalysis).map((i) => (
                    <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                  ))}
                </select>
              </div>

              {/* Input mode */}
              <div className="nova-card border border-nova-border rounded-xl p-4">
                <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">Or Enter New Report</p>

                {/* Mode tabs */}
                <div className="flex gap-2 mb-4">
                  {[
                    { mode: 'text', label: 'Text', icon: <FileText className="w-3.5 h-3.5" /> },
                    { mode: 'voice', label: 'Voice', icon: <Mic className="w-3.5 h-3.5" /> },
                    { mode: 'image', label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                  ].map((m) => (
                    <button
                      key={m.mode}
                      onClick={() => setInputMode(m.mode as 'text' | 'voice' | 'image')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        inputMode === m.mode
                          ? 'bg-nova-cyan/10 border-nova-cyan/30 text-nova-cyan'
                          : 'border-nova-border text-nova-text-dim hover:border-nova-border2'
                      }`}
                    >
                      {m.icon}{m.label}
                    </button>
                  ))}
                </div>

                {inputMode === 'text' && (
                  <div>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={4}
                      className="w-full bg-nova-surface border border-nova-border rounded-xl px-4 py-3 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan/40 resize-none"
                      placeholder="Describe the emergency situation..."
                    />
                    <p className="text-xs text-nova-text-muted mt-1.5">Supports English, Tamil (தமிழ்), and Sinhala (සිංහල)</p>
                  </div>
                )}

                {inputMode === 'voice' && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <motion.button
                      className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{ boxShadow: ['0 0 0 0 rgba(255,59,59,0.4)', '0 0 0 20px rgba(255,59,59,0)', '0 0 0 0 rgba(255,59,59,0)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Mic className="w-8 h-8 text-red-400" />
                    </motion.button>
                    <p className="text-sm text-nova-text-dim">Click to start voice recording</p>
                    <p className="text-xs text-nova-text-muted">Speech-to-Text + Language Detection</p>
                  </div>
                )}

                {inputMode === 'image' && (
                  <div className="border-2 border-dashed border-nova-border rounded-xl p-8 text-center hover:border-nova-cyan/30 transition-colors cursor-pointer">
                    <ImageIcon className="w-8 h-8 text-nova-text-muted mx-auto mb-3" />
                    <p className="text-sm text-nova-text-dim">Drop image or click to upload</p>
                    <p className="text-xs text-nova-text-muted mt-1">AI detects flood, fire, structural damage, crowds</p>
                  </div>
                )}

                <motion.button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold py-3 rounded-xl hover:bg-purple-500/30 transition-all disabled:opacity-50"
                  whileHover={!analyzing ? { scale: 1.01 } : {}}
                  whileTap={!analyzing ? { scale: 0.99 } : {}}
                >
                  {analyzing ? (
                    <>
                      <motion.div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                      AI Processing...
                    </>
                  ) : (
                    <><Brain className="w-4 h-4" /> Run AI Analysis</>
                  )}
                </motion.button>
              </div>

              {/* Processing stages */}
              <AnimatePresence>
                {analyzing && (
                  <motion.div
                    className="nova-card border border-purple-500/20 rounded-xl p-4 scan-line"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <motion.div className="w-2 h-2 rounded-full bg-purple-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                      <p className="text-xs font-bold text-purple-400">NOVA AI Processing...</p>
                    </div>
                    <AIProcessingAnimation stage={analysisStage} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right — Results */}
            <div>
              {result ? (
                <AnalysisResult analysis={result} />
              ) : (
                <div className="nova-card border border-nova-border rounded-xl p-8 h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                    <Brain className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-base font-bold text-nova-text mb-2">AI Analysis Ready</h3>
                  <p className="text-sm text-nova-text-dim max-w-xs">
                    Select an existing incident or enter a new report, then click "Run AI Analysis" to see the multimodal AI output.
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-nova-text-muted">
                    {['< 5 sec', '3 Languages', '7 Stages'].map((stat) => (
                      <div key={stat} className="p-2 rounded-lg bg-nova-surface border border-nova-border">
                        <div className="font-bold text-nova-cyan">{stat}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}
