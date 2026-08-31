'use client';

import { useState, useRef, useEffect } from 'react';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { INITIAL_COPILOT_MESSAGES } from '@/lib/mock/data';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Send, Mic, ChevronRight, AlertTriangle, Users, Package, BarChart3 } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import type { CopilotMessage } from '@/types';

// ─── AI Response Generator ────────────────────────────────────

function generateCopilotResponse(query: string, context: ReturnType<typeof useNovaStore.getState>): string {
  const lq = query.toLowerCase();
  const crit = context.incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved');
  const active = context.incidents.filter((i) => i.status !== 'resolved');

  if (lq.includes('zone 4') || lq.includes('zone 04')) {
    return `**Zone 04 Situation Report:**\n\nZone 04 currently has **${crit.length} critical incidents** and **${active.length} total active incidents**. Kelani River is at **4.8m** — 23% above alert threshold.\n\n**Immediate risks:**\n- Flood risk at 82% (HIGH)\n- 42,000 residents at risk\n- River level rising\n\n**Recommended actions:**\n1. Activate Shelter B for preemptive evacuation\n2. Deploy reserve rescue boat from Depot B\n3. Alert Kelaniya Hospital for incoming patients\n4. Monitor River Station 02 continuously`;
  }

  if (lq.includes('critical') || lq.includes('immediate') || lq.includes('urgent')) {
    const critList = crit.slice(0, 3).map((i, idx) =>
      `${idx + 1}. **${i.id}** — ${i.title.slice(0, 50)}... (${i.location.district})`
    ).join('\n');
    return `**Critical Incidents Requiring Immediate Attention:**\n\n${critList}\n\n**Priority action:** ${crit[0]?.aiAnalysis?.recommendedAction || 'Review and assign resources immediately.'}`;
  }

  if (lq.includes('team') || lq.includes('deploy') || lq.includes('dispatch')) {
    const available = context.rescueTeams.filter((t) => t.status === 'available');
    return `**Rescue Team Status:**\n\n**Available Teams (${available.length}):**\n${available.map((t) => `• ${t.name} — ${t.district} · ${t.capabilities.join(', ')}`).join('\n')}\n\n**Recommendation:** Team Alpha is best positioned for Zone 04 — 2.4km distance, equipped with rescue boat and medical kit. ETA: 8 minutes.`;
  }

  if (lq.includes('resource') || lq.includes('supply') || lq.includes('stock')) {
    const low = context.resources.filter((r) => r.status === 'low_stock');
    return `**Resource Status Alert:**\n\n**Low Stock (${low.length} items):**\n${low.map((r) => `• ${r.name}: ${r.available} ${r.unit} remaining (threshold: ${r.lowStockThreshold})`).join('\n')}\n\n**AI Recommendation:** Zone 4 requires approximately 300 water units and 180 food packs. Initiate emergency resupply order immediately.`;
  }

  if (lq.includes('flood') || lq.includes('rain') || lq.includes('river')) {
    return `**Flood Situation Summary:**\n\nWestern Province is experiencing severe flooding conditions:\n\n• **Kelani River:** 4.8m (alert threshold: 3.5m)\n• **Rainfall:** 187mm in 6 hours\n• **Zone 04 Flood Risk:** 82% — CRITICAL\n• **Zone 03 Flood Risk:** 74% — HIGH\n\n**Projected escalation (+3hrs):** Risk rising to 93% in Zone 04, 85% in Zone 03.\n\n**Action Plan:** Pre-evacuate 12,000 riverside residents. Activate all 3 shelters. Position 4 rescue boats.`;
  }

  if (lq.includes('hospital') || lq.includes('medical') || lq.includes('icu')) {
    return `**Hospital Capacity Status:**\n\n• **Kelaniya Teaching:** ICU at 90% — only 2 beds remaining\n• **National Hospital:** 47 emergency beds available\n• **Colombo South:** 123 beds available\n\n**Incoming Cases:** 2 critical patients en route\n\n**Routing Recommendation:** Direct new critical cases to Colombo South. Alert National Hospital for potential surge.`;
  }

  if (lq.includes('predict') || lq.includes('risk') || lq.includes('future')) {
    return `**AI Risk Prediction — Next 6 Hours:**\n\n| Zone | Current | +1hr | +3hrs | +6hrs |\n|------|---------|------|-------|-------|\n| Zone 04 | 82% | 88% | 93% | **96%** |\n| Zone 03 | 74% | 79% | 85% | **91%** |\n| Zone 07 | 32% | 38% | 48% | **58%** |\n\n**Critical threshold (80%) projected to be reached by Zone 03 within 1 hour.**\n\nRecommend initiating Zone 03 evacuation protocols now.`;
  }

  if (lq.includes('action plan') || lq.includes('plan') || lq.includes('strategy')) {
    return `**Generated Emergency Action Plan:**\n\n**IMMEDIATE (0-30 min):**\n1. ✅ Maintain Team Bravo en route to NOV-1042\n2. 🔴 Dispatch reserve team to Zone 04 River Bank\n3. 📢 Issue public emergency alert for Zone 04 residents\n\n**SHORT TERM (30-120 min):**\n4. 🏠 Activate Shelter B — capacity 300 people\n5. 🚤 Pre-position 2 additional rescue boats at Zone 04\n6. 🏥 Alert National Hospital for potential surge\n\n**MONITORING:**\n7. 📊 Continue 15-min river level checks\n8. 🤖 AI prediction refresh every 30 minutes`;
  }

  // Default response
  return `I'm analyzing the current situation across all active incidents and zones.\n\n**Current Status:**\n• ${active.length} active incidents (${crit.length} critical)\n• ${context.rescueTeams.filter(t => t.status !== 'available').length} rescue teams deployed\n• Zone 04 at highest risk (82% flood risk)\n\nHow can I help? You can ask about specific zones, incidents, teams, resources, or request an action plan.`;
}

// ─── Suggested Prompts ─────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "What is happening in Zone 4?",
  "Which incidents require immediate attention?",
  "Where should we deploy the next rescue team?",
  "What resources are running low?",
  "Summarize the current flood situation.",
  "Generate an emergency action plan.",
  "What is the hospital capacity status?",
  "Show me risk predictions for next 6 hours.",
];

// ─── Main Copilot Page ─────────────────────────────────────────

export default function CopilotPage() {
  const storeState = useNovaStore.getState();
  const [messages, setMessages] = useState<CopilotMessage[]>(INITIAL_COPILOT_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking delay
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const response = generateCopilotResponse(text, storeState);
    const aiMsg: CopilotMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      confidence: 85 + Math.floor(Math.random() * 12),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Simple markdown-like formatter
  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-nova-text font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.+)$/gm, '<div class="flex gap-2 mt-1"><span class="text-nova-cyan mt-0.5">•</span><span>$1</span></div>')
      .replace(/^\d+\. (.+)$/gm, '<div class="flex gap-2 mt-1"><span class="text-nova-cyan font-mono text-xs mt-0.5 flex-shrink-0">→</span><span>$1</span></div>')
      .replace(/\n\n/g, '</p><p class="mt-3">')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="officer" />
      <DashboardShell role="officer">
        <div className="h-[calc(100vh-116px)] flex">
          {/* Main Chat */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b border-nova-border px-6 py-4 flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-purple-400" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-nova-low border-2 border-nova-bg" />
              </div>
              <div>
                <h1 className="text-base font-bold text-nova-text">NOVA Copilot</h1>
                <p className="text-xs text-purple-400">AI Emergency Operations Assistant · Active</p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-nova-text-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-nova-low" />
                Full situational awareness
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                      <Cpu className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    msg.role === 'user'
                      ? 'bg-nova-cyan text-nova-bg rounded-br-sm'
                      : 'bg-nova-surface border border-nova-border rounded-bl-sm'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div
                        className="text-sm text-nova-text leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: `<p>${formatContent(msg.content)}</p>` }}
                      />
                    ) : (
                      <p className="text-sm font-medium">{msg.content}</p>
                    )}
                    <div className={cn('flex items-center gap-2 mt-2', msg.role === 'user' ? 'justify-end text-nova-bg/60' : 'text-nova-text-muted')}>
                      <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                      {msg.confidence && (
                        <span className="text-[10px] text-purple-400">{msg.confidence}% confidence</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                      <Cpu className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="bg-nova-surface border border-nova-border rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="typing-dots"><span /><span /><span /></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-nova-border p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <button type="button" className="w-10 h-10 flex-shrink-0 rounded-xl bg-nova-surface border border-nova-border flex items-center justify-center text-nova-text-muted hover:text-nova-text hover:border-nova-border2 transition-all">
                  <Mic className="w-4 h-4" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask NOVA Copilot about the current situation..."
                  className="flex-1 bg-nova-surface border border-nova-border rounded-xl px-4 py-2.5 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none focus:border-nova-cyan/40 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 flex-shrink-0 rounded-xl bg-nova-cyan text-nova-bg flex items-center justify-center hover:bg-nova-cyan-dim transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right sidebar — Suggested prompts & context */}
          <div className="w-64 border-l border-nova-border bg-nova-surface/30 p-4 space-y-4 overflow-y-auto">
            <div>
              <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">Suggested Queries</p>
              <div className="space-y-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={isTyping}
                    className="w-full text-left text-xs text-nova-text-dim hover:text-nova-text hover:bg-nova-surface2 px-3 py-2 rounded-lg border border-transparent hover:border-nova-border transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <ChevronRight className="w-3 h-3 flex-shrink-0 text-nova-cyan" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-nova-border pt-4">
              <p className="text-xs font-bold text-nova-text-muted uppercase tracking-wider mb-3">Live Context</p>
              <div className="space-y-2">
                {[
                  { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Active Incidents', value: useNovaStore.getState().incidents.filter(i => i.status !== 'resolved').length.toString(), color: 'text-red-400' },
                  { icon: <Users className="w-3.5 h-3.5" />, label: 'Teams Deployed', value: useNovaStore.getState().rescueTeams.filter(t => t.status !== 'available').length.toString(), color: 'text-nova-cyan' },
                  { icon: <Package className="w-3.5 h-3.5" />, label: 'Low Resources', value: useNovaStore.getState().resources.filter(r => r.status === 'low_stock').length.toString(), color: 'text-orange-400' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-nova-surface border border-nova-border">
                    <div className="flex items-center gap-2 text-nova-text-muted">{item.icon}<span className="text-xs">{item.label}</span></div>
                    <span className={cn('text-sm font-bold font-mono', item.color)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}
