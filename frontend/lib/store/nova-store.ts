'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Incident, RescueTeam, Hospital, Resource, RiskPrediction,
  Notification, SimulationState, User, UserRole, Language
} from '@/types';
import { getToken } from '@/lib/auth';
import {
  MOCK_INCIDENTS,
  MOCK_RESCUE_TEAMS,
  MOCK_HOSPITALS,
  MOCK_RESOURCES,
  MOCK_RISK_PREDICTIONS,
  MOCK_NOTIFICATIONS
} from '@/lib/mock/data';

// ─── API Base ─────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'API error' }));
    throw new Error(err.message || `Error ${res.status}`);
  }

  const json = await res.json();
  // Backend wraps in { data, success, ... }
  return json.data ?? json;
}

// ─── App State ──────────────────────────────────────────────

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Loading states
  loading: {
    incidents: boolean;
    teams: boolean;
    hospitals: boolean;
    resources: boolean;
    predictions: boolean;
    notifications: boolean;
  };

  // Incidents
  incidents: Incident[];
  fetchIncidents: (params?: { severity?: string; status?: string }) => Promise<void>;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;

  // Teams
  rescueTeams: RescueTeam[];
  fetchTeams: () => Promise<void>;
  updateTeam: (id: string, updates: Partial<RescueTeam>) => void;

  // Hospitals
  hospitals: Hospital[];
  fetchHospitals: () => Promise<void>;
  updateHospital: (id: string, updates: Partial<Hospital>) => void;

  // Resources
  resources: Resource[];
  fetchResources: () => Promise<void>;
  updateResource: (id: string, updates: Partial<Resource>) => void;

  // Risk Predictions
  riskPredictions: RiskPrediction[];
  fetchPredictions: () => Promise<void>;
  updateRiskPrediction: (id: string, updates: Partial<RiskPrediction>) => void;

  // Notifications
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  addNotification: (notif: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;

  // Initial data fetch (called once on app mount)
  fetchAllData: () => Promise<void>;

  // Simulation (kept as frontend-only feature)
  simulation: SimulationState;
  startSimulation: () => void;
  stopSimulation: () => void;
  advanceSimulation: () => void;

  // Global stats (live counters)
  stats: {
    activeIncidents: number;
    criticalIncidents: number;
    peopleAffected: number;
    teamsDeployed: number;
    avgResponseTime: number;
    aiPredictions: number;
  };
  refreshStats: () => void;
}

// ─── Simulation Steps (frontend-only — no backend needed) ─────

const SIMULATION_STEPS_DATA = [
  {
    id: 1,
    title: 'Rainfall intensifying over Western Province',
    description: 'Meteorological AI detects abnormal rainfall pattern. Zone 04 flood risk rising.',
    delay: 0,
    action: (state: AppState) => {
      state.updateRiskPrediction('rp001', { floodRisk: 82, overallRisk: 78, rainfall: 187, riverLevel: 4.8 });
      state.addNotification({
        id: `sim-notif-${Date.now()}`,
        type: 'prediction_alert',
        title: '⚠️ SIMULATION: Zone 04 Flood Risk Rising',
        message: 'AI detected critical rainfall pattern. Zone 04 at 82% flood risk.',
        severity: 'critical',
        read: false,
        createdAt: new Date().toISOString(),
      });
    },
  },
  {
    id: 2,
    title: 'River Station 02 exceeds alert threshold',
    description: 'Kelani River at 5.2m — Emergency threshold breached. AI escalates risk.',
    delay: 3000,
    action: (state: AppState) => {
      state.updateRiskPrediction('rp001', { floodRisk: 88, riverLevel: 5.2, riskLevel: 'critical' });
    },
  },
  {
    id: 3,
    title: 'Citizen SOS Report received',
    description: 'Tamil-language voice + image report received. AI processing multimodal input.',
    delay: 6000,
    action: (state: AppState) => {
      const newIncident: Incident = {
        id: 'NOV-SIM-001',
        type: 'flood',
        severity: 'critical',
        status: 'reported',
        title: '[SIM] SIMULATION: House flooding — Kelani River bank',
        description: 'Water entering ground floor. Family of 4 trapped. Elderly father cannot walk.',
        location: { lat: 6.9450, lng: 79.9700, address: 'Simulation: 12 River View Lane, Kaduwela', district: 'Colombo', zone: 'Zone 04' },
        reportedBy: 'sim-citizen',
        reporterName: 'Simulation Citizen',
        reportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        peopleAffected: 4,
        notes: [],
        attachments: [],
        updates: [{ id: 'sim-upd1', status: 'reported', message: 'SIMULATION incident received.', updatedBy: 'System', updatedAt: new Date().toISOString() }],
        resourcesAllocated: [],
        priority: 1,
        isSimulation: true,
      };
      state.addIncident(newIncident);
      state.addNotification({
        id: `sim-notif-${Date.now() + 1}`,
        type: 'critical_incident',
        title: '🔴 SIMULATION: New Critical Incident',
        message: 'Flood emergency reported via voice+image in Zone 04. AI analyzing.',
        severity: 'critical',
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: 'NOV-SIM-001',
        relatedType: 'incident',
      });
    },
  },
  {
    id: 4,
    title: 'NOVA AI analyzing multimodal report',
    description: 'Speech-to-text, image analysis, language normalization — Critical detected.',
    delay: 10000,
    action: (state: AppState) => {
      state.updateIncident('NOV-SIM-001', {
        status: 'ai_analyzed',
        severity: 'critical',
        aiAnalysis: {
          id: 'ai-sim-001',
          incidentId: 'NOV-SIM-001',
          emergencyType: 'flood',
          severity: 'critical',
          confidenceScore: 93,
          peopleAffected: 4,
          vulnerablePersons: [{ type: 'elderly', count: 1 }],
          requiredResources: [{ type: 'Rescue Boat', quantity: 1, priority: 'immediate' }],
          recommendedAction: 'Deploy nearest rescue team immediately.',
          detectedLanguage: 'ta',
          processedAt: new Date().toISOString(),
          inputModalities: ['voice', 'image'],
          riskFactors: ['Elderly occupant', 'Rising water'],
          estimatedResponseTime: 10,
        },
      });
    },
  },
  {
    id: 5,
    title: 'Incident appears on Live Map',
    description: 'Critical incident marker pulsing on command center GIS map.',
    delay: 13000,
    action: (state: AppState) => {
      state.updateIncident('NOV-SIM-001', { status: 'prioritized', priority: 1 });
    },
  },
  {
    id: 6,
    title: 'AI assigns Priority: CRITICAL',
    description: 'NOVA Copilot recommends Team Alpha based on proximity and equipment.',
    delay: 16000,
    action: (state: AppState) => {
      state.addNotification({
        id: `sim-notif-${Date.now() + 2}`,
        type: 'critical_incident',
        title: '🤖 AI Recommendation: Deploy Team Alpha',
        message: 'NOVA Copilot: Team Alpha recommended for NOV-SIM-001. Distance: 1.8km. ETA: 6 min.',
        severity: 'critical',
        read: false,
        createdAt: new Date().toISOString(),
      });
    },
  },
  {
    id: 7,
    title: 'Team Alpha dispatched to incident',
    description: 'Emergency officer approves AI recommendation. Team Alpha assigned and en route.',
    delay: 20000,
    action: (state: AppState) => {
      state.updateIncident('NOV-SIM-001', {
        status: 'en_route',
        assignedTeam: 'RT-ALPHA-01',
        assignedTeamName: 'Team Alpha',
        eta: 6,
        updates: [
          { id: 'sim-upd2', status: 'en_route', message: '[SIM] Team Alpha dispatched. ETA: 6 minutes.', updatedBy: 'Officer', updatedAt: new Date().toISOString() },
        ],
      });
      state.updateTeam('RT-ALPHA-01', { status: 'en_route', currentIncident: 'NOV-SIM-001', eta: 6 });
    },
  },
  {
    id: 8,
    title: 'Hospital alerted for incoming patient',
    description: 'Kelaniya Hospital receives automatic alert for elderly patient.',
    delay: 23000,
    action: (state: AppState) => {
      state.addNotification({
        id: `sim-notif-${Date.now() + 3}`,
        type: 'hospital_capacity',
        title: '🏥 Hospital Alert: Incoming Patient',
        message: 'Kelaniya Hospital: Incoming elderly patient from NOV-SIM-001. Prepare emergency bay.',
        severity: 'high',
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: 'h003',
        relatedType: 'hospital',
      });
    },
  },
  {
    id: 9,
    title: 'Resources allocated automatically',
    description: 'AI deploys rescue boat and medical kit. Water supply reserve activated.',
    delay: 26000,
    action: (state: AppState) => {
      const r001 = state.resources.find(r => r.id === 'r001');
      if (r001) {
        state.updateResource('r001', { deployed: r001.deployed + 1, available: r001.available - 1 });
      }
    },
  },
  {
    id: 10,
    title: 'Citizen notified: Team En Route',
    description: 'Citizen tracking timeline updated. \"Rescue Team En Route — ETA 6 minutes.\"',
    delay: 29000,
    action: () => { /* tracking update visual */ },
  },
  {
    id: 11,
    title: 'Command center live update',
    description: 'All dashboards reflect real-time status. River level continues rising.',
    delay: 33000,
    action: (state: AppState) => {
      state.updateRiskPrediction('rp001', { riverLevel: 5.6, floodRisk: 91 });
    },
  },
  {
    id: 12,
    title: 'Team Alpha on scene',
    description: 'Rescue team arrives. Extraction operation begins.',
    delay: 40000,
    action: (state: AppState) => {
      state.updateIncident('NOV-SIM-001', { status: 'responding', eta: 0 });
      state.updateTeam('RT-ALPHA-01', { status: 'on_scene' });
    },
  },
  {
    id: 13,
    title: 'After-action analytics generated',
    description: 'NOVA AI compiles operational report. Response time: 10.2 minutes.',
    delay: 48000,
    action: (state: AppState) => {
      state.addNotification({
        id: `sim-notif-${Date.now() + 4}`,
        type: 'simulation',
        title: '✅ SIMULATION COMPLETE',
        message: 'Flood response simulation completed. Avg response time: 10.2 min. 4 persons assisted.',
        severity: 'low',
        read: false,
        createdAt: new Date().toISOString(),
      });
    },
  },
];

// ─── Store ───────────────────────────────────────────────────

export const useNovaStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Auth
    currentUser: null,
    isAuthenticated: false,
    login: (user) => set({ currentUser: user, isAuthenticated: true }),
    logout: () => set({ currentUser: null, isAuthenticated: false }),

    // Language
    language: 'en',
    setLanguage: (lang) => set({ language: lang }),

    // Loading states
    loading: {
      incidents: false,
      teams: false,
      hospitals: false,
      resources: false,
      predictions: false,
      notifications: false,
    },

    // ─── Incidents ──────────────────────────────────────────
    incidents: MOCK_INCIDENTS,
    fetchIncidents: async (params) => {
      set(s => ({ loading: { ...s.loading, incidents: true } }));
      try {
        const query = params
          ? '?' + new URLSearchParams(params as Record<string, string>).toString()
          : '';
        const incidents = await apiFetch<Incident[]>(`/incidents${query}`);
        if (Array.isArray(incidents) && incidents.length > 0) {
          set({ incidents });
        }
      } catch (err) {
        console.warn('Backend incidents not available, using local store data:', err);
      } finally {
        set(s => ({ loading: { ...s.loading, incidents: false } }));
      }
    },
    addIncident: (incident) =>
      set((state) => ({
        incidents: [incident, ...state.incidents],
      })),
    updateIncident: (id, updates) =>
      set((state) => ({
        incidents: state.incidents.map((inc) =>
          inc.id === id ? { ...inc, ...updates, updatedAt: new Date().toISOString() } : inc
        ),
      })),

    // ─── Teams ──────────────────────────────────────────────
    rescueTeams: MOCK_RESCUE_TEAMS,
    fetchTeams: async () => {
      set(s => ({ loading: { ...s.loading, teams: true } }));
      try {
        const teams = await apiFetch<RescueTeam[]>('/rescue-teams');
        if (Array.isArray(teams) && teams.length > 0) {
          set({ rescueTeams: teams });
        }
      } catch (err) {
        console.warn('Backend rescue teams not available, using local store data:', err);
      } finally {
        set(s => ({ loading: { ...s.loading, teams: false } }));
      }
    },
    updateTeam: (id, updates) =>
      set((state) => ({
        rescueTeams: state.rescueTeams.map((t) =>
          t.id === id ? { ...t, ...updates, lastUpdated: new Date().toISOString() } : t
        ),
      })),

    // ─── Hospitals ──────────────────────────────────────────
    hospitals: MOCK_HOSPITALS,
    fetchHospitals: async () => {
      set(s => ({ loading: { ...s.loading, hospitals: true } }));
      try {
        const hospitals = await apiFetch<Hospital[]>('/hospitals');
        if (Array.isArray(hospitals) && hospitals.length > 0) {
          set({ hospitals });
        }
      } catch (err) {
        console.warn('Backend hospitals not available, using local store data:', err);
      } finally {
        set(s => ({ loading: { ...s.loading, hospitals: false } }));
      }
    },
    updateHospital: (id, updates) =>
      set((state) => ({
        hospitals: state.hospitals.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: new Date().toISOString() } : h
        ),
      })),

    // ─── Resources ──────────────────────────────────────────
    resources: MOCK_RESOURCES,
    fetchResources: async () => {
      set(s => ({ loading: { ...s.loading, resources: true } }));
      try {
        const resources = await apiFetch<Resource[]>('/resources');
        if (Array.isArray(resources) && resources.length > 0) {
          set({ resources });
        }
      } catch (err) {
        console.warn('Backend resources not available, using local store data:', err);
      } finally {
        set(s => ({ loading: { ...s.loading, resources: false } }));
      }
    },
    updateResource: (id, updates) =>
      set((state) => ({
        resources: state.resources.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      })),

    // ─── Risk Predictions ────────────────────────────────────
    riskPredictions: MOCK_RISK_PREDICTIONS,
    fetchPredictions: async () => {
      set(s => ({ loading: { ...s.loading, predictions: true } }));
      try {
        const predictions = await apiFetch<RiskPrediction[]>('/predictions');
        if (Array.isArray(predictions) && predictions.length > 0) {
          set({ riskPredictions: predictions });
        }
      } catch (err) {
        console.warn('Backend predictions not available, using local store data:', err);
      } finally {
        set(s => ({ loading: { ...s.loading, predictions: false } }));
      }
    },
    updateRiskPrediction: (id, updates) =>
      set((state) => ({
        riskPredictions: state.riskPredictions.map((rp) =>
          rp.id === id ? { ...rp, ...updates, updatedAt: new Date().toISOString() } : rp
        ),
      })),

    // ─── Notifications ───────────────────────────────────────
    notifications: MOCK_NOTIFICATIONS,
    fetchNotifications: async () => {
      set(s => ({ loading: { ...s.loading, notifications: true } }));
      try {
        const notifications = await apiFetch<Notification[]>('/notifications');
        if (Array.isArray(notifications) && notifications.length > 0) {
          set({
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
          });
        }
      } catch (err) {
        console.warn('Backend notifications not available, using local store data:', err);
      } finally {
        set(s => ({ loading: { ...s.loading, notifications: false } }));
      }
    },
    addNotification: (notif) =>
      set((state) => ({
        notifications: [notif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      })),
    markNotificationRead: (id) =>
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),
    markAllRead: () =>
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      })),
    unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,

    // ─── Fetch All Data (called on app mount) ─────────────────
    fetchAllData: async () => {
      const state = get();
      await Promise.allSettled([
        state.fetchIncidents(),
        state.fetchTeams(),
        state.fetchHospitals(),
        state.fetchResources(),
        state.fetchPredictions(),
        state.fetchNotifications(),
      ]);
      get().refreshStats();
    },

    // ─── Simulation (frontend-only) ──────────────────────────
    simulation: {
      isActive: false,
      currentStep: 0,
      elapsedTime: 0,
      scenario: 'flood_colombo',
      incidents: [],
      riskLevel: 82,
      riverLevel: 4.8,
      rainfall: 187,
    },
    startSimulation: () => {
      const state = get();
      set({ simulation: { ...state.simulation, isActive: true, currentStep: 0 } });

      SIMULATION_STEPS_DATA.forEach((step) => {
        setTimeout(() => {
          const currentState = get();
          if (!currentState.simulation.isActive) return;
          step.action(currentState);
          set((s) => ({
            simulation: { ...s.simulation, currentStep: step.id },
          }));
          currentState.refreshStats();
        }, step.delay);
      });

      setTimeout(() => {
        set((s) => ({ simulation: { ...s.simulation, isActive: false } }));
      }, 55000);
    },
    stopSimulation: () =>
      set((state) => ({ simulation: { ...state.simulation, isActive: false } })),
    advanceSimulation: () => {},

    // ─── Stats ───────────────────────────────────────────────
    stats: {
      activeIncidents: 0,
      criticalIncidents: 0,
      peopleAffected: 0,
      teamsDeployed: 0,
      avgResponseTime: 11.4,
      aiPredictions: 847,
    },
    refreshStats: () => {
      const state = get();
      set({
        stats: {
          activeIncidents: state.incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length,
          criticalIncidents: state.incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length,
          peopleAffected: state.incidents.reduce((sum, i) => sum + i.peopleAffected, 0),
          teamsDeployed: state.rescueTeams.filter((t) => t.status !== 'available' && t.status !== 'unavailable').length,
          avgResponseTime: 11.4,
          aiPredictions: 847,
        },
      });
    },
  }))
);

// ─── Computed Selectors ──────────────────────────────────────

export const selectCriticalIncidents = (state: AppState) =>
  state.incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved');

export const selectActiveIncidents = (state: AppState) =>
  state.incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed');

export const selectAvailableTeams = (state: AppState) =>
  state.rescueTeams.filter((t) => t.status === 'available');

export const selectLowResources = (state: AppState) =>
  state.resources.filter((r) => r.status === 'low_stock' || r.status === 'critical_stock');
