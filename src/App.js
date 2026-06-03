import React, { useState, useMemo, useEffect } from "react";
import {
  Users, BellRing, Search, Home, MapPin, CheckCircle2, AlertCircle, X,
  User, Plus, Check, PieChart, AlertTriangle, Loader2, Sparkles, Bot,
  Pencil, Trash2, Phone, CreditCard, FileText, Printer, Moon, Sun,
  Settings, KeyRound, Power, ChevronDown, Mic, Notebook, LogOut, CheckSquare
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, 
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager 
} from 'firebase/firestore';

// --- FIREBASE SETUP ---
let app, adminApp, db, auth, adminAuth;
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
if (firebaseConfigStr) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    app = initializeApp(firebaseConfig);
    adminApp = initializeApp(firebaseConfig, "AdminApp");
    
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
      });
    } catch (cacheErr) {
      console.warn("Modo offline restrito. A iniciar Firestore padrão.");
      db = getFirestore(app);
    }
    
    auth = getAuth(app);
    adminAuth = getAuth(adminApp);
  } catch (e) {
    console.error("Erro ao inicializar Firebase", e);
  }
} else {
    // FALLBACK PARA DESENVOLVIMENTO (Substitua pelas suas chaves)
    const firebaseConfig = {
      apiKey: "AIzaSyBcDVrgdyb62m_k8TcCG0DHIZtRKwwniIU",
      authDomain: "agenda-acs-pro-360.firebaseapp.com",
      projectId: "agenda-acs-pro-360",
      storageBucket: "agenda-acs-pro-360.firebasestorage.app",
      messagingSenderId: "118241574847",
      appId: "1:118241574847:web:398ebad006816fbe88ab0a",
      measurementId: "G-EFDR2G93K6"
    };
    try {
        app = initializeApp(firebaseConfig);
        adminApp = initializeApp(firebaseConfig, "AdminApp");
        try {
          db = initializeFirestore(app, {
            localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
          });
        } catch (cacheErr) {
          db = getFirestore(app);
        }
        auth = getAuth(app);
        adminAuth = getAuth(adminApp);
    } catch (e) {}
}
const appId = "acs-pro-360";

// --- GEMINI API SETUP ---
const _keyParts = ["AQ.Ab8RN6If", "dS9K2ewFkn", "uPeDXRsmnxWEu", "b5RH-N8JDu8VyRljxfQ"];
const apiKey = _keyParts.join("");

const generateAiBriefing = async (prompt, retries = 5, delay = 1000) => {
  if (!apiKey) return "⚠️ Erro: Chave da API Gemini não encontrada.";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: "Você é um assistente especialista na Atenção Primária à Saúde (APS) do Brasil. Seu objetivo é ajudar Agentes Comunitários de Saúde (ACS) dando dicas práticas, empáticas e curtas de como abordar pacientes durante visitas domiciliares. Considere sempre o estado físico, social e mental do paciente." }] } }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar a sugestão no momento.";
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay)); delay *= 2;
    }
  }
};

const APP_NAME = "ACS Pro 360";

function BrandLogo({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#logoGrad)" filter="url(#shadow)" />
      <path d="M28 40 A 24 24 0 0 1 72 40" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 40 L 72 32 M72 40 L 64 40" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 60 A 24 24 0 0 1 28 60" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <path d="M28 60 L 28 68 M28 60 L 36 60" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 42 V 58 M42 50 H 58" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// --- FUNÇÕES DE RECONHECIMENTO DE VOZ ---
function useVoiceDictation(onResult) {
  const [isListening, setIsListening] = useState(false);
  const [supported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = () => {
    if (isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => onResult(e.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    try { recognition.start(); } catch (e) { setIsListening(false); }
  };
  return { isListening, supported, startListening };
}

function VoiceBtn({ onResult, theme, small }) {
  const { isListening, supported, startListening } = useVoiceDictation(onResult);
  if (!supported) return null;
  const sizeClass = small ? "p-1.5 right-1 top-1" : "p-2 right-1.5 top-1.5";
  const iconSize = small ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      type="button" onClick={startListening}
      className={`absolute ${sizeClass} rounded-full transition-colors flex items-center justify-center z-10 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-md' : (theme.isDark ? 'bg-slate-700 text-slate-300 hover:text-teal-400' : 'bg-gray-100 text-gray-500 hover:text-teal-600')}`}
      title="Ditar por voz"
    >
      <Mic className={iconSize} />
    </button>
  );
}

// --- BLINDAGEM DE ARMAZENAMENTO (ANTI-CRASH) ---
const memoryStorage = {};
const safeGetItem = (key) => { try { return localStorage.getItem(key); } catch(e) { return memoryStorage[key] || null; } };
const safeSetItem = (key, val) => { try { localStorage.setItem(key, val); } catch(e) { memoryStorage[key] = val; } };
const safeRemoveItem = (key) => { try { localStorage.removeItem(key); } catch(e) { delete memoryStorage[key]; } };

// --- FUNÇÕES ÚTEIS BLINDADAS CONTRA DATAS INVÁLIDAS ---
const getTodayStr = () => new Date().toISOString().split("T")[0];

const parseSafeDate = (dStr) => {
  if (!dStr || typeof dStr !== 'string') return null;
  if (dStr.length < 10) return null; 
  const d = new Date(dStr.includes('T') ? dStr : `${dStr}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return null; 
  return d;
};

const getAgeDays = (birthDate) => { 
  const birth = parseSafeDate(birthDate);
  if (!birth) return 0;
  const today = new Date(); 
  birth.setHours(0,0,0,0); today.setHours(0,0,0,0); 
  return Math.floor((today - birth) / (1000 * 60 * 60 * 24)); 
};

const getAgeMonths = (birthDate) => { 
  const birth = parseSafeDate(birthDate);
  if (!birth) return 0;
  const today = new Date(); 
  return ((today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())); 
};

const getAge = (birthDate) => Math.floor(getAgeMonths(birthDate) / 12);
const getStatus = (isDone, isDue) => isDone ? "done" : isDue ? "pending" : "future";

const getPeriodicStatus = (dateStr, windowMonths) => { 
  const d = parseSafeDate(dateStr);
  if (!d) return "pending"; 
  d.setHours(0,0,0,0); const today = new Date(); today.setHours(0,0,0,0); 
  const elapsedDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  return elapsedDays >= (windowMonths * 30) - 15 ? "pending" : "done"; 
};

// --- MOTOR DE INDICADORES ---
const evaluateIndicators = (p) => {
  const age = getAge(p.birthDate); const ageMonths = getAgeMonths(p.birthDate); const daysAge = getAgeDays(p.birthDate);
  const rules = []; let hasPending = false; const ind = p.indicators || {};

  const c1Items = [{ label: "Documento (CPF ou CNS)", status: (p.cpf || p.cns) ? "done" : "pending" }, { label: "Cadastro atualizado (12m)", status: getPeriodicStatus(ind.c1_cadastro_att, 12) }];
  if (p.conditions?.isBolsaFamilia) c1Items.push({ label: "Condicionalidades Bolsa Família (Semestral)", status: getPeriodicStatus(ind.c1_bolsa_familia, 6) });
  let isC1Ok = true; c1Items.forEach((i) => { if (i.status === "pending") { isC1Ok = false; hasPending = true; }});
  rules.push({ id: "C.1", title: "Acesso e Cadastro", icon: "📋", color: "bg-blue-500", isOk: isC1Ok, items: c1Items });

  if (ageMonths <= 24) {
    const milestones = [{ key: "c2_c15d", t: 30, l: "1ª consulta (até 30d)" }, { key: "c2_c1m", t: 30, l: "1 Mês" }, { key: "c2_c2m", t: 60, l: "2 Meses" }, { key: "c2_c4m", t: 120, l: "4 Meses" }, { key: "c2_c6m", t: 180, l: "6 Meses" }, { key: "c2_c9m", t: 270, l: "9 Meses" }, { key: "c2_c12m", t: 365, l: "12 Meses" }, { key: "c2_c18m", t: 540, l: "18 Meses" }, { key: "c2_c24m", t: 730, l: "24 Meses" }];
    let expected = 0; const mItems = milestones.map((m) => { const isDue = daysAge >= m.t - 15; if (isDue) expected++; return { label: m.l, status: getStatus(!!ind[m.key], isDue) }; });
    const acs1Due = daysAge >= 30 - 15; const acs2Due = daysAge >= 180 - 15; const wDue = expected > 0; const wOk = (ind.c2_weight || 0) >= expected;
    const items = [...mItems, { label: `Reg. peso/altura (${ind.c2_weight || 0}/${expected})`, status: getStatus(wOk, wDue) }, { label: "Visita ACS (Até 30 dias)", status: getStatus(!!ind.c2_acs1, acs1Due) }, { label: "Visita ACS (Até 6 meses)", status: getStatus(!!ind.c2_acs2, acs2Due) }, { label: "Vacinação em dia", status: getStatus(!!ind.c2_vac, true) }];
    let isOk = true; items.forEach((i) => { if (i.status === "pending") { isOk = false; hasPending = true; }});
    rules.push({ id: "C.2", title: "Desenvolvimento Infantil", icon: "👶", color: "bg-emerald-500", isOk, items });
  }

  if (p.conditions?.isGestante) {
    const items = [{ label: "1ª consulta pré-natal <12sem", status: getStatus(!!ind.c3_1st12w, true) }, { label: `7 consultas gestacionais (${ind.c3_cons || 0}/7)`, status: getStatus((ind.c3_cons || 0) >= 7, true) }, { label: `7 registros PA/Peso (${Math.min(ind.c3_pa || 0, ind.c3_peso || 0)}/7)`, status: getStatus((ind.c3_pa || 0) >= 7 && (ind.c3_peso || 0) >= 7, true) }, { label: `3 visitas ACS (${ind.c3_acs || 0}/3)`, status: getStatus((ind.c3_acs || 0) >= 3, true) }, { label: "Testes 1º Tri", status: getStatus(!!ind.c3_t1, true) }, { label: "Testes 3º Tri", status: getStatus(!!ind.c3_t3, true) }, { label: "Dose dTpa", status: getStatus(!!ind.c3_dtpa, true) }, { label: "Avaliação odontológica", status: getStatus(!!ind.c3_odonto, true) }, { label: "1 Consulta Puerpério", status: getStatus(!!ind.c3_puerpC, true) }, { label: "1 Visita ACS no Puerpério", status: getStatus(!!ind.c3_puerpAcs, true) }];
    let isOk = true; items.forEach((i) => { if (i.status === "pending") { isOk = false; hasPending = true; }});
    rules.push({ id: "C.3", title: "Gestação e Puerpério", icon: "🤰", color: "bg-purple-500", isOk, items });
  }

  if (p.conditions?.isDM) {
    const items = [{ label: "Consulta (6m)", status: getPeriodicStatus(ind.dm_cons, 6) }, { label: "Registro PA (6m)", status: getPeriodicStatus(ind.dm_pa, 6) }, { label: `2 visitas ACS (${ind.dm_acs || 0}/2)`, status: getStatus((ind.dm_acs || 0) >= 2, true) }, { label: "Reg Peso/Altura (12m)", status: getPeriodicStatus(ind.dm_peso, 12) }, { label: "HbA1c Glicada (12m)", status: getPeriodicStatus(ind.dm_hba1c, 12) }, { label: "Avaliação dos pés (12m)", status: getPeriodicStatus(ind.dm_foot, 12) }];
    let isOk = true; items.forEach((i) => { if (i.status === "pending") { isOk = false; hasPending = true; }});
    rules.push({ id: "C.4", title: "Diabetes", icon: "🩸", color: "bg-red-500", isOk, items });
  }

  if (p.conditions?.isHA) {
    const items = [{ label: "Consulta (6m)", status: getPeriodicStatus(ind.ha_cons, 6) }, { label: "Registro PA (6m)", status: getPeriodicStatus(ind.ha_pa, 6) }, { label: `2 visitas ACS (${ind.ha_acs || 0}/2)`, status: getStatus((ind.ha_acs || 0) >= 2, true) }, { label: "Reg Peso/Altura (12m)", status: getPeriodicStatus(ind.ha_peso, 12) }];
    let isOk = true; items.forEach((i) => { if (i.status === "pending") { isOk = false; hasPending = true; }});
    rules.push({ id: "C.5", title: "Hipertensão", icon: "❤️", color: "bg-rose-500", isOk, items });
  }

  if (age >= 60) {
    const items = [{ label: "Consulta (12m)", status: getPeriodicStatus(ind.id_cons, 12) }, { label: "Reg Peso/Altura (12m)", status: getPeriodicStatus(ind.id_peso, 12) }, { label: `2 visitas ACS (${ind.id_acs || 0}/2)`, status: getStatus((ind.id_acs || 0) >= 2, true) }, { label: "Vacina Influenza (12m)", status: getPeriodicStatus(ind.id_vac, 12) }];
    let isOk = true; items.forEach((i) => { if (i.status === "pending") { isOk = false; hasPending = true; }});
    rules.push({ id: "C.6", title: "Pessoa Idosa", icon: "👵", color: "bg-amber-500", isOk, items });
  }

  if (p.sex === "F" && age >= 25 && age <= 64) {
    const items = [{ label: "Citopatológico (Preventivo) em dia (36m)", status: getPeriodicStatus(ind.mulher_cito, 36) }];
    let isOk = true; items.forEach((i) => { if (i.status === "pending") { isOk = false; hasPending = true; }});
    rules.push({ id: "C.7", title: "Saúde da Mulher", icon: "🎗️", color: "bg-pink-500", isOk, items });
  }

  let daysSinceLastAcsVisit = 999;
  if (ind.lastAcsVisit) {
    const d = parseSafeDate(ind.lastAcsVisit);
    if(d) {
      d.setHours(0, 0, 0, 0); const today = new Date(); today.setHours(0, 0, 0, 0);
      daysSinceLastAcsVisit = Math.floor((today - d) / (1000 * 60 * 60 * 24));
    }
  }
  if (daysSinceLastAcsVisit > 30) hasPending = true;

  return { rules, hasPending, daysSinceLastAcsVisit };
};

// HELPER PARA CORES DAS TAGS DISCRETAS E IMPRESSÃO
function getPatientTags(patient, theme) {
  const tags = []; const c = patient.conditions || {}; const age = getAge(patient.birthDate); const ageMonths = getAgeMonths(patient.birthDate); const isDark = theme.isDark;
  const addTag = (label, color) => tags.push({ label, color });

  if (ageMonths <= 24) addTag("Infantil", isDark ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800" : "bg-emerald-50 text-emerald-700 border border-emerald-200");
  if (age >= 60) addTag("Idoso", isDark ? "bg-amber-900/40 text-amber-400 border border-amber-800" : "bg-amber-50 text-amber-700 border border-amber-200");
  if (patient.sex === "F" && age >= 25 && age <= 64) addTag("Saúde Mulher", isDark ? "bg-pink-900/40 text-pink-400 border border-pink-800" : "bg-pink-50 text-pink-700 border border-pink-200");

  if (c.isGestante) addTag("Gestante", isDark ? "bg-purple-900/40 text-purple-400 border border-purple-800" : "bg-purple-50 text-purple-700 border border-purple-200");
  if (c.isDM) addTag("Diabético", isDark ? "bg-red-900/40 text-red-400 border border-red-800" : "bg-red-50 text-red-700 border border-red-200");
  if (c.isHA) addTag("Hipertenso", isDark ? "bg-rose-900/40 text-rose-400 border border-rose-800" : "bg-rose-50 text-rose-700 border border-rose-200");
  if (c.isBolsaFamilia) addTag("Bolsa Família", isDark ? "bg-blue-900/40 text-blue-400 border border-blue-800" : "bg-blue-50 text-blue-700 border border-blue-200");

  if (c.isAcamadoDomiciliado) addTag("Acamado/Dom.", isDark ? "bg-orange-900/40 text-orange-400 border border-orange-800" : "bg-orange-50 text-orange-700 border border-orange-200");
  if (c.isPCD) addTag("PCD", isDark ? "bg-indigo-900/40 text-indigo-400 border border-indigo-800" : "bg-indigo-50 text-indigo-700 border border-indigo-200");
  if (c.isTB) addTag("Tuberculose", isDark ? "bg-cyan-900/40 text-cyan-400 border border-cyan-800" : "bg-cyan-50 text-cyan-700 border border-cyan-200");
  if (c.isHans) addTag("Hanseníase", isDark ? "bg-lime-900/40 text-lime-400 border border-lime-800" : "bg-lime-50 text-lime-700 border border-lime-200");
  if (c.isMental) addTag("Saúde Mental", isDark ? "bg-violet-900/40 text-violet-400 border border-violet-800" : "bg-violet-50 text-violet-700 border border-violet-200");
  if (c.isSmoker) addTag("Tabagismo", isDark ? "bg-stone-900/40 text-stone-400 border border-stone-800" : "bg-stone-50 text-stone-700 border border-stone-200");
  if (c.isAlcohol) addTag("Álcool", isDark ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800" : "bg-yellow-50 text-yellow-700 border border-yellow-200");
  if (c.isVulnerable) addTag("Vuln. Social", isDark ? "bg-fuchsia-900/40 text-fuchsia-400 border border-fuchsia-800" : "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200");
  if (c.isOtherChronic) addTag("Outra Crônica", isDark ? "bg-teal-900/40 text-teal-400 border border-teal-800" : "bg-teal-50 text-teal-700 border border-teal-200");

  if (c.customTags && Array.isArray(c.customTags)) {
    c.customTags.forEach(ct => addTag(ct, isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-gray-100 text-gray-700 border border-gray-200"));
  }

  return tags;
}

// --- TELA DE LOGIN ---
function LoginScreen({ theme, onLogin, error, isLoading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${theme.bg}`}>
      <div className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl ${theme.card}`}>
        <div className="flex flex-col items-center mb-8">
          <BrandLogo className="w-20 h-20 mb-4" />
          <h1 className={`text-2xl font-black ${theme.textMain}`}>ACS Pro 360</h1>
          <p className={`text-sm ${theme.textSec}`}>Sistema de Gestão APS</p>
        </div>
        
        {error && (
          <div className={`mb-4 p-3 border text-sm rounded-xl font-bold text-center ${error.includes('⚠️') ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-red-100 border-red-200 text-red-700'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>E-mail de acesso</label>
            <input 
              type="email" required 
              className={`w-full p-3 rounded-xl outline-none border focus:ring-2 focus:ring-teal-500 transition-all ${theme.input}`} 
              value={email} onChange={e => setEmail(e.target.value)} 
              placeholder="Digite seu e-mail"
            />
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Palavra-passe</label>
            <input 
              type="password" required 
              className={`w-full p-3 rounded-xl outline-none border focus:ring-2 focus:ring-teal-500 transition-all ${theme.input}`} 
              value={password} onChange={e => setPassword(e.target.value)} 
              placeholder="Sua senha secreta"
            />
          </div>
          <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  // Injeta o Tailwind via CDN
  useEffect(() => {
    if (!document.getElementById("tailwind-cdn")) {
      const script = document.createElement("script");
      script.id = "tailwind-cdn";
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);
  
  // 1. ESTADOS DE AUTENTICAÇÃO E SESSÃO REAL DO FIREBASE
  const [authUser, setAuthUser] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  
  // Monitora o status de login do Firebase
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        // Se for o seu email principal, define como master
        const role = user.email === "denilsonmaciel.acs@gmail.com" ? "master" : "user";
        setLoggedInUser({ email: user.email, role: role, uid: user.uid });
      } else {
        setLoggedInUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. TODOS OS OUTROS HOOKS (Tema, Banco Local, Pacientes, Tabs)
  const [isDarkMode, setIsDarkMode] = useState(() => safeGetItem('acs_pro_360_theme') === 'dark');
  useEffect(() => { safeSetItem('acs_pro_360_theme', isDarkMode ? 'dark' : 'light'); }, [isDarkMode]);

  const theme = {
    isDark: isDarkMode, 
    bg: isDarkMode ? "bg-slate-950" : "bg-gray-50", 
    card: isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100",
    textMain: isDarkMode ? "text-slate-100" : "text-gray-800", 
    textSec: isDarkMode ? "text-slate-400" : "text-gray-500",
    input: isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-teal-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-teal-500",
    nav: isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200", 
    divider: isDarkMode ? "border-slate-800" : "border-gray-100",
    hover: isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
  };

  const [patients, setPatients] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Busca pacientes isolados baseados no UID do usuário logado
  useEffect(() => {
    if (!authUser || !db) {
      setIsLoadingData(false); return;
    }
    setIsLoadingData(true);
    // PATH BLINDADO: Apenas este utilizador acede a esta pasta
    const q = collection(db, 'artifacts', appId, 'users', authUser.uid, 'patients');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(pts); setIsLoadingData(false);
    }, (err) => {
       console.error("Erro de permissão no Firebase. Atualizou as regras?", err);
       setIsLoadingData(false);
    });

    // Se for master, escuta a coleção de admins para ver todos os clientes
    let unsubAdmin;
    if (authUser.email === "denilsonmaciel.acs@gmail.com") {
       const adminQ = collection(db, 'artifacts', appId, 'admin_users');
       unsubAdmin = onSnapshot(adminQ, (snap) => {
          setAdminUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
       });
    }

    return () => { unsubscribe(); if (unsubAdmin) unsubAdmin(); };
  }, [authUser]);

  const processedPatients = useMemo(() => patients.map((p) => ({ ...p, evaluation: evaluateIndicators(p) })), [patients]);

  const uniqueCustomTags = useMemo(() => {
    const s = new Set();
    processedPatients.forEach(p => { if (p.conditions?.customTags) p.conditions.customTags.forEach(t => s.add(t)); });
    return Array.from(s).sort();
  }, [processedPatients]);

  const conditionFilters = [
    "Todas", "Gestante", "Diabético", "Hipertenso", "Infantil (<2a)", "Idoso (>60a)", 
    "Bolsa Família", "Acamado/Dom.", "PCD", "Saúde Mental", "Tuberculose", 
    "Hanseníase", "Outras Crônicas", "Tabagismo", "Uso de Álcool", "Vuln. Social",
    ...uniqueCustomTags
  ];

  const [currentTab, setCurrentTab] = useState("home");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMicroarea, setFilterMicroarea] = useState("Todas");
  const [filterCondition, setFilterCondition] = useState("Todas"); 
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  
  // ESTADOS PARA IMPRESSÃO EM LOTE
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState([]);

  const [acsName, setAcsName] = useState(() => safeGetItem("acsName") || "");
  const [ubsfName, setUbsfName] = useState(() => safeGetItem("ubsfName") || "");
  useEffect(() => { safeSetItem("acsName", acsName); safeSetItem("ubsfName", ubsfName); }, [acsName, ubsfName]);

  const activeSearchPatients = processedPatients.filter((p) => p.evaluation.hasPending);
  const microareas = ["Todas", ...new Set(patients.map((p) => p.microarea))].sort();

  const filteredPatients = useMemo(() => {
    return processedPatients.filter((p) => {
      const matchName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMicroarea = filterMicroarea === "Todas" || p.microarea === filterMicroarea;
      let matchCondition = true;
      if (filterCondition !== "Todas") {
        const cond = p.conditions || {}; const age = getAge(p.birthDate); const ageMonths = getAgeMonths(p.birthDate);
        switch (filterCondition) {
          case "Gestante": matchCondition = cond.isGestante; break;
          case "Diabético": matchCondition = cond.isDM; break;
          case "Hipertenso": matchCondition = cond.isHA; break;
          case "Infantil (<2a)": matchCondition = ageMonths <= 24; break;
          case "Idoso (>60a)": matchCondition = age >= 60; break;
          case "Bolsa Família": matchCondition = cond.isBolsaFamilia; break;
          case "Acamado/Dom.": matchCondition = cond.isAcamadoDomiciliado; break;
          case "PCD": matchCondition = cond.isPCD; break;
          case "Saúde Mental": matchCondition = cond.isMental; break;
          case "Tuberculose": matchCondition = cond.isTB; break;
          case "Hanseníase": matchCondition = cond.isHans; break;
          case "Outras Crônicas": matchCondition = cond.isOtherChronic; break;
          case "Tabagismo": matchCondition = cond.isSmoker; break;
          case "Uso de Álcool": matchCondition = cond.isAlcohol; break;
          case "Vuln. Social": matchCondition = cond.isVulnerable; break;
          default: matchCondition = cond.customTags?.includes(filterCondition);
        }
      }
      return matchName && matchMicroarea && matchCondition;
    });
  }, [processedPatients, searchTerm, filterMicroarea, filterCondition]);

  const paginatedPatients = useMemo(() => filteredPatients.slice(0, page * itemsPerPage), [filteredPatients, page]);
  useEffect(() => { setPage(1); }, [searchTerm, filterMicroarea, filterCondition, currentTab]);

  const reportPatients = useMemo(() => {
    return filterMicroarea === "Todas" ? processedPatients : processedPatients.filter((p) => p.microarea === filterMicroarea);
  }, [processedPatients, filterMicroarea]);

  // 4. HANDLERS FIREBASE AUTH (Seguros)
  const handleLogin = async (email, password) => {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login com sucesso, onAuthStateChanged fará o resto
    } catch (err) {
      console.error("Erro completo do Firebase no Login:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setLoginError("Credenciais inválidas ou e-mail incorreto.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setLoginError("⚠️ Domínio bloqueado! Vá no painel do Firebase > Authentication > Settings > Authorized Domains e adicione a URL da Vercel.");
      } else if (err.code === 'auth/too-many-requests') {
        setLoginError("Muitas tentativas. Sua conta foi temporariamente bloqueada por segurança.");
      } else {
        setLoginError(`Falha no login: ${err.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setShowProfileModal(false);
  };

  const handleChangePassword = async (newPassword) => {
    try {
      await updatePassword(auth.currentUser, newPassword);
      return { success: true, msg: "✅ Palavra-passe atualizada com sucesso!" };
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        return { success: false, msg: "⚠️ Saia da conta e faça login novamente para alterar a senha." };
      }
      return { success: false, msg: "❌ Erro ao alterar a senha: " + error.message };
    }
  };

  const handleUpdatePatientData = async (patientId, updatedData) => {
    // Update Otimista imediato na tela
    setPatients(prevPts => prevPts.map(p => p.id === patientId ? { ...p, ...updatedData } : p));
    
    setSelectedPatient(prev => {
      if (prev && prev.id === patientId) {
        const updated = { ...prev, ...updatedData };
        updated.evaluation = evaluateIndicators(updated);
        return updated;
      }
      return prev;
    });

    // Envio para o Firestore de fundo
    if (db && authUser) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'patients', patientId), updatedData, { merge: true });
      } catch (e) { console.error(e); }
    }
  };

  const handleAddPatient = async (newPatient) => {
    const patientWithId = { ...newPatient, id: Date.now().toString() };
    setPatients(prev => [...prev, patientWithId]); // Otimista
    setCurrentTab("list");

    if (db && authUser) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'patients', patientWithId.id), patientWithId);
      } catch(e) { console.error(e); }
    }
  };

  const handleDeletePatient = async (patientId) => {
    setPatients(prevPts => prevPts.filter(p => p.id !== patientId)); // Otimista
    setSelectedPatient(null);

    if (db && authUser) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'patients', patientId));
      } catch(e){ console.error(e); }
    }
  };

  const handleRegisterVisit = async (patientId, updates) => {
    const ptData = patients.find((p) => p.id === patientId);
    await handleUpdatePatientData(patientId, { indicators: { ...ptData.indicators, ...updates, lastAcsVisit: getTodayStr() } });
    setSelectedPatient(null);
  };

  const handlePrintSingle = (e, patient) => {
    e.stopPropagation();
    const tags = getPatientTags(patient, theme);
    const tagsHtml = tags.length > 0 ? tags.map(t => `<span style="display:inline-block; margin:2px; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold; background:#e2e8f0; color:#0f172a;">${t.label}</span>`).join('') : "Nenhuma condição específica registrada.";
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join("");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed"; iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;

    const birthObj = parseSafeDate(patient.birthDate);
    const birthStr = birthObj ? birthObj.toLocaleDateString('pt-BR') : 'Não informada';

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html><html><head><title>Ficha - ${patient.name}</title>${styles}
      <style>
        body { font-family: sans-serif; padding: 30px; color: black; background: white; }
        .header { border-bottom: 2px solid black; padding-bottom: 15px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;}
        .box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
        h1, h2, h3 { margin: 0 0 10px 0; }
        p { margin: 5px 0; font-size: 14px; }
      </style></head><body>
        <div class="header">
          <h1>${ubsfName || "UBSF - Unidade Básica de Saúde"}</h1>
          <p><strong>ACS Responsável:</strong> ${acsName || "Não informado"} | <strong>Microárea:</strong> ${patient.microarea}</p>
        </div>
        <h2>Ficha do Assistido: ${patient.name}</h2>
        <div class="grid">
          <div class="box">
            <h3>Dados Pessoais</h3>
            <p><strong>Idade:</strong> ${getAge(patient.birthDate)} anos (${birthStr})</p>
            <p><strong>Sexo:</strong> ${patient.sex === 'F' ? 'Feminino' : 'Masculino'}</p>
            <p><strong>CPF:</strong> ${patient.cpf || '-'}</p>
            <p><strong>CNS:</strong> ${patient.cns || '-'}</p>
            <p><strong>Telefone:</strong> ${patient.phone || '-'}</p>
          </div>
          <div class="box">
            <h3>Endereço</h3>
            <p><strong>CEP:</strong> ${patient.cep || '-'}</p>
            <p><strong>Rua:</strong> ${patient.logradouro || '-'} <strong>Nº:</strong> ${patient.numero || 'S/N'}</p>
            <p><strong>Bairro:</strong> ${patient.bairro || '-'}</p>
            <p><strong>Referência:</strong> ${patient.referencia || '-'}</p>
          </div>
        </div>
        <div class="box">
          <h3>Condições de Saúde e Grupos Automáticos</h3>
          <div>${tagsHtml}</div>
        </div>
      </body></html>
    `);
    iframeDoc.close();
    setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {} setTimeout(() => document.body.removeChild(iframe), 2000); }, 1000);
  };

  // IMPRESSÃO EM LOTE (BATCH)
  const handlePrintBatch = () => {
    const patientsToPrint = patients.filter(p => selectedForPrint.includes(p.id));
    if (patientsToPrint.length === 0) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join("");
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed"; iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;

    let htmlContent = patientsToPrint.map((patient, index) => {
        const tags = getPatientTags(patient, theme);
        const tagsHtml = tags.length > 0 ? tags.map(t => `<span style="display:inline-block; margin:2px; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold; background:#e2e8f0; color:#0f172a;">${t.label}</span>`).join('') : "Nenhuma condição específica registrada.";
        const birthObj = parseSafeDate(patient.birthDate);
        const birthStr = birthObj ? birthObj.toLocaleDateString('pt-BR') : 'Não informada';

        return `
          <div style="${index > 0 ? 'page-break-before: always;' : ''}">
            <div class="header">
              <h1>${ubsfName || "UBSF - Unidade Básica de Saúde"}</h1>
              <p><strong>ACS Responsável:</strong> ${acsName || "Não informado"} | <strong>Microárea:</strong> ${patient.microarea}</p>
            </div>
            <h2>Ficha do Assistido: ${patient.name}</h2>
            <div class="grid">
              <div class="box">
                <h3>Dados Pessoais</h3>
                <p><strong>Idade:</strong> ${getAge(patient.birthDate)} anos (${birthStr})</p>
                <p><strong>Sexo:</strong> ${patient.sex === 'F' ? 'Feminino' : 'Masculino'}</p>
                <p><strong>CPF:</strong> ${patient.cpf || '-'}</p>
                <p><strong>CNS:</strong> ${patient.cns || '-'}</p>
                <p><strong>Telefone:</strong> ${patient.phone || '-'}</p>
              </div>
              <div class="box">
                <h3>Endereço</h3>
                <p><strong>CEP:</strong> ${patient.cep || '-'}</p>
                <p><strong>Rua:</strong> ${patient.logradouro || '-'} <strong>Nº:</strong> ${patient.numero || 'S/N'}</p>
                <p><strong>Bairro:</strong> ${patient.bairro || '-'}</p>
                <p><strong>Referência:</strong> ${patient.referencia || '-'}</p>
              </div>
            </div>
            <div class="box">
              <h3>Condições de Saúde e Grupos Automáticos</h3>
              <div>${tagsHtml}</div>
            </div>
          </div>
        `;
    }).join('');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html><html><head><title>Fichas em Lote</title>${styles}
      <style>
        body { font-family: sans-serif; padding: 30px; color: black; background: white; }
        .header { border-bottom: 2px solid black; padding-bottom: 15px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;}
        .box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
        h1, h2, h3 { margin: 0 0 10px 0; }
        p { margin: 5px 0; font-size: 14px; }
      </style></head><body>
        ${htmlContent}
      </body></html>
    `);
    iframeDoc.close();
    setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {} setTimeout(() => document.body.removeChild(iframe), 2000); }, 1000);

    // Fecha o modo de seleção após imprimir
    setIsSelectionMode(false);
    setSelectedForPrint([]);
  };

  const handlePrintReport = () => {
    const contentElement = document.getElementById("report-content");
    if (!contentElement) return;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join("");
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed"; iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html><html><head><title>Relatório - ACS Pro 360</title>${styles}
      <style>
        @page { size: A4; margin: 10mm; }
        body { background: white !important; margin: 0; padding: 0; font-family: sans-serif; font-size: 11px; }
        .print\\:hidden { display: none !important; } .hidden.print\\:flex { display: flex !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        #report-content * { color: #000 !important; border-color: #ccc !important; }
        .bg-emerald-500 { background-color: #10b981 !important; color: white !important; }
        .bg-purple-500 { background-color: #a855f7 !important; color: white !important; }
        .bg-red-500 { background-color: #ef4444 !important; color: white !important; }
        .bg-rose-500 { background-color: #f43f5e !important; color: white !important; }
        .bg-amber-500 { background-color: #f59e0b !important; color: white !important; }
        .bg-pink-500 { background-color: #ec4899 !important; color: white !important; }
        
        /* Ajustes para encaixar em 1 página A4 */
        .mb-4 { margin-bottom: 0.5rem !important; }
        .p-4 { padding: 0.5rem !important; }
        .text-sm { font-size: 10px !important; }
        .text-xs { font-size: 9px !important; }
        h2, h3, h4 { margin: 0 0 5px 0 !important; font-size: 12px !important; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem !important; }
        .border { page-break-inside: avoid; break-inside: avoid; }
      </style></head><body>${contentElement.innerHTML}</body></html>
    `);
    iframeDoc.close();
    setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {} setTimeout(() => document.body.removeChild(iframe), 2000); }, 1000);
  };

  // 5. TELA DE LOGIN (Mostra se não estiver logado)
  if (!loggedInUser) {
    return <LoginScreen theme={theme} onLogin={handleLogin} error={loginError} isLoading={isLoggingIn} />;
  }

  // 6. USUÁRIO LOGADO NO APLICATIVO
  const appUser = loggedInUser;

  // 7. RENDERIZAÇÃO DO APLICATIVO PRINCIPAL
  return (
    <div className={`flex justify-center min-h-screen font-sans print:bg-white transition-colors duration-300 ${theme.bg}`}>
      <div className={`w-full max-w-md ${theme.bg} flex flex-col min-h-screen shadow-2xl relative overflow-hidden print:max-w-none print:shadow-none print:bg-white transition-colors duration-300`}>
        <header className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-4 shadow-md rounded-b-2xl z-10 flex-shrink-0 print:hidden">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <BrandLogo className="w-10 h-10 drop-shadow-md" />
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-wide">{APP_NAME}</h1>
                <button onClick={() => setShowProfileModal(true)} className="text-teal-100 text-[10px] flex items-center bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full mt-1 transition cursor-pointer">
                  <User className="w-3 h-3 mr-1" /> {appUser.email} <Pencil className="w-2 h-2 ml-1" />
                </button>
              </div>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-white/10 p-2.5 rounded-full text-white hover:bg-white/20 transition shadow-sm ml-2">
              {isDarkMode ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          
          {currentTab === "list" && (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Buscar paciente..." className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none ${theme.input}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto pb-24 p-4 print:pb-0 print:p-2 print:overflow-visible relative">
          {isLoadingData && patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 pt-10">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <p className={`text-sm font-bold ${theme.textSec}`}>Sincronizando dados seguros...</p>
            </div>
          ) : (
            <>
              {currentTab === "home" && (
                <div className="space-y-6 animate-in fade-in">
                  <div className={`${theme.card} p-4 rounded-2xl shadow-sm border`}>
                    <h2 className={`${theme.textSec} text-xs font-bold tracking-wider uppercase mb-3`}>Sua Microárea</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard theme={theme} icon={<Users />} title="Total Assistidos" value={patients.length} color={isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-600"} />
                      <StatCard theme={theme} icon={<BellRing />} title="Busca Ativa" value={activeSearchPatients.length} color={activeSearchPatients.length > 0 ? (isDarkMode ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-600") : (isDarkMode ? "bg-emerald-900/40 text-emerald-400" : "bg-green-100 text-green-600")} onClick={() => setCurrentTab("search_active")} />
                    </div>
                  </div>

                  <div>
                    <h2 className={`${theme.textSec} text-xs font-bold tracking-wider uppercase mb-3`}>Grupos Prioritários</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <GroupCard theme={theme} icon="🤰" title="Gestantes" count={patients.filter((p) => p.conditions?.isGestante).length} />
                      <GroupCard theme={theme} icon="👶" title="Infantil (<2a)" count={patients.filter((p) => getAgeMonths(p.birthDate) <= 24).length} />
                      <GroupCard theme={theme} icon="🩸" title="Diabéticos" count={patients.filter((p) => p.conditions?.isDM).length} />
                      <GroupCard theme={theme} icon="❤️" title="Hipertensos" count={patients.filter((p) => p.conditions?.isHA).length} />
                      <GroupCard theme={theme} icon="👵" title="Idosos (>60a)" count={patients.filter((p) => getAge(p.birthDate) >= 60).length} />
                      <GroupCard theme={theme} icon="📄" title="Bolsa Família" count={patients.filter((p) => p.conditions?.isBolsaFamilia).length} />
                    </div>
                  </div>
                </div>
              )}

              {currentTab === "list" && (
                <div className="space-y-4 animate-in fade-in pb-8">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className={`${theme.textMain} font-bold`}>Pacientes ({filteredPatients.length})</h2>
                    <div className="flex space-x-2">
                      {/* BOTÃO DE SELEÇÃO EM LOTE */}
                      <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedForPrint([]); }} 
                        className={`p-2 rounded-lg transition-colors ${isSelectionMode ? 'bg-teal-600 text-white' : (theme.isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-gray-600 border-gray-200')} border shadow-sm`}
                        title="Imprimir em Lote"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <select className={`text-sm rounded-lg px-2 py-1 outline-none shadow-sm border ${theme.input}`} value={filterMicroarea} onChange={(e) => setFilterMicroarea(e.target.value)}>
                        {microareas.map((m) => <option key={m} value={m}>{m === "Todas" ? "M.A Todas" : `M.A ${m}`}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* BARRA DE FILTROS DESLIZANTE */}
                  <div className="flex overflow-x-auto space-x-2 pb-2 mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {conditionFilters.map(cond => (
                      <button
                        key={cond} onClick={() => setFilterCondition(cond)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filterCondition === cond ? "bg-teal-600 text-white shadow-md" : (theme.isDark ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>

                  {paginatedPatients.length === 0 ? (
                    <div className={`text-center py-10 rounded-2xl border border-dashed ${theme.isDark ? 'border-slate-800 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
                      <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhum paciente encontrado.</p>
                    </div>
                  ) : (
                    paginatedPatients.map((p) => (
                      <PatientListItem 
                        key={p.id} patient={p} theme={theme} filterCondition={filterCondition} 
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedForPrint.includes(p.id)}
                        onToggleSelect={() => {
                          setSelectedForPrint(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])
                        }}
                        onClick={() => setSelectedPatient(p)} 
                        onPrint={(e) => handlePrintSingle(e, p)} 
                      />
                    ))
                  )}

                  {/* Botão de Paginação UI */}
                  {filteredPatients.length > page * itemsPerPage && (
                    <button onClick={() => setPage(p => p + 1)} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm border ${theme.isDark ? 'bg-slate-800 text-teal-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-teal-600 border-gray-200 hover:bg-gray-50'}`}>
                      <ChevronDown className="w-5 h-5 mr-2" /> Carregar Mais
                    </button>
                  )}
                </div>
              )}

              {currentTab === "search_active" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className={`${theme.isDark ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50 border-red-100'} p-4 rounded-2xl border mb-6`}>
                    <div className={`flex items-center space-x-2 mb-2 ${theme.isDark ? 'text-red-400' : 'text-red-700'}`}><AlertTriangle className="h-5 w-5" /><h2 className="font-bold">Ação Necessária</h2></div>
                    <p className={`text-xs ${theme.isDark ? 'text-red-300' : 'text-red-600'}`}>Pacientes atrasados ou com indicadores vencendo em até 15 dias.</p>
                  </div>
                  {activeSearchPatients.length === 0 ? (
                    <div className={`text-center py-10 rounded-2xl border ${theme.isDark ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2" /><p className="font-bold">Tudo em dia!</p>
                    </div>
                  ) : activeSearchPatients.map((p) => <PatientListItem key={p.id} patient={p} theme={theme} onClick={() => setSelectedPatient(p)} isAlert onPrint={(e) => handlePrintSingle(e, p)} />)}
                </div>
              )}

              {currentTab === "reports" && (
                <div id="report-content" className="space-y-4 animate-in fade-in print:p-0 print:space-y-4 print:bg-white pb-10">
                  <div className={`${theme.card} p-4 rounded-2xl shadow-sm border mb-4 print:hidden`}>
                    <h4 className={`font-bold ${theme.textMain} text-sm mb-3`}>Dados para Impressão (Timbrado)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><label className={`block text-xs font-bold ${theme.textSec} mb-1`}>Nome do ACS</label><input type="text" className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} value={acsName} onChange={(e) => setAcsName(e.target.value)} /></div>
                      <div><label className={`block text-xs font-bold ${theme.textSec} mb-1`}>Nome da UBSF</label><input type="text" className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} value={ubsfName} onChange={(e) => setUbsfName(e.target.value)} /></div>
                    </div>
                  </div>

                  <div className="hidden print:flex flex-col border-b-2 border-black pb-4 mb-6 print:bg-white print:text-black">
                    <div className="flex justify-between items-end">
                      <div>
                        <h1 className="text-2xl font-black uppercase tracking-wide text-black">{ubsfName || "NOME DA UBSF"}</h1>
                        <p className="text-lg font-bold mt-1 text-black">ACS: <span className="font-normal text-black">{acsName || "NOME DO AGENTE"}</span></p>
                        <p className="text-md font-bold text-black">Microárea(s): <span className="font-normal text-black">{filterMicroarea === "Todas" ? microareas.filter((m) => m !== "Todas").join(", ") : filterMicroarea}</span></p>
                      </div>
                      <div className="text-right text-black">
                        <p className="text-lg font-black uppercase text-black">Relatório de Metas</p>
                        <p className="text-md font-bold text-black">Programa Saúde Brasil 360</p>
                        <p className="text-md mt-1 text-black">Data: {new Date().toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${theme.isDark ? 'bg-blue-900/20 border-blue-900/50' : 'bg-blue-50 border-blue-100'} p-4 rounded-2xl border mb-4 flex items-center justify-between print:hidden`}>
                    <div className="flex items-center">
                      <PieChart className={`h-8 w-8 mr-3 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      <div>
                        <h2 className={`font-bold text-xl ${theme.isDark ? 'text-blue-300' : 'text-blue-800'}`}>Relatório Mensal de Metas</h2>
                        <p className={`text-xs ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>Situação atual da {filterMicroarea === "Todas" ? "equipe" : `MA ${filterMicroarea}`}</p>
                      </div>
                    </div>
                    <button onClick={handlePrintReport} className={`print:hidden flex items-center justify-center border px-3 py-2 rounded-xl text-sm font-bold transition shadow-sm ${theme.isDark ? 'bg-slate-800 border-slate-600 text-blue-400 hover:bg-slate-700' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-100'}`}><Printer className="w-4 h-4 mr-2" /> Imprimir</button>
                  </div>

                  <ReportSection theme={theme} title="C.1 Acesso e Cadastro" icon="📋" patients={reportPatients} ruleId="C.1" color={theme.isDark ? "bg-blue-900" : "bg-blue-50"} textColor={theme.isDark ? "text-blue-400" : "text-blue-700"} />
                  <ReportSection theme={theme} title="C.2 Infantil (<2 anos)" icon="👶" patients={reportPatients.filter((p) => getAgeMonths(p.birthDate) <= 24)} ruleId="C.2" color={theme.isDark ? "bg-emerald-900" : "bg-emerald-50"} textColor={theme.isDark ? "text-emerald-400" : "text-emerald-700"} />
                  <ReportSection theme={theme} title="C.3 Gestação" icon="🤰" patients={reportPatients.filter((p) => p.conditions?.isGestante)} ruleId="C.3" color={theme.isDark ? "bg-purple-900" : "bg-purple-50"} textColor={theme.isDark ? "text-purple-400" : "text-purple-700"} />
                  <ReportSection theme={theme} title="C.4 Diabetes" icon="🩸" patients={reportPatients.filter((p) => p.conditions?.isDM)} ruleId="C.4" color={theme.isDark ? "bg-red-900" : "bg-red-50"} textColor={theme.isDark ? "text-red-400" : "text-red-700"} />
                  <ReportSection theme={theme} title="C.5 Hipertensão" icon="❤️" patients={reportPatients.filter((p) => p.conditions?.isHA)} ruleId="C.5" color={theme.isDark ? "bg-rose-900" : "bg-rose-50"} textColor={theme.isDark ? "text-rose-400" : "text-rose-700"} />
                  <ReportSection theme={theme} title="C.6 Idoso (>60)" icon="👵" patients={reportPatients.filter((p) => getAge(p.birthDate) >= 60)} ruleId="C.6" color={theme.isDark ? "bg-amber-900" : "bg-amber-50"} textColor={theme.isDark ? "text-amber-400" : "text-amber-700"} />
                  <ReportSection theme={theme} title="C.7 Saúde da Mulher" icon="🎗️" patients={reportPatients.filter((p) => p.sex === "F" && getAge(p.birthDate) >= 25 && getAge(p.birthDate) <= 64)} ruleId="C.7" color={theme.isDark ? "bg-pink-900" : "bg-pink-50"} textColor={theme.isDark ? "text-pink-400" : "text-pink-700"} />
                </div>
              )}

              {currentTab === "add" && <PatientForm theme={theme} onSave={handleAddPatient} onCancel={() => setCurrentTab("home")} />}
              
              {currentTab === "admin" && appUser.role === "master" && (
                <AdminPanel 
                  theme={theme} 
                  adminAuth={adminAuth}
                  db={db}
                />
              )}
            </>
          )}

          {/* FLOAT BAR DE IMPRESSÃO EM LOTE */}
          {isSelectionMode && currentTab === "list" && (
            <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white px-5 py-3 rounded-full shadow-2xl z-40 flex items-center space-x-3 w-11/12 max-w-sm justify-between animate-in slide-in-from-bottom-5`}>
              <span className="font-bold text-sm ml-2">{selectedForPrint.length} ficha(s)</span>
              <div className="flex space-x-2">
                <button onClick={() => { setIsSelectionMode(false); setSelectedForPrint([]); }} className="p-2 bg-teal-700 rounded-full hover:bg-teal-800 transition"><X className="w-4 h-4" /></button>
                <button onClick={handlePrintBatch} disabled={selectedForPrint.length === 0} className="flex items-center px-4 py-2 bg-white text-teal-700 rounded-full text-xs font-bold disabled:opacity-50 transition active:scale-95"><Printer className="w-4 h-4 mr-2"/> Imprimir Lote</button>
              </div>
            </div>
          )}

        </main>

        <nav className={`absolute bottom-0 w-full ${theme.nav} border-t flex justify-between px-4 pb-safe shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)] z-20 rounded-t-2xl print:hidden`}>
          <NavBtn theme={theme} icon={<Home />} label="Início" active={currentTab === "home"} onClick={() => setCurrentTab("home")} />
          <NavBtn theme={theme} icon={<Users />} label="Pacientes" active={currentTab === "list"} onClick={() => setCurrentTab("list")} />
          <div className="-mt-6 flex-shrink-0">
            <button onClick={() => setCurrentTab("add")} className="bg-gradient-to-tr from-teal-500 to-blue-600 text-white p-4 rounded-full shadow-lg border-4 border-transparent dark:border-slate-800 transform transition active:scale-95"><Plus className="h-6 w-6" /></button>
          </div>
          <NavBtn theme={theme} icon={<PieChart />} label="Relatórios" active={currentTab === "reports"} onClick={() => setCurrentTab("reports")} />
          {appUser.role === "master" ? (
            <NavBtn theme={theme} icon={<Settings />} label="Acessos" active={currentTab === "admin"} onClick={() => setCurrentTab("admin")} />
          ) : (
            <NavBtn theme={theme} icon={<BellRing />} label="Alertas" active={currentTab === "search_active"} onClick={() => setCurrentTab("search_active")} badge={processedPatients.filter(p=>p.evaluation.hasPending).length} />
          )}
        </nav>

        {selectedPatient && <PatientDetailsModal patient={selectedPatient} theme={theme} onClose={() => setSelectedPatient(null)} onRegisterVisit={handleRegisterVisit} onUpdateData={handleUpdatePatientData} onDelete={handleDeletePatient} />}
        {showProfileModal && <UserProfileModal user={appUser} theme={theme} onClose={() => setShowProfileModal(false)} onLogout={handleLogout} onChangePassword={handleChangePassword} />}
      </div>
    </div>
  );
}

// --- ADMIN PANEL COM CRIAÇÃO NO FIREBASE ---
function AdminPanel({ theme, db, adminAuth }) {
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [adminUsersList, setAdminUsersList] = useState([]);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'artifacts', 'acs-pro-360', 'admin_users'), snap => {
      setAdminUsersList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [db]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setIsCreating(true); setMsg("");
    try {
      const cred = await createUserWithEmailAndPassword(adminAuth, newEmail, newPassword);
      await setDoc(doc(db, 'artifacts', 'acs-pro-360', 'admin_users', cred.user.uid), {
        email: newEmail.toLowerCase(), role: 'user', active: true, createdAt: getTodayStr()
      });
      await signOut(adminAuth);
      setMsg("✅ Conta de cliente criada com sucesso!");
      setNewEmail(""); setNewPassword("");
    } catch (err) { setMsg(`❌ Erro: ${err.message}`); } finally { setIsCreating(false); }
  };

  const handleToggleAccess = async (uid, currentStatus) => {
    try { await setDoc(doc(db, 'artifacts', 'acs-pro-360', 'admin_users', uid), { active: !currentStatus }, { merge: true }); } catch(e){}
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-2xl shadow-md text-white border border-slate-700">
        <h2 className="font-black text-lg flex items-center mb-1"><KeyRound className="w-5 h-5 mr-2 text-teal-400" /> Venda de Acessos</h2>
        <p className="text-xs text-slate-400 mb-4">Cria contas blindadas e isoladas no servidor.</p>
        {msg && <div className="mb-3 text-xs font-bold p-2 bg-slate-800 rounded-lg">{msg}</div>}
        <form onSubmit={handleAddUser} className="mt-4 space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <input type="email" required placeholder="E-mail do cliente" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <input type="text" required placeholder="Crie uma palavra-passe" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button type="submit" disabled={isCreating} className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 font-bold py-3 rounded-lg text-sm transition flex justify-center items-center">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Conta de Acesso"}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className={`font-bold text-sm ${theme.textMain}`}>Clientes Ativos ({adminUsersList.length})</h3>
        {adminUsersList.length === 0 && <p className={`text-xs ${theme.textSec}`}>Nenhuma conta criada pelo painel ainda.</p>}
        {adminUsersList.map((u) => (
          <div key={u.id} className={`${theme.card} p-4 rounded-xl shadow-sm border ${u.active ? "" : (theme.isDark ? "border-red-900/50 bg-red-900/10" : "border-red-200 bg-red-50")}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className={`font-bold text-sm ${theme.textMain}`}>{u.email}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${u.active ? (theme.isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700") : (theme.isDark ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700")}`}>
                  {u.active ? "LIBERADO" : "BLOQUEADO"}
                </span>
              </div>
              {u.role !== "master" && (
                <button onClick={() => handleToggleAccess(u.id, u.active)} className={`p-2 rounded-lg transition-colors ${u.active ? (theme.isDark ? "bg-red-900/30 text-red-400 hover:bg-red-900/50" : "bg-red-100 text-red-600 hover:bg-red-200") : (theme.isDark ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200")}`}>
                  <Power className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- PERFIL DO PACIENTE (MODAL) ---
function PatientDetailsModal({ patient, theme, onClose, onRegisterVisit, onUpdateData, onDelete }) {
  const [isVisiting, setIsVisiting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [fU, setFU] = useState({ ...patient.indicators });
  const [aiInsight, setAiInsight] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const { evaluation, conditions } = patient;
  const ageMonths = getAgeMonths(patient.birthDate);
  const age = getAge(patient.birthDate);

  const toggleVal = (field) => setFU((prev) => ({ ...prev, [field]: !prev[field] }));
  const incVal = (field) => setFU((prev) => { const newVal = (prev[field] || 0) + 1; return { ...prev, [field]: newVal }; });
  const decVal = (field) => setFU((prev) => { const newVal = Math.max(0, (prev[field] || 0) - 1); return { ...prev, [field]: newVal }; });
  const setDate = (field) => setFU((prev) => ({ ...prev, [field]: getTodayStr() }));

  const tags = getPatientTags(patient, theme);

  const fetchAiInsight = async () => {
    setIsAiLoading(true); setAiError(null);
    const pendingItems = evaluation.rules.map((r) => r.items.filter((i) => i.status === "pending").map((i) => i.label).join(", ")).filter((r) => r.length > 0).join("; ");
    const tagsString = tags.map(t => t.label).join(", ");

    const prompt = `Como assistente para Agentes Comunitários de Saúde, ajude a preparar a visita de hoje para este paciente:
    - Nome: ${patient.name}, ${age} anos.
    - Condições/Marcadores: ${tagsString || "Geral"}.
    - Pendências: ${pendingItems || "Rotina."}
    Dê dicas curtas: 1. Empatia ao abordar. 2. Como convencer a resolver as pendências.`;

    try { 
      const result = await generateAiBriefing(prompt);
      setAiInsight(result); 
    } catch (err) { 
      setAiError("Falha ao conectar com IA."); 
    } finally { 
      setIsAiLoading(false); 
    }
  };

  const renderMarkdown = (text) => text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return <p key={i} className={`mb-2 text-sm ${theme.isDark ? 'text-indigo-300' : 'text-purple-900'}`}>{parts.map((part, j) => part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part)}</p>;
  });

  const handleUpdateInfo = (updatedPatientData) => {
    onUpdateData(patient.id, updatedPatientData);
    setIsEditing(false);
  };

  return (
    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in">
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`${theme.card} rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${theme.isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'}`}><Trash2 className="w-6 h-6" /></div>
            <h3 className={`font-bold text-lg mb-2 ${theme.textMain}`}>Excluir Assistido?</h3>
            <p className={`text-sm mb-6 ${theme.textSec}`}>Esta ação não pode ser desfeita. Todos os dados e visitas registradas de <b>{patient.name}</b> serão perdidos permanentemente.</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${theme.isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
              <button onClick={() => { onDelete(patient.id); onClose(); }} className="flex-1 bg-red-600 py-3 rounded-xl font-bold text-white shadow-lg hover:bg-red-700">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      <div className={`${theme.bg} w-full h-[95%] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative slide-in-from-bottom-full duration-300`}>
        <div className={`${theme.card} px-5 py-4 border-b flex justify-between items-center sticky top-0 z-10 flex-shrink-0`}>
          <div className="flex items-center space-x-3">
            {!isEditing && <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${theme.isDark ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>{patient.name.charAt(0)}</div>}
            <div>
              <h2 className={`font-bold leading-tight truncate w-40 ${theme.textMain}`}>{isEditing ? "Editar Assistido" : patient.name}</h2>
              {!isEditing && <p className={`text-xs ${theme.textSec}`}>{age} anos • MA {patient.microarea}</p>}
            </div>
          </div>
          <div className="flex space-x-2">
            {!isEditing && !isVisiting && (
              <>
                <button onClick={() => setIsEditing(true)} className={`p-2 rounded-full transition-colors ${theme.isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}><Pencil className="w-5 h-5" /></button>
                <button onClick={() => setShowDeleteConfirm(true)} className={`p-2 rounded-full transition-colors ${theme.isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}><Trash2 className="w-5 h-5" /></button>
              </>
            )}
            <button onClick={isEditing ? () => setIsEditing(false) : onClose} className={`p-2 rounded-full transition-colors ${theme.isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {isEditing ? (
            <PatientForm theme={theme} initialData={patient} onSave={handleUpdateInfo} onCancel={() => setIsEditing(false)} />
          ) : !isVisiting ? (
            <div className="space-y-4">
              <div className={`${theme.card} p-4 rounded-2xl shadow-sm border mb-4`}>
                <h4 className={`font-bold text-sm mb-3 ${theme.textMain}`}>Informações Pessoais</h4>
                <div className="space-y-2">
                  <div className={`flex items-center text-sm ${theme.textSec}`}><CreditCard className="w-4 h-4 mr-2 text-teal-600 flex-shrink-0" /> <span className={`font-bold mr-1 ${theme.textMain}`}>CPF:</span> {patient.cpf || "-"}</div>
                  <div className={`flex items-center text-sm ${theme.textSec}`}><FileText className="w-4 h-4 mr-2 text-teal-600 flex-shrink-0" /> <span className={`font-bold mr-1 ${theme.textMain}`}>CNS:</span> {patient.cns || "-"}</div>
                  <div className={`flex items-center text-sm ${theme.textSec}`}><Phone className="w-4 h-4 mr-2 text-teal-600 flex-shrink-0" /> <span className={`font-bold mr-1 ${theme.textMain}`}>Contato:</span> {patient.phone || "-"}</div>
                  <div className={`flex items-start text-sm ${theme.textSec}`}><MapPin className="w-4 h-4 mr-2 text-teal-600 mt-0.5 flex-shrink-0" /><div><span className={`font-bold ${theme.textMain}`}>Endereço:</span><br />{patient.logradouro ? `${patient.logradouro}, ${patient.numero || "S/N"} - ${patient.bairro || ""}` : patient.address || "-"}<br /><span className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>{patient.referencia ? `Ref: ${patient.referencia}` : ""}</span></div></div>
                </div>

                {tags.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${theme.isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                    <span className={`block text-[10px] font-bold mb-2 uppercase tracking-wider ${theme.textSec}`}>Condições e Marcadores</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t, idx) => <span key={idx} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${t.color}`}>{t.label}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {!aiInsight && !isAiLoading && (
                <button onClick={fetchAiInsight} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-4 font-bold shadow-md flex items-center justify-center hover:opacity-90 transition active:scale-95"><Sparkles className="w-5 h-5 mr-2" /> ✨ Copiloto IA: Preparar Visita</button>
              )}

              {isAiLoading && (
                <div className={`p-4 rounded-2xl flex flex-col items-center justify-center border ${theme.isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-purple-50 border-purple-200'}`}><Loader2 className="w-6 h-6 animate-spin text-purple-600 mb-2" /><p className={`text-xs font-medium ${theme.isDark ? 'text-indigo-300' : 'text-purple-700'}`}>Gerando dicas...</p></div>
              )}

              {aiInsight && (
                <div className={`border p-4 rounded-2xl relative shadow-sm animate-in zoom-in-95 ${theme.isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-purple-50 border-purple-200'}`}>
                  <button onClick={() => setAiInsight(null)} className={`absolute top-3 right-3 p-1 rounded-full ${theme.isDark ? 'bg-indigo-900/40 text-indigo-400 hover:bg-indigo-900/60' : 'bg-purple-100 text-purple-500 hover:bg-purple-200'}`}><X className="w-4 h-4" /></button>
                  <h4 className={`font-black flex items-center mb-3 ${theme.isDark ? 'text-indigo-400' : 'text-purple-800'}`}><Bot className={`w-5 h-5 mr-2 ${theme.isDark ? 'text-indigo-400' : 'text-purple-600'}`} /> Dicas do Copiloto ✨</h4>
                  {renderMarkdown(aiInsight)}
                </div>
              )}

              {evaluation.rules.length === 0 ? (
                <div className={`text-center py-8 rounded-2xl border border-dashed mt-4 ${theme.isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-gray-200 text-gray-400'}`}><User className="w-10 h-10 mx-auto mb-2 opacity-50" /> Sem indicadores prioritários para o perfil.</div>
              ) : (
                evaluation.rules.map((rule) => (
                  <div key={rule.id} className={`${theme.card} rounded-[20px] shadow-sm border overflow-hidden mb-4 mt-2`}>
                    <div className={`${rule.color} px-4 py-3 flex items-center text-white`}><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-xl shadow-sm mr-3">{rule.icon}</div><div><span className="text-[10px] font-black tracking-widest text-white/80">{rule.id}</span><h4 className="font-bold text-[15px] leading-tight">{rule.title}</h4></div></div>
                    <div className={`p-4 space-y-3 ${theme.isDark ? 'bg-slate-800/50' : 'bg-gray-50/50'}`}>
                      <p className={`text-xs font-bold mb-2 ${theme.textSec}`}>SITUAÇÃO ATUAL:</p>
                      {rule.items.map((item, idx) => (
                        <div key={idx} className="flex items-start">
                          <div className="mt-0.5 mr-3 flex-shrink-0">{item.status === "done" ? <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-emerald-600" /></div> : item.status === "pending" ? <div className="w-4 h-4 rounded-full bg-red-50 border border-red-200 flex items-center justify-center"><X className="w-2.5 h-2.5 text-red-400" /></div> : <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center"><div className="w-2 h-0.5 bg-gray-400 rounded-full" /></div>}</div>
                          <span className={`text-xs ${item.status === "done" ? (theme.isDark ? "text-slate-500 line-through" : "text-gray-500 line-through") : item.status === "future" ? (theme.isDark ? "text-slate-600" : "text-gray-400") : `${theme.textMain} font-medium`}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in pb-10">
              <h3 className={`font-black text-lg mb-2 ${theme.textMain}`}>Atualizar Indicadores</h3>
              <p className={`text-sm mb-4 ${theme.textSec}`}>Marque apenas o que foi realizado hoje.</p>

              <FormGroup theme={theme} title="C.1 Acesso e Cadastro" color="blue">
                <div className="space-y-2">
                  <ActionDateBtn theme={theme} label="Atualização Cadastral do Indivíduo" date={fU.c1_cadastro_att} onClick={() => setDate("c1_cadastro_att")} />
                  {conditions?.isBolsaFamilia && <ActionDateBtn theme={theme} label="Acompanhamento Bolsa Família" date={fU.c1_bolsa_familia} onClick={() => setDate("c1_bolsa_familia")} />}
                </div>
              </FormGroup>

              {ageMonths <= 24 && (
                <FormGroup theme={theme} title="C.2 Desenvolvimento Infantil" color="emerald">
                  <div className="mb-3"><p className={`text-xs font-bold mb-2 ${theme.textSec}`}>Consultas:</p>
                    <div className="grid grid-cols-2 gap-2"><CheckboxBtn theme={theme} label="1ª (até 30d)" checked={fU.c2_c15d} onClick={() => toggleVal("c2_c15d")} /><CheckboxBtn theme={theme} label="1 Mês" checked={fU.c2_c1m} onClick={() => toggleVal("c2_c1m")} /><CheckboxBtn theme={theme} label="2 Meses" checked={fU.c2_c2m} onClick={() => toggleVal("c2_c2m")} /><CheckboxBtn theme={theme} label="4 Meses" checked={fU.c2_c4m} onClick={() => toggleVal("c2_c4m")} /><CheckboxBtn theme={theme} label="6 Meses" checked={fU.c2_c6m} onClick={() => toggleVal("c2_c6m")} /><CheckboxBtn theme={theme} label="9 Meses" checked={fU.c2_c9m} onClick={() => toggleVal("c2_c9m")} /><CheckboxBtn theme={theme} label="12 Meses" checked={fU.c2_c12m} onClick={() => toggleVal("c2_c12m")} /><CheckboxBtn theme={theme} label="18 Meses" checked={fU.c2_c18m} onClick={() => toggleVal("c2_c18m")} /><CheckboxBtn theme={theme} label="24 Meses" checked={fU.c2_c24m} onClick={() => toggleVal("c2_c24m")} /></div>
                  </div>
                  <div className="space-y-2">
                    <CheckboxBtn theme={theme} label="1ª Visita ACS (Até 30 dias)" checked={fU.c2_acs1} onClick={() => toggleVal("c2_acs1")} block />
                    <CheckboxBtn theme={theme} label="2ª Visita ACS (Até 6 meses)" checked={fU.c2_acs2} onClick={() => toggleVal("c2_acs2")} block />
                    <CounterBtn theme={theme} label="Registros de Peso/Altura" count={fU.c2_weight || 0} onInc={() => incVal("c2_weight")} onDec={() => decVal("c2_weight")} target={9} />
                    <CheckboxBtn theme={theme} label="Vacinação Recomendada em dia?" checked={fU.c2_vac} onClick={() => toggleVal("c2_vac")} block />
                  </div>
                </FormGroup>
              )}

              {conditions?.isGestante && (
                <FormGroup theme={theme} title="C.3 Gestação e Puerpério" color="purple">
                  <div className="space-y-3">
                    <CheckboxBtn theme={theme} label="1ª Consulta de Pré-Natal (< 12ª Sem)" checked={fU.c3_1st12w} onClick={() => toggleVal("c3_1st12w")} block />
                    <CounterBtn theme={theme} label="Consultas Realizadas" count={fU.c3_cons || 0} onInc={() => incVal("c3_cons")} onDec={() => decVal("c3_cons")} target={7} />
                    <CounterBtn theme={theme} label="Aferições de PA" count={fU.c3_pa || 0} onInc={() => incVal("c3_pa")} onDec={() => decVal("c3_pa")} target={7} />
                    <CounterBtn theme={theme} label="Aferições de Peso" count={fU.c3_peso || 0} onInc={() => incVal("c3_peso")} onDec={() => decVal("c3_peso")} target={7} />
                    <CounterBtn theme={theme} label="Visitas ACS" count={fU.c3_acs || 0} onInc={() => incVal("c3_acs")} onDec={() => decVal("c3_acs")} target={3} />
                    <div className={`${theme.card} p-3 rounded-xl border`}>
                      <div className="space-y-2"><CheckboxBtn theme={theme} label="Testes Rápidos 1º Tri" checked={fU.c3_t1} onClick={() => toggleVal("c3_t1")} block /><CheckboxBtn theme={theme} label="Testes Rápidos 3º Tri" checked={fU.c3_t3} onClick={() => toggleVal("c3_t3")} block /><CheckboxBtn theme={theme} label="Vacina dTpa (> 20ª sem)" checked={fU.c3_dtpa} onClick={() => toggleVal("c3_dtpa")} block /><CheckboxBtn theme={theme} label="Avaliação Odontológica" checked={fU.c3_odonto} onClick={() => toggleVal("c3_odonto")} block /></div>
                    </div>
                    <div className={`${theme.isDark ? 'bg-purple-900/20 border-purple-900/50' : 'bg-purple-50 border-purple-100'} p-3 rounded-xl border`}>
                      <p className={`text-xs font-bold mb-2 ${theme.isDark ? 'text-purple-400' : 'text-purple-800'}`}>Pós-Parto (Puerpério):</p>
                      <div className="space-y-2"><CheckboxBtn theme={theme} label="Consulta Puerperal (Méd/Enf)" checked={fU.c3_puerpC} onClick={() => toggleVal("c3_puerpC")} block /><CheckboxBtn theme={theme} label="Visita ACS Puerpério" checked={fU.c3_puerpAcs} onClick={() => toggleVal("c3_puerpAcs")} block /></div>
                    </div>
                  </div>
                </FormGroup>
              )}

              {conditions?.isDM && (
                <FormGroup theme={theme} title="C.4 Diabetes" color="red">
                  <div className="space-y-2">
                    <ActionDateBtn theme={theme} label="Consulta Méd/Enf" date={fU.dm_cons} onClick={() => setDate("dm_cons")} />
                    <ActionDateBtn theme={theme} label="Registro de P.A" date={fU.dm_pa} onClick={() => setDate("dm_pa")} />
                    <ActionDateBtn theme={theme} label="Registro Peso/Altura" date={fU.dm_peso} onClick={() => setDate("dm_peso")} />
                    <ActionDateBtn theme={theme} label="Hemoglobina Glicada" date={fU.dm_hba1c} onClick={() => setDate("dm_hba1c")} />
                    <ActionDateBtn theme={theme} label="Avaliação dos Pés" date={fU.dm_foot} onClick={() => setDate("dm_foot")} />
                    <CounterBtn theme={theme} label="Visitas ACS" count={fU.dm_acs || 0} onInc={() => incVal("dm_acs")} onDec={() => decVal("dm_acs")} target={2} />
                  </div>
                </FormGroup>
              )}

              {conditions?.isHA && (
                <FormGroup theme={theme} title="C.5 Hipertensão" color="rose">
                  <div className="space-y-2">
                    <ActionDateBtn theme={theme} label="Consulta Méd/Enf" date={fU.ha_cons} onClick={() => setDate("ha_cons")} />
                    <ActionDateBtn theme={theme} label="Registro de P.A" date={fU.ha_pa} onClick={() => setDate("ha_pa")} />
                    <ActionDateBtn theme={theme} label="Registro Peso/Altura" date={fU.ha_peso} onClick={() => setDate("ha_peso")} />
                    <CounterBtn theme={theme} label="Visitas ACS" count={fU.ha_acs || 0} onInc={() => incVal("ha_acs")} onDec={() => decVal("ha_acs")} target={2} />
                  </div>
                </FormGroup>
              )}

              {age >= 60 && (
                <FormGroup theme={theme} title="C.6 Pessoa Idosa" color="amber">
                  <div className="space-y-2">
                    <ActionDateBtn theme={theme} label="Consulta Méd/Enf" date={fU.id_cons} onClick={() => setDate("id_cons")} />
                    <ActionDateBtn theme={theme} label="Registro Peso/Altura" date={fU.id_peso} onClick={() => setDate("id_peso")} />
                    <ActionDateBtn theme={theme} label="Vacina Influenza" date={fU.id_vac} onClick={() => setDate("id_vac")} />
                    <CounterBtn theme={theme} label="Visitas ACS" count={fU.id_acs || 0} onInc={() => incVal("id_acs")} onDec={() => decVal("id_acs")} target={2} />
                  </div>
                </FormGroup>
              )}

              {patient.sex === "F" && age >= 25 && age <= 64 && (
                <FormGroup theme={theme} title="C.7 Saúde da Mulher" color="pink">
                  <div className="space-y-2">
                    <ActionDateBtn theme={theme} label="Exame Preventivo" date={fU.mulher_cito} onClick={() => setDate("mulher_cito")} />
                  </div>
                </FormGroup>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className={`absolute bottom-0 w-full ${theme.card} p-4 border-t shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] flex-shrink-0`}>
            {!isVisiting ? (
              <button onClick={() => setIsVisiting(true)} className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex justify-center hover:bg-teal-700 transition">
                <MapPin className="w-5 h-5 mr-2" /> Iniciar Visita e Checklist
              </button>
            ) : (
              <div className="flex space-x-3">
                <button onClick={() => setIsVisiting(false)} className={`flex-1 font-bold py-3.5 rounded-xl transition ${theme.isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                <button onClick={() => onRegisterVisit(patient.id, fU)} className="flex-[2] bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex justify-center hover:bg-teal-700 transition">
                  <Check className="w-5 h-5 mr-2" /> Salvar Visita
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PatientForm({ theme, initialData, onSave, onCancel }) {
  const [f, setF] = useState(() => {
    if (initialData) {
      return {
        name: initialData.name || "", birthDate: initialData.birthDate || "", sex: initialData.sex || "F", microarea: initialData.microarea || "", cpf: initialData.cpf || "", cns: initialData.cns || "",
        phone: initialData.phone || "", address: initialData.address || "", cep: initialData.cep || "", logradouro: initialData.logradouro || "", numero: initialData.numero || "", bairro: initialData.bairro || "", cidade: initialData.cidade || "", uf: initialData.uf || "", referencia: initialData.referencia || "",
        isGestante: initialData.conditions?.isGestante || false, gestanteText: initialData.conditions?.gestanteText || "",
        isHA: initialData.conditions?.isHA || false, haText: initialData.conditions?.haText || "",
        isDM: initialData.conditions?.isDM || false, dmText: initialData.conditions?.dmText || "",
        isBolsaFamilia: initialData.conditions?.isBolsaFamilia || false, bolsaFamiliaText: initialData.conditions?.bolsaFamiliaText || "",
        isAcamadoDomiciliado: initialData.conditions?.isAcamadoDomiciliado || false, acamadoDomiciliadoText: initialData.conditions?.acamadoDomiciliadoText || "",
        isPCD: initialData.conditions?.isPCD || false, pcdText: initialData.conditions?.pcdText || "",
        isTB: initialData.conditions?.isTB || false, tbText: initialData.conditions?.tbText || "",
        isHans: initialData.conditions?.isHans || false, hansText: initialData.conditions?.hansText || "",
        isMental: initialData.conditions?.isMental || false, mentalText: initialData.conditions?.mentalText || "",
        isSmoker: initialData.conditions?.isSmoker || false, smokerText: initialData.conditions?.smokerText || "",
        isAlcohol: initialData.conditions?.isAlcohol || false, alcoholText: initialData.conditions?.alcoholText || "",
        isVulnerable: initialData.conditions?.isVulnerable || false, vulnerableText: initialData.conditions?.vulnerableText || "",
        isOtherChronic: initialData.conditions?.isOtherChronic || false, otherChronicText: initialData.conditions?.otherChronicText || "",
        customTags: initialData.conditions?.customTags || []
      };
    }
    return {
      name: "", birthDate: "", sex: "F", microarea: "", cpf: "", cns: "", phone: "", address: "", cep: "", logradouro: "", numero: "", bairro: "", cidade: "", uf: "", referencia: "",
      isGestante: false, gestanteText: "", isHA: false, haText: "", isDM: false, dmText: "", isBolsaFamilia: false, bolsaFamiliaText: "",
      isAcamadoDomiciliado: false, acamadoDomiciliadoText: "", isPCD: false, pcdText: "", isTB: false, tbText: "", isHans: false, hansText: "", 
      isMental: false, mentalText: "", isSmoker: false, smokerText: "", isAlcohol: false, alcoholText: "", isVulnerable: false, vulnerableText: "", isOtherChronic: false, otherChronicText: "", customTags: []
    };
  });

  const [newTagInput, setNewTagInput] = useState("");
  const ageMonths = f.birthDate ? getAgeMonths(f.birthDate) : 999;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (f.name && f.birthDate && f.microarea) {
      const payload = {
        name: f.name, birthDate: f.birthDate, sex: f.sex, microarea: f.microarea, cpf: f.cpf, cns: f.cns,
        phone: f.phone, address: f.address, cep: f.cep, logradouro: f.logradouro, numero: f.numero, bairro: f.bairro, cidade: f.cidade, uf: f.uf, referencia: f.referencia,
        conditions: { 
          isGestante: f.isGestante, gestanteText: f.isGestante ? f.gestanteText : "", isHA: f.isHA, haText: f.isHA ? f.haText : "", isDM: f.isDM, dmText: f.isDM ? f.dmText : "",
          isBolsaFamilia: f.isBolsaFamilia, bolsaFamiliaText: f.isBolsaFamilia ? f.bolsaFamiliaText : "", isAcamadoDomiciliado: f.isAcamadoDomiciliado, acamadoDomiciliadoText: f.isAcamadoDomiciliado ? f.acamadoDomiciliadoText : "",
          isPCD: f.isPCD, pcdText: f.isPCD ? f.pcdText : "", isTB: f.isTB, tbText: f.isTB ? f.tbText : "", isHans: f.isHans, hansText: f.isHans ? f.hansText : "",
          isMental: f.isMental, mentalText: f.isMental ? f.mentalText : "", isSmoker: f.isSmoker, smokerText: f.isSmoker ? f.smokerText : "",
          isAlcohol: f.isAlcohol, alcoholText: f.isAlcohol ? f.alcoholText : "", isVulnerable: f.isVulnerable, vulnerableText: f.isVulnerable ? f.vulnerableText : "",
          isOtherChronic: f.isOtherChronic, otherChronicText: f.isOtherChronic ? f.otherChronicText : "", customTags: f.customTags
        },
      };
      if (!initialData) payload.indicators = {};
      onSave(payload);
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim()) { setF(p => ({ ...p, customTags: [...p.customTags, newTagInput.trim()] })); setNewTagInput(""); }
  };

  const handleDictation = (field, newText) => {
    if (field === 'newTagInput') { setNewTagInput(p => p ? `${p} ${newText}` : newText); return; }
    setF(prev => {
      let val = prev[field] ? `${prev[field]} ${newText}` : newText;
      if (field === 'cep') {
        val = val.replace(/\D/g, "");
        if (val.length === 8) {
          fetch(`https://viacep.com.br/ws/${val}/json/`).then(r => r.json()).then(data => {
            if (!data.erro) setF(p => ({ ...p, logradouro: data.logradouro || "", bairro: data.bairro || "", cidade: data.localidade || "", uf: data.uf || "" }));
          }).catch(() => {});
        }
      }
      return { ...prev, [field]: val };
    });
  };

  const handleCepChange = (e) => {
    let val = e.target.value.replace(/\D/g, ""); setF({ ...f, cep: val });
    if (val.length === 8) {
      fetch(`https://viacep.com.br/ws/${val}/json/`).then(r => r.json()).then(data => {
        if (!data.erro) setF((prev) => ({ ...prev, logradouro: data.logradouro || "", bairro: data.bairro || "", cidade: data.localidade || "", uf: data.uf || "" }));
      }).catch(() => {});
    }
  };

  return (
    <div className={`${theme.card} rounded-2xl shadow-sm border ${initialData ? "p-0 border-0 shadow-none" : "p-5"}`}>
      {!initialData && <h2 className={`font-bold mb-4 ${theme.textMain}`}>Novo Assistido</h2>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Nome Completo</label>
          <div className="relative">
            <input type="text" required className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <VoiceBtn theme={theme} onResult={(t) => handleDictation('name', t)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Data Nasc.</label><input type="date" required className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></div>
          <div><label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Sexo</label><select className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value })}><option value="F">Feminino</option><option value="M">Masculino</option></select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>CPF</label>
            <div className="relative">
              <input type="text" className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} placeholder="Apenas números" />
              <VoiceBtn theme={theme} onResult={(t) => handleDictation('cpf', t)} />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>CNS</label>
            <div className="relative">
              <input type="text" className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.cns} onChange={(e) => setF({ ...f, cns: e.target.value })} placeholder="Apenas números" />
              <VoiceBtn theme={theme} onResult={(t) => handleDictation('cns', t)} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Contato (Tel)</label>
            <div className="relative">
              <input type="tel" className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(00) 00000-0000" />
              <VoiceBtn theme={theme} onResult={(t) => handleDictation('phone', t)} />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Microárea</label>
            <div className="relative">
              <input type="text" required className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.microarea} onChange={(e) => setF({ ...f, microarea: e.target.value })} placeholder="Ex: 01" />
              <VoiceBtn theme={theme} onResult={(t) => handleDictation('microarea', t)} />
            </div>
          </div>
        </div>
        
        <div className={`pt-2 pb-1 border-t mt-2 ${theme.divider}`}>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-teal-600 mb-2">Endereço (Busca por CEP)</label>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-1">
              <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>CEP</label>
              <div className="relative">
                <input type="text" className={`w-full border border-teal-500/30 rounded-xl p-3 pr-8 outline-none focus:ring-2 focus:ring-teal-500 ${theme.isDark ? 'bg-teal-900/20 text-teal-100' : 'bg-teal-50 text-teal-900'}`} value={f.cep} onChange={handleCepChange} placeholder="00000000" maxLength="8" />
                <VoiceBtn theme={theme} small onResult={(t) => handleDictation('cep', t)} />
              </div>
            </div>
            <div className="col-span-2">
              <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Rua</label>
              <div className="relative">
                <input type="text" className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.logradouro} onChange={(e) => setF({ ...f, logradouro: e.target.value })} placeholder="Ex: Rua das Flores" />
                <VoiceBtn theme={theme} onResult={(t) => handleDictation('logradouro', t)} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-1">
              <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Número</label>
              <div className="relative">
                <input type="text" className={`w-full border rounded-xl p-3 pr-8 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} placeholder="Ex: 123" />
                <VoiceBtn theme={theme} small onResult={(t) => handleDictation('numero', t)} />
              </div>
            </div>
            <div className="col-span-2">
              <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Bairro</label>
              <div className="relative">
                <input type="text" className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })} placeholder="Ex: Centro" />
                <VoiceBtn theme={theme} onResult={(t) => handleDictation('bairro', t)} />
              </div>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${theme.textSec}`}>Complemento / Referência</label>
            <div className="relative">
              <input type="text" className={`w-full border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} placeholder="Ex: Próximo à padaria" />
              <VoiceBtn theme={theme} onResult={(t) => handleDictation('referencia', t)} />
            </div>
          </div>
        </div>

        <div className={`pt-2 border-t ${theme.divider}`}>
          <label className={`block text-xs font-bold mb-2 ${theme.textSec}`}>Programa Saúde Brasil 360</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setF({ ...f, isGestante: !f.isGestante })} disabled={f.sex === "M"} className={`border p-2 rounded-xl text-xs font-bold ${f.sex === "M" ? (theme.isDark ? "opacity-50 bg-slate-800 border-slate-700 text-slate-500" : "opacity-50 bg-gray-50 border-gray-200 text-gray-400") : f.isGestante ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🤰 Gestante</button>
            <button type="button" onClick={() => setF({ ...f, isDM: !f.isDM })} className={`border p-2 rounded-xl text-xs font-bold ${f.isDM ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🩸 Diabético</button>
            <button type="button" onClick={() => setF({ ...f, isHA: !f.isHA })} className={`border p-2 rounded-xl text-xs font-bold ${f.isHA ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>❤️ Hipertenso</button>
            <button type="button" onClick={() => setF({ ...f, isBolsaFamilia: !f.isBolsaFamilia })} className={`border p-2 rounded-xl text-xs font-bold ${f.isBolsaFamilia ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>📄 Bolsa Família</button>
          </div>

          {(f.isGestante || f.isDM || f.isHA || f.isBolsaFamilia) && (
            <div className="mt-3 space-y-2 animate-in fade-in">
              {f.isGestante && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Gestante (ex: DUM, IG)</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.gestanteText} onChange={(e) => setF({ ...f, gestanteText: e.target.value })} placeholder="Semanas?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('gestanteText', t)} />
                  </div>
                </div>
              )}
              {f.isDM && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Diabetes (ex: Tipo, Insulina)</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.dmText} onChange={(e) => setF({ ...f, dmText: e.target.value })} placeholder="Especifique..." />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('dmText', t)} />
                  </div>
                </div>
              )}
              {f.isHA && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Hipertensão</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.haText} onChange={(e) => setF({ ...f, haText: e.target.value })} placeholder="Especifique..." />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('haText', t)} />
                  </div>
                </div>
              )}
              {f.isBolsaFamilia && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Bolsa Família (NIS)</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.bolsaFamiliaText} onChange={(e) => setF({ ...f, bolsaFamiliaText: e.target.value })} placeholder="NIS..." />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('bolsaFamiliaText', t)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`pt-2 border-t ${theme.divider}`}>
          <label className={`block text-xs font-bold mb-2 ${theme.textSec}`}>Condições Adicionais (e-SUS)</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setF({ ...f, isAcamadoDomiciliado: !f.isAcamadoDomiciliado })} className={`border p-2 rounded-xl text-xs font-bold ${f.isAcamadoDomiciliado ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🛏️/🏠 Acamado/Dom.</button>
            <button type="button" onClick={() => setF({ ...f, isPCD: !f.isPCD })} className={`border p-2 rounded-xl text-xs font-bold ${f.isPCD ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🦽 PCD</button>
            <button type="button" onClick={() => setF({ ...f, isMental: !f.isMental })} className={`border p-2 rounded-xl text-xs font-bold ${f.isMental ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🧠 Saúde Mental</button>
            <button type="button" onClick={() => setF({ ...f, isTB: !f.isTB })} className={`border p-2 rounded-xl text-xs font-bold ${f.isTB ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🫁 Tuberculose</button>
            <button type="button" onClick={() => setF({ ...f, isHans: !f.isHans })} className={`border p-2 rounded-xl text-xs font-bold ${f.isHans ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🦠 Hanseníase</button>
            <button type="button" onClick={() => setF({ ...f, isOtherChronic: !f.isOtherChronic })} className={`border p-2 rounded-xl text-xs font-bold ${f.isOtherChronic ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🩺 Outras Crônicas</button>
            <button type="button" onClick={() => setF({ ...f, isSmoker: !f.isSmoker })} className={`border p-2 rounded-xl text-xs font-bold ${f.isSmoker ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🚬 Tabagismo</button>
            <button type="button" onClick={() => setF({ ...f, isAlcohol: !f.isAlcohol })} className={`border p-2 rounded-xl text-xs font-bold ${f.isAlcohol ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>🍺 Uso de Álcool</button>
            <button type="button" onClick={() => setF({ ...f, isVulnerable: !f.isVulnerable })} className={`col-span-2 border p-2 rounded-xl text-xs font-bold ${f.isVulnerable ? "bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white text-gray-600 border-gray-300")}`}>⚠️ Vulnerabilidade Social</button>
          </div>

          {(f.isMental || f.isOtherChronic || f.isAcamadoDomiciliado || f.isPCD || f.isTB || f.isHans || f.isSmoker || f.isAlcohol || f.isVulnerable) && (
            <div className="mt-3 space-y-2 animate-in fade-in">
              {f.isAcamadoDomiciliado && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Acamado/Domiciliado</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.acamadoDomiciliadoText} onChange={(e) => setF({ ...f, acamadoDomiciliadoText: e.target.value })} placeholder="Tempo? Motivo?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('acamadoDomiciliadoText', t)} />
                  </div>
                </div>
              )}
              {f.isPCD && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: PCD</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.pcdText} onChange={(e) => setF({ ...f, pcdText: e.target.value })} placeholder="Tipo de deficiência?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('pcdText', t)} />
                  </div>
                </div>
              )}
              {f.isMental && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Saúde Mental</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.mentalText} onChange={(e) => setF({ ...f, mentalText: e.target.value })} placeholder="Qual?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('mentalText', t)} />
                  </div>
                </div>
              )}
              {f.isTB && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Tuberculose</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.tbText} onChange={(e) => setF({ ...f, tbText: e.target.value })} placeholder="Em tratamento?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('tbText', t)} />
                  </div>
                </div>
              )}
              {f.isHans && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Hanseníase</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.hansText} onChange={(e) => setF({ ...f, hansText: e.target.value })} placeholder="Em tratamento?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('hansText', t)} />
                  </div>
                </div>
              )}
              {f.isOtherChronic && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Doença Crônica</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.otherChronicText} onChange={(e) => setF({ ...f, otherChronicText: e.target.value })} placeholder="Qual?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('otherChronicText', t)} />
                  </div>
                </div>
              )}
              {f.isSmoker && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Tabagismo</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.smokerText} onChange={(e) => setF({ ...f, smokerText: e.target.value })} placeholder="Frequência?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('smokerText', t)} />
                  </div>
                </div>
              )}
              {f.isAlcohol && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Uso de Álcool</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.alcoholText} onChange={(e) => setF({ ...f, alcoholText: e.target.value })} placeholder="Frequência?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('alcoholText', t)} />
                  </div>
                </div>
              )}
              {f.isVulnerable && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${theme.textSec}`}>Detalhes: Vulnerabilidade Social</label>
                  <div className="relative">
                    <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={f.vulnerableText} onChange={(e) => setF({ ...f, vulnerableText: e.target.value })} placeholder="Situação?" />
                    <VoiceBtn theme={theme} small onResult={(t) => handleDictation('vulnerableText', t)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`pt-3 pb-2 border-t ${theme.divider}`}>
          <label className={`block text-xs font-bold mb-2 ${theme.textSec}`}>Adicionar Outras Condições Livres (Tags)</label>
          <div className="flex space-x-2 mb-3">
            <div className="relative flex-1">
              <input type="text" className={`w-full border rounded-lg p-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-teal-500 ${theme.input}`} value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} placeholder="Ex: Criança, Asma, Autismo..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} />
              <VoiceBtn theme={theme} small onResult={(t) => handleDictation('newTagInput', t)} />
            </div>
            <button type="button" onClick={handleAddTag} className="bg-teal-600 hover:bg-teal-700 text-white font-bold w-10 rounded-lg flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {f.customTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 animate-in fade-in">
              {f.customTags.map(tag => (
                <span key={tag} className={`flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${theme.isDark ? 'bg-teal-900/30 border-teal-800 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                  {tag} <button type="button" onClick={() => setF(p => ({...p, customTags: p.customTags.filter(t => t !== tag)}))} className="ml-1.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {parseSafeDate(f.birthDate) && (
          <div className={`pt-2 p-3 rounded-xl border ${theme.isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
            <label className={`block text-[10px] uppercase tracking-wider font-bold mb-2 ${theme.textSec}`}>Grupos Automáticos (Saúde 360)</label>
            <div className="flex flex-wrap gap-2">
              {ageMonths <= 24 && <span className={`px-2 py-1 rounded text-[10px] font-bold ${theme.isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>👶 Infantil (C.2)</span>}
              {getAge(f.birthDate) >= 60 && <span className={`px-2 py-1 rounded text-[10px] font-bold ${theme.isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>👵 Idoso (C.6)</span>}
              {f.sex === "F" && getAge(f.birthDate) >= 25 && getAge(f.birthDate) <= 64 && <span className={`px-2 py-1 rounded text-[10px] font-bold ${theme.isDark ? 'bg-pink-900/40 text-pink-400' : 'bg-pink-100 text-pink-700'}`}>🎗️ Prev. Mulher (C.7)</span>}
              {ageMonths > 24 && getAge(f.birthDate) < 60 && !(f.sex === "F" && getAge(f.birthDate) >= 25 && getAge(f.birthDate) <= 64) && <span className={`text-xs font-medium ${theme.textSec}`}>Nenhum grupo detectado.</span>}
            </div>
          </div>
        )}

        <div className={`flex space-x-3 pt-4 border-t pb-4 ${theme.divider}`}>
          <button type="button" onClick={onCancel} className={`flex-1 font-bold py-3 rounded-xl transition-colors ${theme.isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
          <button type="submit" className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition">Salvar</button>
        </div>
      </form>
    </div>
  );
}

function UserProfileModal({ user, theme, onClose, onLogout, onChangePassword }) {
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (newPwd.length < 6) { setMsg("A senha deve ter no mínimo 6 caracteres."); return; }
    setIsUpdating(true);
    const res = await onChangePassword(newPwd);
    setMsg(res.msg);
    if(res.success) setNewPwd("");
    setIsUpdating(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${theme.card} rounded-3xl p-6 w-full max-w-sm animate-in zoom-in-95 shadow-2xl relative`}>
        <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${theme.isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${theme.isDark ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-100 text-teal-600'}`}>
            <User className="w-8 h-8" />
          </div>
          <h3 className={`font-bold text-lg ${theme.textMain}`}>O Meu Perfil</h3>
          <p className={`text-sm ${theme.textSec}`}>{user.email}</p>
          <span className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${theme.isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
            Conta {user.role === 'master' ? 'Administrador' : 'Agente'}
          </span>
        </div>

        <div className={`mb-6 pt-4 border-t ${theme.divider}`}>
          <label className={`block text-xs font-bold mb-2 ${theme.textSec}`}>Alterar Senha Pessoal</label>
          {msg && <div className={`mb-3 text-[10px] font-bold p-2 rounded-lg ${msg.includes('✅') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{msg}</div>}
          <div className="flex space-x-2">
            <input type="text" placeholder="Nova senha" className={`flex-1 rounded-xl p-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 ${theme.input}`} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            <button onClick={handleUpdate} disabled={isUpdating} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <button onClick={onLogout} className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm ${theme.isDark ? 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'}`}>
          <LogOut className="w-5 h-5 mr-2" /> Sair da Conta
        </button>
      </div>
    </div>
  );
}

function FormGroup({ title, color, theme, children }) {
  const isDark = theme.isDark;
  let bgClass, borderClass, textClass;

  if (color === 'blue') { bgClass = isDark ? 'bg-blue-900/20' : 'bg-blue-50'; borderClass = isDark ? 'border-blue-900/50' : 'border-blue-200'; textClass = isDark ? 'text-blue-400' : 'text-blue-800'; }
  else if (color === 'emerald') { bgClass = isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'; borderClass = isDark ? 'border-emerald-900/50' : 'border-emerald-200'; textClass = isDark ? 'text-emerald-400' : 'text-emerald-800'; }
  else if (color === 'purple') { bgClass = isDark ? 'bg-purple-900/20' : 'bg-purple-50'; borderClass = isDark ? 'border-purple-900/50' : 'border-purple-200'; textClass = isDark ? 'text-purple-400' : 'text-purple-800'; }
  else if (color === 'red') { bgClass = isDark ? 'bg-red-900/20' : 'bg-red-50'; borderClass = isDark ? 'border-red-900/50' : 'border-red-200'; textClass = isDark ? 'text-red-400' : 'text-red-800'; }
  else if (color === 'rose') { bgClass = isDark ? 'bg-rose-900/20' : 'bg-rose-50'; borderClass = isDark ? 'border-rose-900/50' : 'border-rose-200'; textClass = isDark ? 'text-rose-400' : 'text-rose-800'; }
  else if (color === 'amber') { bgClass = isDark ? 'bg-amber-900/20' : 'bg-amber-50'; borderClass = isDark ? 'border-amber-900/50' : 'border-amber-200'; textClass = isDark ? 'text-amber-400' : 'text-amber-800'; }
  else if (color === 'pink') { bgClass = isDark ? 'bg-pink-900/20' : 'bg-pink-50'; borderClass = isDark ? 'border-pink-900/50' : 'border-pink-200'; textClass = isDark ? 'text-pink-400' : 'text-pink-800'; }

  return (
    <div className={`p-4 rounded-2xl border ${borderClass} ${bgClass} shadow-sm`}>
      <h4 className={`font-bold ${textClass} mb-3 text-sm flex items-center`}>{title}</h4>
      {children}
    </div>
  );
}

function CheckboxBtn({ label, checked, onClick, block, theme }) {
  return (
    <button onClick={(e) => { e.preventDefault(); onClick(); }} className={`flex items-center p-2.5 rounded-lg border text-left transition-all ${block ? "w-full" : "flex-1"} ${checked ? "bg-teal-600 border-teal-700 text-white shadow-inner" : (theme.isDark ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50")}`}>
      <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 flex-shrink-0 ${checked ? "border-white bg-teal-500" : (theme.isDark ? "border-slate-500" : "border-gray-300")}`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-[11px] font-bold leading-tight">{label}</span>
    </button>
  );
}

function CounterBtn({ label, count, onInc, onDec, target, theme }) {
  return (
    <div className={`flex justify-between items-center p-3 rounded-lg border ${theme.card}`}>
      <span className={`text-xs font-bold ${theme.textMain}`}>{label}</span>
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-black w-8 text-center ${theme.textMain}`}>{Number(count) || 0}/{target}</span>
        <div className="flex space-x-1">
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDec(); }} className={`w-8 h-8 rounded-md flex justify-center items-center font-bold active:scale-95 transition ${theme.isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>-</button>
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInc(); }} className={`w-8 h-8 rounded-md flex justify-center items-center font-bold active:scale-95 transition ${theme.isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>+</button>
        </div>
      </div>
    </div>
  );
}

function ActionDateBtn({ label, date, onClick, theme }) {
  const dObj = parseSafeDate(date);
  const dStr = dObj ? dObj.toLocaleDateString("pt-BR") : "Pendente";
  return (
    <div className={`flex justify-between items-center p-3 rounded-lg border ${theme.card}`}>
      <div>
        <span className={`block text-xs font-bold ${theme.textMain}`}>{label}</span>
        <span className={`text-[10px] font-bold ${date ? (theme.isDark ? "text-teal-400" : "text-teal-600") : (theme.isDark ? "text-red-400" : "text-red-500")}`}>Último: {dStr}</span>
      </div>
      <button onClick={(e) => { e.preventDefault(); onClick(); }} className={`text-[10px] font-bold py-1.5 px-2 rounded-md transition border uppercase ${theme.isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'}`}>Marcar Hoje</button>
    </div>
  );
}

function ReportSection({ title, icon, patients, ruleId, color, textColor, theme }) {
  const total = patients.length;
  const inCompliance = patients.filter((p) => p.evaluation.rules.find((r) => r.id === ruleId)?.isOk).length;
  const percentage = total === 0 ? 0 : Math.round((inCompliance / total) * 100);

  return (
    <div className={`${theme.card} rounded-2xl shadow-sm border p-4 print:border-gray-300 print:shadow-none print:break-inside-avoid print:bg-white`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-bold ${textColor} flex items-center print:text-black`}><span className="mr-2 text-xl">{icon}</span> {title}</h3>
      </div>
      {total === 0 ? (
        <p className={`text-xs ${theme.textSec} print:text-gray-600`}>Nenhum paciente neste grupo.</p>
      ) : (
        <>
          <div className="flex justify-between text-sm mb-1"><span className={`${theme.textSec} print:text-black`}>Pacientes em dia:</span><span className={`font-bold ${theme.textMain} print:text-black`}>{inCompliance} de {total}</span></div>
          <div className={`w-full rounded-full h-3 mb-2 overflow-hidden print:border print:border-gray-400 print:bg-white ${theme.isDark ? 'bg-slate-700' : 'bg-gray-100'}`}><div className={`${color.replace("50", "500").replace("900", "500")} h-3 rounded-full print:bg-black`} style={{ width: `${percentage}%` }}></div></div>
          <p className={`text-xs text-right font-bold ${theme.textSec} print:text-black`}>{percentage}% da meta alcançada</p>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, color, onClick, theme }) {
  return (
    <div onClick={onClick} className={`${theme.isDark ? 'bg-slate-800 hover:border-slate-600' : 'bg-gray-50 hover:border-gray-200'} rounded-xl p-3 flex flex-col justify-between cursor-pointer border border-transparent transition-colors`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color} mb-2`}>{React.cloneElement(icon, { className: "h-4 w-4" })}</div>
      <p className={`text-2xl font-black ${theme.textMain}`}>{value}</p>
      <p className={`text-xs font-medium ${theme.textSec}`}>{title}</p>
    </div>
  );
}

function GroupCard({ icon, title, count, theme }) {
  return (
    <div className={`${theme.card} rounded-xl p-3 border shadow-sm flex items-center space-x-3`}>
      <div className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center ${theme.isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>{icon}</div>
      <div><p className={`text-xs font-medium ${theme.textSec}`}>{title}</p><p className={`text-lg font-bold ${theme.textMain}`}>{count}</p></div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, badge, theme }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-14 py-2 relative transition-colors ${active ? "text-teal-600 dark:text-teal-400" : (theme.isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600")}`}>
      {badge > 0 ? (<span className={`absolute top-1 right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 ${theme.isDark ? 'border-slate-950' : 'border-white'}`}>{badge}</span>) : null}
      {React.cloneElement(icon, { className: `h-6 w-6 mb-1 ${active ? "fill-teal-50 dark:fill-teal-900/30" : ""}` })}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function PatientListItem({ patient, onClick, filterCondition, isAlert, onPrint, isSelectionMode, isSelected, onToggleSelect, theme }) {
  const { evaluation } = patient;
  const tags = getPatientTags(patient, theme);

  return (
    <div className={`${theme.card} rounded-2xl p-4 shadow-sm border relative transition-all hover:shadow-md ${isAlert ? (theme.isDark ? "border-l-4 border-l-red-500" : "border-red-200 border-l-4 border-l-red-500") : (theme.isDark ? "border-l-4 border-l-teal-500" : "border-gray-100 border-l-4 border-l-teal-500")} ${isSelected ? 'ring-2 ring-teal-500' : ''}`}>
      <div className="flex justify-between items-start">
        {/* CHECKBOX DE SELEÇÃO */}
        {isSelectionMode && (
          <div className="mr-3 mt-1" onClick={onToggleSelect}>
             <div className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-teal-600 border-teal-600' : (theme.isDark ? 'border-slate-600' : 'border-gray-300')}`}>
               {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
             </div>
          </div>
        )}

        <div className="flex-1 pr-2 cursor-pointer" onClick={isSelectionMode ? onToggleSelect : onClick}>
          <h3 className={`font-bold text-[15px] leading-tight mb-1 ${theme.textMain}`}>{patient.name}</h3>
          <p className={`text-xs ${theme.textSec}`}>{getAge(patient.birthDate)} anos • MA: {patient.microarea}</p>
          
          {(!filterCondition || filterCondition === "Todas") && tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((t, idx) => (
                <span key={idx} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${t.color}`}>
                  {t.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        
        <div className="flex items-center space-x-2">
          {onPrint && !isSelectionMode && (
            <button onClick={onPrint} title="Imprimir Ficha" className={`p-1.5 rounded-lg transition-colors ${theme.isDark ? "text-blue-400 hover:bg-blue-900/40" : "text-blue-600 hover:bg-blue-50"}`}>
              <Notebook className="w-5 h-5" />
            </button>
          )}
          <div className={`${evaluation.hasPending ? (theme.isDark ? "bg-red-900/40 text-red-400" : "bg-red-50 text-red-600") : (theme.isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-600")} p-1.5 rounded-lg flex items-center`}>
            {evaluation.hasPending ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
        </div>
      </div>
    </div>
  );
}
