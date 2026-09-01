'use client';

import { useState, useEffect, useRef } from 'react';
import { TopNav } from '@/components/shared/TopNav';
import { DashboardShell } from '@/components/shared/Sidebar';
import { useNovaStore } from '@/lib/store/nova-store';
import { DIGITAL_TWIN_DATA } from '@/lib/mock/data';
import { RiskGauge } from '@/components/emergency/RiskGauge';
import { motion } from 'framer-motion';
import { Waves, TrendingUp, Brain, Clock, AlertTriangle, CloudRain, Thermometer } from 'lucide-react';
import { cn, getRiskColor, getRiskBg, getRiskLabel } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

const TIME_OPTIONS = [
  { label: 'Current', hours: 0 },
  { label: '+1 Hour', hours: 1 },
  { label: '+3 Hours', hours: 3 },
  { label: '+6 Hours', hours: 6 },
] as const;

const riverLevelData = [
  { time: '06:00', level: 2.1, alert: 3.5 },
  { time: '07:00', level: 2.4, alert: 3.5 },
  { time: '08:00', level: 2.9, alert: 3.5 },
  { time: '09:00', level: 3.2, alert: 3.5 },
  { time: '10:00', level: 3.8, alert: 3.5 },
  { time: '11:00', level: 4.2, alert: 3.5 },
  { time: 'Now', level: 4.8, alert: 3.5 },
  { time: '+1hr', level: 5.2, alert: 3.5 },
  { time: '+3hr', level: 5.8, alert: 3.5 },
  { time: '+6hr', level: 6.4, alert: 3.5 },
];

const rainfallData = [
  { time: '06:00', actual: 18, predicted: null },
  { time: '08:00', actual: 32, predicted: null },
  { time: '10:00', actual: 41, predicted: null },
  { time: 'Now', actual: 47, predicted: 47 },
  { time: '+1hr', actual: null, predicted: 42 },
  { time: '+3hr', actual: null, predicted: 28 },
  { time: '+6hr', actual: null, predicted: 15 },
];

export default function PredictionPage() {
  const { riskPredictions } = useNovaStore();
  const [selectedTime, setSelectedTime] = useState<0 | 1 | 3 | 6>(0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const snapshot = DIGITAL_TWIN_DATA.find((d) => d.hoursAhead === selectedTime) || DIGITAL_TWIN_DATA[0];

  const currentConditions = {
    rainfall: 187,
    riverLevel: 4.8,
    temperature: 26,
    windSpeed: 45,
    humidity: 94,
  };

  return (
    <div className="min-h-screen bg-nova-bg">
      <TopNav role="officer" />
      <DashboardShell role="officer">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display text-nova-text">Disaster Prediction</h1>
              <p className="text-sm text-nova-text-dim mt-0.5">ML-driven risk forecasting · Updated every 15 minutes</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-nova-low">
              <div className="w-1.5 h-1.5 rounded-full bg-nova-low animate-pulse" />
              AI Model Active · 87% Accuracy
            </div>
          </div>

          {/* Current Conditions */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Rainfall', value: `${currentConditions.rainfall}mm`, icon: <CloudRain className="w-4 h-4" />, color: 'text-blue-400', alert: currentConditions.rainfall > 150 },
              { label: 'River Level', value: `${currentConditions.riverLevel}m`, icon: <Waves className="w-4 h-4" />, color: 'text-red-400', alert: currentConditions.riverLevel > 3.5 },
              { label: 'Temperature', value: `${currentConditions.temperature}°C`, icon: <Thermometer className="w-4 h-4" />, color: 'text-orange-400', alert: false },
              { label: 'Wind Speed', value: `${currentConditions.windSpeed}km/h`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-nova-cyan', alert: currentConditions.windSpeed > 40 },
              { label: 'Humidity', value: `${currentConditions.humidity}%`, icon: <CloudRain className="w-4 h-4" />, color: 'text-purple-400', alert: currentConditions.humidity > 90 },
            ].map((cond) => (
              <div key={cond.label} className={cn(
                'nova-card border rounded-xl p-3',
                cond.alert ? 'border-red-500/30 bg-red-500/5' : 'border-nova-border'
              )}>
                <div className={cn('flex items-center gap-1.5 mb-1.5', cond.color)}>
                  {cond.icon}
                  <span className="text-[10px] font-medium text-nova-text-muted">{cond.label}</span>
                  {cond.alert && <AlertTriangle className="w-3 h-3 text-red-400 ml-auto" />}
                </div>
                <div className={cn('text-xl font-bold font-mono', cond.color)}>{cond.value}</div>
              </div>
            ))}
          </div>

          {/* Digital Twin — Zone Risk Grid */}
          <div className="nova-card border border-nova-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <div>
                  <h2 className="text-sm font-bold text-nova-text">Digital Twin — Risk Projection</h2>
                  <p className="text-xs text-nova-text-muted">Switch between time scenarios</p>
                </div>
              </div>
              {/* Time selector */}
              <div className="flex items-center gap-1 bg-nova-surface border border-nova-border rounded-xl p-1">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    onClick={() => setSelectedTime(opt.hours as 0 | 1 | 3 | 6)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      selectedTime === opt.hours
                        ? 'bg-nova-cyan text-nova-bg'
                        : 'text-nova-text-dim hover:text-nova-text'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={selectedTime}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {snapshot.zones.map((zone) => (
                <div key={zone.zone} className={cn(
                  'rounded-xl p-4 border text-center',
                  zone.floodRisk >= 80 ? 'bg-red-500/8 border-red-500/25' :
                  zone.floodRisk >= 60 ? 'bg-orange-500/8 border-orange-500/25' :
                  'bg-nova-surface border-nova-border'
                )}>
                  <p className="text-xs font-bold text-nova-text mb-1">{zone.zone}</p>
                  <p className="text-[10px] text-nova-text-muted mb-3">{zone.district}</p>
                  <RiskGauge value={zone.floodRisk} size="sm" />
                  <div className="mt-3 space-y-1 text-[10px] text-nova-text-muted">
                    <div className="flex justify-between">
                      <span>River</span>
                      <span className={cn('font-mono', zone.riverLevel > 3.5 ? 'text-red-400' : 'text-nova-text')}>
                        {zone.riverLevel}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pop. at Risk</span>
                      <span className="font-mono text-nova-text">{(zone.populationAtRisk / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Area</span>
                      <span className="font-mono text-nova-text">{zone.affectedArea}km²</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* River Level Chart */}
            <div className="nova-card border border-nova-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Waves className="w-4 h-4 text-blue-400" />
                <p className="text-xs font-bold text-nova-text">Kelani River Level (m)</p>
                <span className="ml-auto text-[10px] text-red-400 font-bold">⚠ ABOVE ALERT</span>
              </div>
              <div className="h-48 flex items-center justify-center overflow-hidden">
                {mounted ? (
                  <AreaChart width={420} height={180} data={riverLevelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.6)" />
                    <XAxis dataKey="time" tick={{ fill: '#4a5a7a', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#4a5a7a', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0d1629', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '10px', color: '#e8f0fe' }} />
                    <Area type="monotone" dataKey="level" stroke="#3b82f6" fill="rgba(59,130,246,0.15)" strokeWidth={2} name="River Level (m)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="alert" stroke="#ff3b3b" fill="none" strokeDasharray="4 4" strokeWidth={1.5} name="Alert Threshold" isAnimationActive={false} />
                  </AreaChart>
                ) : (
                  <div className="w-full h-full bg-nova-surface2 animate-pulse rounded-lg" />
                )}
              </div>
            </div>

            {/* Risk by Zone */}
            <div className="nova-card border border-nova-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <p className="text-xs font-bold text-nova-text">Risk by Zone — All Types</p>
              </div>
              <div className="h-48 flex items-center justify-center overflow-hidden">
                {mounted ? (
                  <BarChart width={420} height={180} data={riskPredictions.map((rp) => ({ name: rp.zone, Flood: rp.floodRisk, Landslide: rp.landslideRisk, Fire: rp.fireRisk }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.6)" />
                    <XAxis dataKey="name" tick={{ fill: '#4a5a7a', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#4a5a7a', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0d1629', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '10px', color: '#e8f0fe' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Flood" fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Landslide" fill="#ff7a00" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Fire" fill="#ff3b3b" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                ) : (
                  <div className="w-full h-full bg-nova-surface2 animate-pulse rounded-lg" />
                )}
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="nova-card border border-nova-cyan/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-nova-cyan" />
              <p className="text-sm font-bold text-nova-text">NOVA AI Recommendations</p>
              <span className="text-xs text-nova-cyan ml-auto">Based on current conditions</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {riskPredictions[0].aiRecommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-nova-cyan/5 border border-nova-cyan/15">
                  <div className="w-5 h-5 rounded-full bg-nova-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-nova-cyan">{i + 1}</span>
                  </div>
                  <p className="text-sm text-nova-text-dim">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}
