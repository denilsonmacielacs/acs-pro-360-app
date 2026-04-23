import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  BellRing,
  Search,
  Home,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Plus,
  Check,
  PieChart,
  AlertTriangle,
  Loader2,
  Lock,
  Mail,
  LogOut,
  Settings,
  Power,
  KeyRound,
  Sparkles,
  Bot,
  Pencil,
  Trash2,
  Phone,
  CreditCard,
  FileText,
  Printer,
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// --- GEMINI API SETUP ---
// ATENÇÃO: Quando for publicar na Vercel, coloque a sua chave do Google AI Studio aqui!
const apiKey = "";

const generateAiBriefing = async (prompt, retries = 5, delay = 1000) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: {
            parts: [
              {
                text: "Você é um assistente especialista na Atenção Primária à Saúde (APS) do Brasil. Seu objetivo é ajudar Agentes Comunitários de Saúde (ACS) dando dicas práticas, empáticas e curtas de como abordar pacientes durante visitas domiciliares.",
              },
            ],
          },
        }),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Não foi possível gerar a sugestão no momento."
      );
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
};

// --- FIREBASE SETUP BLINDADO ---
// Este código garante que se a configuração do ambiente falhar, ele usa a sua conta oficial do Firebase.
let firebaseConfig;
try {
  firebaseConfig =
    typeof __firebase_config !== "undefined" &&
    __firebase_config &&
    __firebase_config !== "{}"
      ? JSON.parse(__firebase_config)
      : null;
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error("Configuração do ambiente inválida ou vazia.");
  }
} catch (e) {
  // A sua configuração oficial do Firebase
  firebaseConfig = {
    apiKey: "AIzaSyDrEkPB1PRlqqZ4vLaSlej6SAU-XeAdDeE",
    authDomain: "acs-pro-360.firebaseapp.com",
    projectId: "acs-pro-360",
    storageBucket: "acs-pro-360.firebasestorage.app",
    messagingSenderId: "440842746827",
    appId: "1:440842746827:web:f4145c197db749b3c7d44e",
  };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId =
  typeof __app_id !== "undefined" && __app_id
    ? __app_id
    : "acs-pro-360-oficial";

const APP_NAME = "ACS Pro 360";

function BrandLogo({ className = "w-8 h-8" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor="#000"
            floodOpacity="0.2"
          />
        </filter>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="url(#logoGrad)"
        filter="url(#shadow)"
      />
      <path
        d="M28 40 A 24 24 0 0 1 72 40"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M72 40 L 72 32 M72 40 L 64 40"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M72 60 A 24 24 0 0 1 28 60"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M28 60 L 28 68 M28 60 L 36 60"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 42 V 58 M42 50 H 58"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// --- FUNÇÕES ÚTEIS E DE TEMPO INTELIGENTE ---
const getTodayStr = () => new Date().toISOString().split("T")[0];

const getAgeDays = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  birth.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - birth) / (1000 * 60 * 60 * 24));
};

const getAgeMonths = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  return (
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth())
  );
};

const getAge = (birthDate) => Math.floor(getAgeMonths(birthDate) / 12);
const sanitizeEmail = (email) => email.toLowerCase().replace(/[@.]/g, "_");

const getStatus = (isDone, isDue) =>
  isDone ? "done" : isDue ? "pending" : "future";

const getPeriodicStatus = (dateStr, windowMonths) => {
  if (!dateStr) return "pending";
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const elapsedDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  const windowDays = windowMonths * 30;
  if (elapsedDays >= windowDays - 15) return "pending";
  return "done";
};

// --- MOTOR DE INDICADORES (SAÚDE BRASIL 360 EXATO) ---
const evaluateIndicators = (p) => {
  const age = getAge(p.birthDate);
  const ageMonths = getAgeMonths(p.birthDate);
  const daysAge = getAgeDays(p.birthDate);

  const rules = [];
  let hasPending = false;
  const ind = p.indicators || {};

  if (ageMonths <= 24) {
    const milestones = [
      { key: "c2_c15d", targetDays: 30, label: "1ª consulta (até 30d)" },
      { key: "c2_c1m", targetDays: 30, label: "Consulta 1 Mês" },
      { key: "c2_c2m", targetDays: 60, label: "Consulta 2 Meses" },
      { key: "c2_c4m", targetDays: 120, label: "Consulta 4 Meses" },
      { key: "c2_c6m", targetDays: 180, label: "Consulta 6 Meses" },
      { key: "c2_c9m", targetDays: 270, label: "Consulta 9 Meses" },
      { key: "c2_c12m", targetDays: 365, label: "Consulta 12 Meses" },
      { key: "c2_c18m", targetDays: 540, label: "Consulta 18 Meses" },
      { key: "c2_c24m", targetDays: 730, label: "Consulta 24 Meses" },
    ];

    let expectedConsults = 0;
    const mItems = milestones.map((m) => {
      const isDue = daysAge >= m.targetDays - 15;
      if (isDue) expectedConsults++;
      return { label: m.label, status: getStatus(!!ind[m.key], isDue) };
    });

    const acs1Due = daysAge >= 30 - 15;
    const acs2Due = daysAge >= 180 - 15;
    const weightDue = expectedConsults > 0;
    const weightOk = (ind.c2_weight || 0) >= expectedConsults;

    const items = [
      ...mItems,
      {
        label: `Reg. peso/altura (${ind.c2_weight || 0}/${expectedConsults})`,
        status: getStatus(weightOk, weightDue),
      },
      {
        label: "Visita ACS (Até 30 dias de vida)",
        status: getStatus(!!ind.c2_acs1, acs1Due),
      },
      {
        label: "Visita ACS (Até 6 meses de vida)",
        status: getStatus(!!ind.c2_acs2, acs2Due),
      },
      { label: "Vacinação em dia", status: getStatus(!!ind.c2_vac, true) },
    ];

    let isOk = true;
    items.forEach((i) => {
      if (i.status === "pending") {
        isOk = false;
        hasPending = true;
      }
    });

    rules.push({
      id: "C.2",
      title: "Desenvolvimento Infantil",
      icon: "👶",
      color: "bg-emerald-500",
      isOk,
      items,
    });
  }

  if (p.conditions?.isGestante) {
    const items = [
      {
        label: "1ª consulta pré-natal até 12 semanas",
        status: getStatus(!!ind.c3_1st12w, true),
      },
      {
        label: `7 consultas gestacionais (${ind.c3_cons || 0}/7)`,
        status: getStatus((ind.c3_cons || 0) >= 7, true),
      },
      {
        label: `7 registros PA e Peso (${Math.min(
          ind.c3_pa || 0,
          ind.c3_peso || 0
        )}/7)`,
        status: getStatus(
          (ind.c3_pa || 0) >= 7 && (ind.c3_peso || 0) >= 7,
          true
        ),
      },
      {
        label: `3 visitas ACS (${ind.c3_acs || 0}/3)`,
        status: getStatus((ind.c3_acs || 0) >= 3, true),
      },
      {
        label: "Testes Sífilis/HIV/Hep (1º Tri)",
        status: getStatus(!!ind.c3_t1, true),
      },
      {
        label: "Testes Sífilis/HIV (3º Tri)",
        status: getStatus(!!ind.c3_t3, true),
      },
      {
        label: "Dose dTpa (> 20ª sem)",
        status: getStatus(!!ind.c3_dtpa, true),
      },
      {
        label: "Avaliação odontológica",
        status: getStatus(!!ind.c3_odonto, true),
      },
      {
        label: "1 Consulta no Puerpério",
        status: getStatus(!!ind.c3_puerpC, true),
      },
      {
        label: "1 Visita ACS no Puerpério",
        status: getStatus(!!ind.c3_puerpAcs, true),
      },
    ];
    let isOk = true;
    items.forEach((i) => {
      if (i.status === "pending") {
        isOk = false;
        hasPending = true;
      }
    });
    rules.push({
      id: "C.3",
      title: "Gestação e Puerpério",
      icon: "🤰",
      color: "bg-purple-500",
      isOk,
      items,
    });
  }

  if (p.conditions?.isDM) {
    const items = [
      {
        label: "Consulta (válida 6 meses)",
        status: getPeriodicStatus(ind.dm_cons, 6),
      },
      {
        label: "Registro de PA (válido 6 meses)",
        status: getPeriodicStatus(ind.dm_pa, 6),
      },
      {
        label: `2 visitas ACS últimos 12m (${ind.dm_acs || 0}/2)`,
        status: getStatus((ind.dm_acs || 0) >= 2, true),
      },
      {
        label: "Registro Peso/Altura (válido 12 meses)",
        status: getPeriodicStatus(ind.dm_peso, 12),
      },
      {
        label: "HbA1c Glicada (válido 12 meses)",
        status: getPeriodicStatus(ind.dm_hba1c, 12),
      },
      {
        label: "Avaliação dos pés (válida 12 meses)",
        status: getPeriodicStatus(ind.dm_foot, 12),
      },
    ];
    let isOk = true;
    items.forEach((i) => {
      if (i.status === "pending") {
        isOk = false;
        hasPending = true;
      }
    });
    rules.push({
      id: "C.4",
      title: "Pessoa com Diabetes",
      icon: "🩸",
      color: "bg-red-500",
      isOk,
      items,
    });
  }

  if (p.conditions?.isHA) {
    const items = [
      {
        label: "Consulta (válida 6 meses)",
        status: getPeriodicStatus(ind.ha_cons, 6),
      },
      {
        label: "Registro de PA (válido 6 meses)",
        status: getPeriodicStatus(ind.ha_pa, 6),
      },
      {
        label: `2 visitas ACS últimos 12m (${ind.ha_acs || 0}/2)`,
        status: getStatus((ind.ha_acs || 0) >= 2, true),
      },
      {
        label: "Registro Peso/Altura (válido 12 meses)",
        status: getPeriodicStatus(ind.ha_peso, 12),
      },
    ];
    let isOk = true;
    items.forEach((i) => {
      if (i.status === "pending") {
        isOk = false;
        hasPending = true;
      }
    });
    rules.push({
      id: "C.5",
      title: "Pessoa com Hipertensão",
      icon: "❤️",
      color: "bg-rose-500",
      isOk,
      items,
    });
  }

  if (age >= 60) {
    const items = [
      {
        label: "Consulta (válida 12 meses)",
        status: getPeriodicStatus(ind.id_cons, 12),
      },
      {
        label: "Registro Peso/Altura (válido 12 meses)",
        status: getPeriodicStatus(ind.id_peso, 12),
      },
      {
        label: `2 visitas ACS últimos 12m (${ind.id_acs || 0}/2)`,
        status: getStatus((ind.id_acs || 0) >= 2, true),
      },
      {
        label: "Vacina Influenza (válida 12 meses)",
        status: getPeriodicStatus(ind.id_vac, 12),
      },
    ];
    let isOk = true;
    items.forEach((i) => {
      if (i.status === "pending") {
        isOk = false;
        hasPending = true;
      }
    });
    rules.push({
      id: "C.6",
      title: "Pessoa Idosa",
      icon: "👵",
      color: "bg-amber-500",
      isOk,
      items,
    });
  }

  if (p.sex === "F" && age >= 25 && age <= 64) {
    const items = [
      {
        label: "Citopatológico (Preventivo) em dia (válido 3 anos)",
        status: getPeriodicStatus(ind.mulher_cito, 36),
      },
    ];
    let isOk = true;
    items.forEach((i) => {
      if (i.status === "pending") {
        isOk = false;
        hasPending = true;
      }
    });
    rules.push({
      id: "C.7",
      title: "Saúde da Mulher",
      icon: "🎗️",
      color: "bg-pink-500",
      isOk,
      items,
    });
  }

  let daysSinceLastAcsVisit = 999;
  if (ind.lastAcsVisit) {
    const d = new Date(ind.lastAcsVisit);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    daysSinceLastAcsVisit = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  }
  if (daysSinceLastAcsVisit > 30) hasPending = true;

  return { rules, hasPending, daysSinceLastAcsVisit };
};

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [loadingApp, setLoadingApp] = useState(false);

  const [systemUsers, setSystemUsers] = useState([]);
  const [sessionEmail, setSessionEmail] = useState(null);
  const [appUser, setAppUser] = useState({
    email: "denilsonmaciel.acs@gmail.com",
    role: "master",
    active: true,
  });

  const [patients, setPatients] = useState([]);
  const [currentTab, setCurrentTab] = useState("home");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMicroarea, setFilterMicroarea] = useState("Todas");
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [acsName, setAcsName] = useState(
    () => localStorage.getItem("acsName") || ""
  );
  const [ubsfName, setUbsfName] = useState(
    () => localStorage.getItem("ubsfName") || ""
  );

  useEffect(() => {
    localStorage.setItem("acsName", acsName);
    localStorage.setItem("ubsfName", ubsfName);
  }, [acsName, ubsfName]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    const usersRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "system_users"
    );
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (users.length === 0) {
        setDoc(doc(usersRef, sanitizeEmail("denilsonmaciel.acs@gmail.com")), {
          email: "denilsonmaciel.acs@gmail.com",
          password: "admin",
          role: "master",
          active: true,
          createdAt: getTodayStr(),
        });
      } else {
        setSystemUsers(users);
      }
    });

    const sessionRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "sessions",
      fbUser.uid
    );
    const unsubSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().email)
        setSessionEmail(docSnap.data().email);
      else setSessionEmail(null);
      setLoadingApp(false);
    });
    return () => {
      unsubUsers();
      unsubSession();
    };
  }, [fbUser]);

  useEffect(() => {
    if (systemUsers.length > 0 && sessionEmail) {
      const found = systemUsers.find(
        (u) => u.email === sessionEmail && u.active
      );
      if (found) setAppUser(found);
      else {
        setAppUser(null);
        if (fbUser)
          deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "sessions",
              fbUser.uid
            )
          );
      }
    } else {
      setAppUser(null);
    }
  }, [systemUsers, sessionEmail, fbUser]);

  useEffect(() => {
    if (!fbUser || !appUser) return;
    const ptsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `patients_${sanitizeEmail(appUser.email)}`
    );
    const unsubPts = onSnapshot(ptsRef, (snap) => {
      setPatients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubPts();
  }, [fbUser, appUser]);

  const handleLogin = async (email, password) => {
    const userMatch = systemUsers.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (userMatch) {
      if (!userMatch.active)
        return "Conta desativada. Contate o administrador.";
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "sessions", fbUser.uid),
        { email: userMatch.email }
      );
      return "success";
    }
    return "E-mail ou senha incorretos.";
  };

  const handleLogout = async () => {
    if (fbUser)
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "sessions", fbUser.uid)
      );
    setCurrentTab("home");
  };

  const processedPatients = useMemo(
    () => patients.map((p) => ({ ...p, evaluation: evaluateIndicators(p) })),
    [patients]
  );
  const activeSearchPatients = processedPatients.filter(
    (p) => p.evaluation.hasPending
  );
  const microareas = [
    "Todas",
    ...new Set(patients.map((p) => p.microarea)),
  ].sort();

  const filteredPatients = useMemo(() => {
    return processedPatients.filter((p) => {
      const matchName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMicroarea =
        filterMicroarea === "Todas" || p.microarea === filterMicroarea;
      return matchName && matchMicroarea;
    });
  }, [processedPatients, searchTerm, filterMicroarea]);

  const handleAddPatient = async (newPatient) => {
    const ptsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `patients_${sanitizeEmail(appUser.email)}`
    );
    await setDoc(doc(ptsRef), newPatient);
    setCurrentTab("list");
  };

  const handleUpdatePatientData = async (patientId, updatedData) => {
    const ptRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `patients_${sanitizeEmail(appUser.email)}`,
      patientId
    );
    await updateDoc(ptRef, updatedData);
  };

  const handleDeletePatient = async (patientId) => {
    const ptRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `patients_${sanitizeEmail(appUser.email)}`,
      patientId
    );
    await deleteDoc(ptRef);
    setSelectedPatient(null);
  };

  const handleRegisterVisit = async (patientId, updates) => {
    const ptData = patients.find((p) => p.id === patientId);
    await handleUpdatePatientData(patientId, {
      indicators: {
        ...ptData.indicators,
        ...updates,
        lastAcsVisit: getTodayStr(),
      },
    });
    setSelectedPatient(null);
  };

  const handleChangeOwnPassword = async (newPassword) => {
    const userRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "system_users",
      sanitizeEmail(appUser.email)
    );
    await updateDoc(userRef, { password: newPassword });
  };

  const handleAdminChangePassword = async (userEmail, newPassword) => {
    const userRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "system_users",
      sanitizeEmail(userEmail)
    );
    await updateDoc(userRef, { password: newPassword });
  };

  const handlePrint = () => {
    const contentElement = document.getElementById("report-content");
    if (!contentElement) return;

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((style) => style.outerHTML)
      .join("");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Metas - ACS Pro 360</title>
          ${styles}
          <style>
            body { background: white !important; margin: 0; padding: 20px; font-family: sans-serif; }
            .print\\:hidden { display: none !important; }
            .hidden.print\\:flex { display: flex !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          </style>
        </head>
        <body>
          ${contentElement.innerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error(e);
        alert(
          "O navegador bloqueou a impressão. Tente abrir noutro separador."
        );
      }
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 1000);
  };

  if (loadingApp)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  if (!appUser) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="flex justify-center bg-gray-900 min-h-screen font-sans print:bg-white">
      <div className="w-full max-w-md bg-gray-50 flex flex-col min-h-screen shadow-2xl relative overflow-hidden print:max-w-none print:shadow-none print:bg-white">
        <header className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-4 shadow-md rounded-b-2xl z-10 flex-shrink-0 print:hidden">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <BrandLogo className="w-10 h-10 drop-shadow-md" />
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-wide">
                  {APP_NAME}
                </h1>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-teal-100 text-[10px] flex items-center bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full mt-1 transition cursor-pointer"
                >
                  <User className="w-3 h-3 mr-1" /> {appUser.email}{" "}
                  <Pencil className="w-2 h-2 ml-1" />
                </button>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          {currentTab === "list" && (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-teal-300 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto pb-24 p-4 print:pb-0 print:p-2 print:overflow-visible">
          {currentTab === "home" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-gray-500 text-xs font-bold tracking-wider uppercase mb-3">
                  Sua Microárea
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<Users />}
                    title="Total Assistidos"
                    value={patients.length}
                    color="bg-blue-100 text-blue-600"
                  />
                  <StatCard
                    icon={<BellRing />}
                    title="Busca Ativa"
                    value={activeSearchPatients.length}
                    color={
                      activeSearchPatients.length > 0
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }
                    onClick={() => setCurrentTab("search_active")}
                  />
                </div>
              </div>

              <div>
                <h2 className="text-gray-500 text-xs font-bold tracking-wider uppercase mb-3">
                  Grupos Prioritários
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <GroupCard
                    icon="🤰"
                    title="Gestantes"
                    count={
                      patients.filter((p) => p.conditions?.isGestante).length
                    }
                  />
                  <GroupCard
                    icon="👶"
                    title="Infantil (<2a)"
                    count={
                      patients.filter((p) => getAgeMonths(p.birthDate) <= 24)
                        .length
                    }
                  />
                  <GroupCard
                    icon="🩸"
                    title="Diabéticos"
                    count={patients.filter((p) => p.conditions?.isDM).length}
                  />
                  <GroupCard
                    icon="❤️"
                    title="Hipertensos"
                    count={patients.filter((p) => p.conditions?.isHA).length}
                  />
                  <GroupCard
                    icon="👵"
                    title="Idosos (>60a)"
                    count={
                      patients.filter((p) => getAge(p.birthDate) >= 60).length
                    }
                  />
                  <GroupCard
                    icon="📄"
                    title="Bolsa Família"
                    count={
                      patients.filter((p) => p.conditions?.isBolsaFamilia)
                        .length
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab === "list" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-gray-700 font-bold">
                  Pacientes ({filteredPatients.length})
                </h2>
                <select
                  className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-600 shadow-sm"
                  value={filterMicroarea}
                  onChange={(e) => setFilterMicroarea(e.target.value)}
                >
                  {microareas.map((m) => (
                    <option key={m} value={m}>
                      {m === "Todas" ? "M.A Todas" : `M.A ${m}`}
                    </option>
                  ))}
                </select>
              </div>
              {filteredPatients.length === 0 ? (
                <p className="text-center text-gray-400 py-10">
                  Nenhum paciente.
                </p>
              ) : (
                filteredPatients.map((p) => (
                  <PatientListItem
                    key={p.id}
                    patient={p}
                    onClick={() => setSelectedPatient(p)}
                  />
                ))
              )}
            </div>
          )}

          {currentTab === "search_active" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6">
                <div className="flex items-center space-x-2 text-red-700 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <h2 className="font-bold">Ação Necessária</h2>
                </div>
                <p className="text-xs text-red-600">
                  Pacientes atrasados ou com indicadores vencendo em até 15
                  dias.
                </p>
              </div>
              {activeSearchPatients.length === 0 ? (
                <div className="text-center py-10 text-emerald-600 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                  <p className="font-bold">Tudo em dia!</p>
                </div>
              ) : (
                activeSearchPatients.map((p) => (
                  <PatientListItem
                    key={p.id}
                    patient={p}
                    onClick={() => setSelectedPatient(p)}
                    isAlert
                  />
                ))
              )}
            </div>
          )}

          {currentTab === "reports" && (
            <div
              id="report-content"
              className="space-y-4 animate-in fade-in print:p-0 print:space-y-4"
            >
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 print:hidden">
                <h4 className="font-bold text-gray-800 text-sm mb-3">
                  Dados para Impressão (Timbrado)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Nome do ACS
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={acsName}
                      onChange={(e) => setAcsName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Nome da UBSF
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={ubsfName}
                      onChange={(e) => setUbsfName(e.target.value)}
                      placeholder="Ex: UBSF Centro"
                    />
                  </div>
                </div>
              </div>

              <div className="hidden print:flex flex-col border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-wide">
                      {ubsfName || "NOME DA UBSF"}
                    </h1>
                    <p className="text-lg font-bold mt-1">
                      ACS:{" "}
                      <span className="font-normal">
                        {acsName || "NOME DO AGENTE"}
                      </span>
                    </p>
                    <p className="text-md font-bold">
                      Microárea(s):{" "}
                      <span className="font-normal">
                        {filterMicroarea === "Todas"
                          ? microareas.filter((m) => m !== "Todas").join(", ")
                          : filterMicroarea}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black uppercase">
                      Relatório de Metas
                    </p>
                    <p className="text-md font-bold">
                      Programa Saúde Brasil 360
                    </p>
                    <p className="text-md mt-1">
                      Data: {new Date().toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4 flex items-center justify-between print:hidden">
                <div className="flex items-center">
                  <PieChart className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h2 className="font-bold text-blue-800 text-xl">
                      Relatório Mensal de Metas
                    </h2>
                    <p className="text-xs text-blue-600">
                      Situação atual dos indicadores Saúde Brasil 360
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePrint}
                  className="print:hidden flex items-center justify-center bg-white text-blue-600 border border-blue-200 px-3 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition shadow-sm"
                >
                  <Printer className="w-4 h-4 mr-2" /> Imprimir
                </button>
              </div>

              <ReportSection
                title="C.2 Infantil (<2 anos)"
                icon="👶"
                patients={processedPatients.filter(
                  (p) => getAgeMonths(p.birthDate) <= 24
                )}
                ruleId="C.2"
                color="bg-emerald-50"
                textColor="text-emerald-700"
              />
              <ReportSection
                title="C.3 Gestação"
                icon="🤰"
                patients={processedPatients.filter(
                  (p) => p.conditions?.isGestante
                )}
                ruleId="C.3"
                color="bg-purple-50"
                textColor="text-purple-700"
              />
              <ReportSection
                title="C.4 Diabetes"
                icon="🩸"
                patients={processedPatients.filter((p) => p.conditions?.isDM)}
                ruleId="C.4"
                color="bg-red-50"
                textColor="text-red-700"
              />
              <ReportSection
                title="C.5 Hipertensão"
                icon="❤️"
                patients={processedPatients.filter((p) => p.conditions?.isHA)}
                ruleId="C.5"
                color="bg-rose-50"
                textColor="text-rose-700"
              />
              <ReportSection
                title="C.6 Idoso (>60)"
                icon="👵"
                patients={processedPatients.filter(
                  (p) => getAge(p.birthDate) >= 60
                )}
                ruleId="C.6"
                color="bg-amber-50"
                textColor="text-amber-700"
              />
              <ReportSection
                title="C.7 Saúde da Mulher"
                icon="🎗️"
                patients={processedPatients.filter(
                  (p) =>
                    p.sex === "F" &&
                    getAge(p.birthDate) >= 25 &&
                    getAge(p.birthDate) <= 64
                )}
                ruleId="C.7"
                color="bg-pink-50"
                textColor="text-pink-700"
              />
            </div>
          )}

          {currentTab === "add" && (
            <PatientForm
              onSave={handleAddPatient}
              onCancel={() => setCurrentTab("home")}
            />
          )}
          {currentTab === "admin" && appUser.role === "master" && (
            <AdminPanel
              users={systemUsers}
              onAddUser={async (e, p) => {
                await setDoc(
                  doc(
                    collection(
                      db,
                      "artifacts",
                      appId,
                      "public",
                      "data",
                      "system_users"
                    ),
                    sanitizeEmail(e)
                  ),
                  {
                    email: e.toLowerCase(),
                    password: p,
                    role: "user",
                    active: true,
                    createdAt: getTodayStr(),
                  }
                );
              }}
              onToggleAccess={async (e, s) => {
                await updateDoc(
                  doc(
                    db,
                    "artifacts",
                    appId,
                    "public",
                    "data",
                    "system_users",
                    sanitizeEmail(e)
                  ),
                  { active: !s }
                );
              }}
              onChangeUserPassword={handleAdminChangePassword}
            />
          )}
        </main>

        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-between px-1 pb-safe shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)] z-20 rounded-t-2xl print:hidden">
          <NavBtn
            icon={<Home />}
            label="Início"
            active={currentTab === "home"}
            onClick={() => setCurrentTab("home")}
          />
          <NavBtn
            icon={<Users />}
            label="Pacientes"
            active={currentTab === "list"}
            onClick={() => setCurrentTab("list")}
          />
          <div className="-mt-6 flex-shrink-0">
            <button
              onClick={() => setCurrentTab("add")}
              className="bg-gradient-to-tr from-teal-500 to-blue-600 text-white p-4 rounded-full shadow-lg border-4 border-gray-50 transform transition active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          <NavBtn
            icon={<PieChart />}
            label="Relatórios"
            active={currentTab === "reports"}
            onClick={() => setCurrentTab("reports")}
          />
          {appUser.role === "master" ? (
            <NavBtn
              icon={<Settings />}
              label="Acessos"
              active={currentTab === "admin"}
              onClick={() => setCurrentTab("admin")}
            />
          ) : (
            <NavBtn
              icon={<BellRing />}
              label="Alertas"
              active={currentTab === "search_active"}
              onClick={() => setCurrentTab("search_active")}
              badge={activeSearchPatients.length}
            />
          )}
        </nav>

        {selectedPatient && (
          <PatientDetailsModal
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
            onRegisterVisit={handleRegisterVisit}
            onUpdateData={handleUpdatePatientData}
            onDelete={handleDeletePatient}
          />
        )}

        {showProfileModal && (
          <UserProfileModal
            user={appUser}
            onClose={() => setShowProfileModal(false)}
            onChangePassword={handleChangeOwnPassword}
          />
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    const res = await onLogin(email, password);
    if (res !== "success") setError(res);
    setLoading(false);
  };

  const handleRecoverPassword = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, introduza o seu e-mail.");
      return;
    }
    setLoading(true);
    setError("");
    setMsg("");
    setTimeout(() => {
      setLoading(false);
      setMsg(
        "Instruções de recuperação enviadas! Verifique a sua caixa de e-mail (incluindo o spam)."
      );
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="bg-gradient-to-br from-teal-600 to-blue-700 p-8 text-center flex flex-col items-center">
          <BrandLogo className="w-20 h-20 mb-4 drop-shadow-xl" />
          <h1 className="text-2xl font-black text-white tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-teal-100 text-sm mt-1">
            {view === "login"
              ? "Acesso Restrito ao Agente"
              : "Recuperar Acesso"}
          </p>
        </div>

        {view === "login" ? (
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 animate-in fade-in"
          >
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}
            {msg && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-medium flex items-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                {msg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="text-right mt-2">
                <span
                  onClick={() => {
                    setView("forgot");
                    setError("");
                    setMsg("");
                  }}
                  className="text-xs text-teal-600 font-bold cursor-pointer hover:underline"
                >
                  Esqueci-me da palavra-passe
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-teal-700 transition flex justify-center items-center mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleRecoverPassword}
            className="p-6 space-y-4 animate-in fade-in slide-in-from-right-4"
          >
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}
            {msg && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-medium flex items-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                {msg}
              </div>
            )}

            <p className="text-sm text-gray-600 text-center mb-4">
              Introduza o e-mail associado à sua conta. Iremos enviar um link
              para criar uma nova palavra-passe.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                E-mail registado
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-teal-700 transition flex justify-center items-center"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Enviar link de recuperação"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError("");
                  setMsg("");
                }}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition flex justify-center items-center"
              >
                Voltar ao início de sessão
              </button>
            </div>
          </form>
        )}

        {view === "login" && (
          <div className="bg-gray-50 p-4 border-t border-gray-100 text-center text-xs text-gray-500">
            <p>Precisa de um acesso?</p>
            <p className="font-bold text-teal-700 mt-1 cursor-pointer hover:underline">
              Contacte o suporte administrativo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientDetailsModal({
  patient,
  onClose,
  onRegisterVisit,
  onUpdateData,
  onDelete,
}) {
  const [isVisiting, setIsVisiting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [fU, setFU] = useState({ ...patient.indicators });
  const [aiInsight, setAiInsight] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const { evaluation } = patient;
  const ageMonths = getAgeMonths(patient.birthDate);
  const age = getAge(patient.birthDate);

  const toggleVal = (field) =>
    setFU((prev) => ({ ...prev, [field]: !prev[field] }));
  const incVal = (field) =>
    setFU((prev) => ({ ...prev, [field]: (prev[field] || 0) + 1 }));
  const decVal = (field) =>
    setFU((prev) => ({
      ...prev,
      [field]: Math.max(0, (prev[field] || 0) - 1),
    }));
  const setDate = (field) =>
    setFU((prev) => ({ ...prev, [field]: getTodayStr() }));

  const fetchAiInsight = async () => {
    setIsAiLoading(true);
    setAiError(null);
    const pendingItems = evaluation.rules
      .map((r) =>
        r.items
          .filter((i) => i.status === "pending")
          .map((i) => i.label)
          .join(", ")
      )
      .filter((r) => r.length > 0)
      .join("; ");
    const prompt = `Como assistente para Agentes Comunitários de Saúde, ajude a preparar a visita de hoje para este paciente:
    - Nome: ${patient.name}, ${age} anos.
    - Grupos: ${patient.conditions?.isGestante ? "Gestante " : ""}${
      patient.conditions?.isDM ? "Diabético " : ""
    }${patient.conditions?.isHA ? "Hipertenso " : ""}.
    - Pendências a cobrar na visita: ${
      pendingItems || "Nenhuma pendência grave, apenas rotina."
    }
    Gere uma resposta curta contendo: 1. Como iniciar a conversa com empatia. 2. Argumentos fáceis e didáticos para convencer o paciente a resolver essas pendências.`;

    try {
      const response = await generateAiBriefing(prompt);
      setAiInsight(response);
    } catch (err) {
      setAiError(
        "Não foi possível conectar com a inteligência artificial agora."
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderMarkdown = (text) =>
    text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-2 text-sm text-purple-900">
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j}>{part.slice(2, -2)}</strong>
            ) : (
              part
            )
          )}
        </p>
      );
    });

  const handleUpdateInfo = (updatedPatientData) => {
    onUpdateData(patient.id, updatedPatientData);
    setIsEditing(false);
  };

  return (
    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in">
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">
              Excluir Assistido?
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Esta ação não pode ser desfeita. Todos os dados e visitas
              registradas de <b>{patient.name}</b> serão perdidos
              permanentemente.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(patient.id);
                  onClose();
                }}
                className="flex-1 bg-red-600 py-3 rounded-xl font-bold text-white shadow-lg hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 w-full h-[95%] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative slide-in-from-bottom-full duration-300">
        <div className="bg-white px-5 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            {!isEditing && (
              <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg">
                {patient.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-800 leading-tight truncate w-40">
                {isEditing ? "Editar Assistido" : patient.name}
              </h2>
              {!isEditing && (
                <p className="text-xs text-gray-500">
                  {age} anos • MA {patient.microarea}
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-50 p-2 rounded-full text-blue-600 hover:bg-blue-100"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-50 p-2 rounded-full text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={isEditing ? () => setIsEditing(false) : onClose}
              className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {isEditing ? (
            <PatientForm
              initialData={patient}
              onSave={handleUpdateInfo}
              onCancel={() => setIsEditing(false)}
            />
          ) : !isVisiting ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-800 text-sm mb-3">
                  Informações Pessoais
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CreditCard className="w-4 h-4 mr-2 text-teal-600 flex-shrink-0" />{" "}
                    <span className="font-bold mr-1">CPF:</span>{" "}
                    {patient.cpf || "Não informado"}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2 text-teal-600 flex-shrink-0" />{" "}
                    <span className="font-bold mr-1">CNS:</span>{" "}
                    {patient.cns || "Não informado"}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-teal-600 flex-shrink-0" />{" "}
                    <span className="font-bold mr-1">Contato:</span>{" "}
                    {patient.phone || "Não informado"}
                  </div>
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-teal-600 mt-0.5 flex-shrink-0" />{" "}
                    <div>
                      <span className="font-bold">Endereço:</span>
                      <br />
                      {patient.logradouro
                        ? `${patient.logradouro}, ${
                            patient.numero || "S/N"
                          } - ${patient.bairro || ""} ${
                            patient.cidade
                              ? `(${patient.cidade}/${patient.uf})`
                              : ""
                          }`
                        : patient.address || "Não informado"}
                      <br />
                      <span className="text-xs text-gray-500">
                        {patient.referencia ? `Ref: ${patient.referencia}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {!aiInsight && !isAiLoading && (
                <button
                  onClick={fetchAiInsight}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-4 font-bold shadow-md flex items-center justify-center hover:opacity-90 transition active:scale-95"
                >
                  <Sparkles className="w-5 h-5 mr-2" /> ✨ Copiloto IA: Preparar
                  Visita
                </button>
              )}

              {isAiLoading && (
                <div className="bg-purple-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-purple-200">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600 mb-2" />
                  <p className="text-xs text-purple-700 font-medium">
                    A Inteligência Artificial está gerando dicas de abordagem...
                  </p>
                </div>
              )}

              {aiInsight && (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl relative shadow-sm animate-in zoom-in-95">
                  <button
                    onClick={() => setAiInsight(null)}
                    className="absolute top-3 right-3 bg-purple-100 p-1 rounded-full text-purple-500 hover:bg-purple-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="font-black text-purple-800 flex items-center mb-3">
                    <Bot className="w-5 h-5 mr-2 text-purple-600" /> Dicas do
                    Copiloto ✨
                  </h4>
                  {renderMarkdown(aiInsight)}
                </div>
              )}

              {aiError && (
                <p className="text-xs text-red-500 text-center">{aiError}</p>
              )}

              {evaluation.rules.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 mt-4">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-50" /> Sem
                  indicadores prioritários para o perfil.
                </div>
              ) : (
                evaluation.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden mb-4 mt-2"
                  >
                    <div
                      className={`${rule.color} px-4 py-3 flex items-center text-white`}
                    >
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-xl shadow-sm mr-3">
                        {rule.icon}
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-white/80">
                          {rule.id}
                        </span>
                        <h4 className="font-bold text-[15px] leading-tight">
                          {rule.title}
                        </h4>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 bg-gray-50/50">
                      <p className="text-xs font-bold text-gray-600 mb-2">
                        SITUAÇÃO ATUAL:
                      </p>
                      {rule.items.map((item, idx) => (
                        <div key={idx} className="flex items-start">
                          <div className="mt-0.5 mr-3 flex-shrink-0">
                            {item.status === "done" ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              </div>
                            ) : item.status === "pending" ? (
                              <div className="w-4 h-4 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                                <X className="w-2.5 h-2.5 text-red-400" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-gray-400 rounded-full" />
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-xs ${
                              item.status === "done"
                                ? "text-gray-500 line-through"
                                : item.status === "future"
                                ? "text-gray-400"
                                : "text-gray-800 font-medium"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in pb-10">
              <h3 className="font-black text-gray-800 text-lg mb-2">
                Atualizar Indicadores
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Marque apenas o que foi realizado hoje ou recentemente.
              </p>

              {ageMonths <= 24 && (
                <FormGroup title="C.2 Desenvolvimento Infantil" color="emerald">
                  <div className="mb-3">
                    <p className="text-xs font-bold text-gray-500 mb-2">
                      Linha do Tempo (Consultas):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <CheckboxBtn
                        label="1ª (até 30d)"
                        checked={fU.c2_c15d}
                        onClick={() => toggleVal("c2_c15d")}
                      />
                      <CheckboxBtn
                        label="1 Mês"
                        checked={fU.c2_c1m}
                        onClick={() => toggleVal("c2_c1m")}
                      />
                      <CheckboxBtn
                        label="2 Meses"
                        checked={fU.c2_c2m}
                        onClick={() => toggleVal("c2_c2m")}
                      />
                      <CheckboxBtn
                        label="4 Meses"
                        checked={fU.c2_c4m}
                        onClick={() => toggleVal("c2_c4m")}
                      />
                      <CheckboxBtn
                        label="6 Meses"
                        checked={fU.c2_c6m}
                        onClick={() => toggleVal("c2_c6m")}
                      />
                      <CheckboxBtn
                        label="9 Meses"
                        checked={fU.c2_c9m}
                        onClick={() => toggleVal("c2_c9m")}
                      />
                      <CheckboxBtn
                        label="12 Meses"
                        checked={fU.c2_c12m}
                        onClick={() => toggleVal("c2_c12m")}
                      />
                      <CheckboxBtn
                        label="18 Meses"
                        checked={fU.c2_c18m}
                        onClick={() => toggleVal("c2_c18m")}
                      />
                      <CheckboxBtn
                        label="24 Meses"
                        checked={fU.c2_c24m}
                        onClick={() => toggleVal("c2_c24m")}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs font-bold text-gray-500 mb-2">
                      Visitas ACS Recomendadas:
                    </p>
                    <div className="space-y-2">
                      <CheckboxBtn
                        label="1ª Visita ACS (Até 30 dias de vida)"
                        checked={fU.c2_acs1}
                        onClick={() => toggleVal("c2_acs1")}
                        block
                      />
                      <CheckboxBtn
                        label="2ª Visita ACS (Até 6 meses de vida)"
                        checked={fU.c2_acs2}
                        onClick={() => toggleVal("c2_acs2")}
                        block
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <CounterBtn
                      label="Registros de Peso/Altura"
                      count={fU.c2_weight || 0}
                      onInc={() => incVal("c2_weight")}
                      onDec={() => decVal("c2_weight")}
                      target={9}
                    />
                    <CheckboxBtn
                      label="Vacinação Recomendada em dia?"
                      checked={fU.c2_vac}
                      onClick={() => toggleVal("c2_vac")}
                      block
                    />
                  </div>
                </FormGroup>
              )}

              {patient.conditions?.isGestante && (
                <FormGroup title="C.3 Gestação e Puerpério" color="purple">
                  <div className="space-y-3">
                    <CheckboxBtn
                      label="1ª Consulta de Pré-Natal ocorreu até a 12ª Semana?"
                      checked={fU.c3_1st12w}
                      onClick={() => toggleVal("c3_1st12w")}
                      block
                    />
                    <CounterBtn
                      label="Consultas Realizadas"
                      count={fU.c3_cons || 0}
                      onInc={() => incVal("c3_cons")}
                      onDec={() => decVal("c3_cons")}
                      target={7}
                    />
                    <CounterBtn
                      label="Aferições de PA"
                      count={fU.c3_pa || 0}
                      onInc={() => incVal("c3_pa")}
                      onDec={() => decVal("c3_pa")}
                      target={7}
                    />
                    <CounterBtn
                      label="Aferições de Peso"
                      count={fU.c3_peso || 0}
                      onInc={() => incVal("c3_peso")}
                      onDec={() => decVal("c3_peso")}
                      target={7}
                    />
                    <CounterBtn
                      label="Visitas ACS (Intervalo >30d)"
                      count={fU.c3_acs || 0}
                      onInc={() => incVal("c3_acs")}
                      onDec={() => decVal("c3_acs")}
                      target={3}
                    />

                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 mb-2">
                        Exames e Avaliações:
                      </p>
                      <div className="space-y-2">
                        <CheckboxBtn
                          label="Testes Rápidos 1º Tri (Sífilis, HIV, Hep B/C)"
                          checked={fU.c3_t1}
                          onClick={() => toggleVal("c3_t1")}
                          block
                        />
                        <CheckboxBtn
                          label="Testes Rápidos 3º Tri (Sífilis, HIV)"
                          checked={fU.c3_t3}
                          onClick={() => toggleVal("c3_t3")}
                          block
                        />
                        <CheckboxBtn
                          label="Vacina dTpa (> 20ª semana)"
                          checked={fU.c3_dtpa}
                          onClick={() => toggleVal("c3_dtpa")}
                          block
                        />
                        <CheckboxBtn
                          label="Avaliação Odontológica na Gestação"
                          checked={fU.c3_odonto}
                          onClick={() => toggleVal("c3_odonto")}
                          block
                        />
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                      <p className="text-xs font-bold text-purple-800 mb-2">
                        Pós-Parto (Puerpério):
                      </p>
                      <div className="space-y-2">
                        <CheckboxBtn
                          label="Consulta Puerperal (Médico/Enf)"
                          checked={fU.c3_puerpC}
                          onClick={() => toggleVal("c3_puerpC")}
                          block
                        />
                        <CheckboxBtn
                          label="Visita ACS no Puerpério"
                          checked={fU.c3_puerpAcs}
                          onClick={() => toggleVal("c3_puerpAcs")}
                          block
                        />
                      </div>
                    </div>
                  </div>
                </FormGroup>
              )}

              {patient.conditions?.isDM && (
                <FormGroup title="C.4 Diabetes" color="red">
                  <div className="space-y-2">
                    <ActionDateBtn
                      label="Consulta Méd/Enf"
                      date={fU.dm_cons}
                      onClick={() => setDate("dm_cons")}
                    />
                    <ActionDateBtn
                      label="Registro de P.A"
                      date={fU.dm_pa}
                      onClick={() => setDate("dm_pa")}
                    />
                    <ActionDateBtn
                      label="Registro Peso/Altura"
                      date={fU.dm_peso}
                      onClick={() => setDate("dm_peso")}
                    />
                    <ActionDateBtn
                      label="Hemoglobina Glicada"
                      date={fU.dm_hba1c}
                      onClick={() => setDate("dm_hba1c")}
                    />
                    <ActionDateBtn
                      label="Avaliação dos Pés"
                      date={fU.dm_foot}
                      onClick={() => setDate("dm_foot")}
                    />
                    <CounterBtn
                      label="Visitas ACS"
                      count={fU.dm_acs || 0}
                      onInc={() => incVal("dm_acs")}
                      onDec={() => decVal("dm_acs")}
                      target={2}
                    />
                  </div>
                </FormGroup>
              )}

              {patient.conditions?.isHA && (
                <FormGroup title="C.5 Hipertensão" color="rose">
                  <div className="space-y-2">
                    <ActionDateBtn
                      label="Consulta Méd/Enf"
                      date={fU.ha_cons}
                      onClick={() => setDate("ha_cons")}
                    />
                    <ActionDateBtn
                      label="Registro de P.A"
                      date={fU.ha_pa}
                      onClick={() => setDate("ha_pa")}
                    />
                    <ActionDateBtn
                      label="Registro Peso/Altura"
                      date={fU.ha_peso}
                      onClick={() => setDate("ha_peso")}
                    />
                    <CounterBtn
                      label="Visitas ACS"
                      count={fU.ha_acs || 0}
                      onInc={() => incVal("ha_acs")}
                      onDec={() => decVal("ha_acs")}
                      target={2}
                    />
                  </div>
                </FormGroup>
              )}

              {age >= 60 && (
                <FormGroup title="C.6 Pessoa Idosa" color="amber">
                  <div className="space-y-2">
                    <ActionDateBtn
                      label="Consulta Méd/Enf"
                      date={fU.id_cons}
                      onClick={() => setDate("id_cons")}
                    />
                    <ActionDateBtn
                      label="Registro Peso/Altura"
                      date={fU.id_peso}
                      onClick={() => setDate("id_peso")}
                    />
                    <ActionDateBtn
                      label="Vacina Influenza"
                      date={fU.id_vac}
                      onClick={() => setDate("id_vac")}
                    />
                    <CounterBtn
                      label="Visitas ACS"
                      count={fU.id_acs || 0}
                      onInc={() => incVal("id_acs")}
                      onDec={() => decVal("id_acs")}
                      target={2}
                    />
                  </div>
                </FormGroup>
              )}

              {patient.sex === "F" && age >= 25 && age <= 64 && (
                <FormGroup title="C.7 Saúde da Mulher" color="pink">
                  <div className="space-y-2">
                    <ActionDateBtn
                      label="Exame Preventivo (Citopatológico) Coletado"
                      date={fU.mulher_cito}
                      onClick={() => setDate("mulher_cito")}
                    />
                  </div>
                </FormGroup>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="absolute bottom-0 w-full bg-white p-4 border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] flex-shrink-0">
            {!isVisiting ? (
              <button
                onClick={() => setIsVisiting(true)}
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex justify-center hover:bg-teal-700 transition"
              >
                <MapPin className="w-5 h-5 mr-2" /> Iniciar Visita e Checklist
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsVisiting(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onRegisterVisit(patient.id, fU)}
                  className="flex-[2] bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex justify-center hover:bg-teal-700 transition"
                >
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

function PatientForm({ initialData, onSave, onCancel }) {
  const [f, setF] = useState(() => {
    if (initialData) {
      return {
        name: initialData.name || "",
        birthDate: initialData.birthDate || "",
        sex: initialData.sex || "F",
        microarea: initialData.microarea || "",
        cpf: initialData.cpf || "",
        cns: initialData.cns || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        cep: initialData.cep || "",
        logradouro: initialData.logradouro || "",
        numero: initialData.numero || "",
        bairro: initialData.bairro || "",
        cidade: initialData.cidade || "",
        uf: initialData.uf || "",
        referencia: initialData.referencia || "",
        isGestante: initialData.conditions?.isGestante || false,
        isHA: initialData.conditions?.isHA || false,
        isDM: initialData.conditions?.isDM || false,
        isBolsaFamilia: initialData.conditions?.isBolsaFamilia || false,
      };
    }
    return {
      name: "",
      birthDate: "",
      sex: "F",
      microarea: "",
      cpf: "",
      cns: "",
      phone: "",
      address: "",
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: "",
      referencia: "",
      isGestante: false,
      isHA: false,
      isDM: false,
      isBolsaFamilia: false,
    };
  });

  const ageMonths = f.birthDate ? getAgeMonths(f.birthDate) : 999;
  const age = f.birthDate ? getAge(f.birthDate) : 999;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (f.name && f.birthDate && f.microarea) {
      const payload = {
        name: f.name,
        birthDate: f.birthDate,
        sex: f.sex,
        microarea: f.microarea,
        cpf: f.cpf,
        cns: f.cns,
        phone: f.phone,
        address: f.address,
        cep: f.cep,
        logradouro: f.logradouro,
        numero: f.numero,
        bairro: f.bairro,
        cidade: f.cidade,
        uf: f.uf,
        referencia: f.referencia,
        conditions: {
          isGestante: f.isGestante,
          isHA: f.isHA,
          isDM: f.isDM,
          isBolsaFamilia: f.isBolsaFamilia,
        },
      };

      if (!initialData) {
        payload.indicators = {};
      }
      onSave(payload);
    }
  };

  const handleCepChange = async (e) => {
    let cepValue = e.target.value.replace(/\D/g, "");
    setF({ ...f, cep: cepValue });

    if (cepValue.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setF((prev) => ({
            ...prev,
            cep: cepValue,
            logradouro: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            uf: data.uf || "",
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${
        initialData ? "p-0 border-0 shadow-none" : "p-5"
      }`}
    >
      {!initialData && (
        <h2 className="font-bold text-gray-800 mb-4">Novo Assistido</h2>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-600">
            Nome Completo
          </label>
          <input
            type="text"
            required
            className="w-full border rounded-xl p-3"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600">
              Data Nasc.
            </label>
            <input
              type="date"
              required
              className="w-full border rounded-xl p-3"
              value={f.birthDate}
              onChange={(e) => setF({ ...f, birthDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600">
              Sexo
            </label>
            <select
              className="w-full border rounded-xl p-3"
              value={f.sex}
              onChange={(e) => setF({ ...f, sex: e.target.value })}
            >
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600">CPF</label>
            <input
              type="text"
              className="w-full border rounded-xl p-3"
              value={f.cpf}
              onChange={(e) => setF({ ...f, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600">CNS</label>
            <input
              type="text"
              className="w-full border rounded-xl p-3"
              value={f.cns}
              onChange={(e) => setF({ ...f, cns: e.target.value })}
              placeholder="000 0000 0000 0000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600">
              Contato (Tel)
            </label>
            <input
              type="tel"
              className="w-full border rounded-xl p-3"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600">
              Microárea
            </label>
            <input
              type="text"
              required
              className="w-full border rounded-xl p-3"
              value={f.microarea}
              onChange={(e) => setF({ ...f, microarea: e.target.value })}
              placeholder="Ex: 01"
            />
          </div>
        </div>

        <div className="pt-2 pb-1 border-t border-gray-100 mt-2">
          <label className="block text-[10px] uppercase tracking-wider font-bold text-teal-600 mb-2">
            Endereço (Busca por CEP)
          </label>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-600">
                CEP
              </label>
              <input
                type="text"
                className="w-full border border-teal-200 rounded-xl p-3 bg-teal-50 focus:ring-2 focus:ring-teal-500 outline-none"
                value={f.cep}
                onChange={handleCepChange}
                placeholder="00000000"
                maxLength="8"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600">
                Logradouro / Rua
              </label>
              <input
                type="text"
                className="w-full border rounded-xl p-3 bg-gray-50"
                value={f.logradouro}
                onChange={(e) => setF({ ...f, logradouro: e.target.value })}
                placeholder="Ex: Rua das Flores"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-600">
                Número
              </label>
              <input
                type="text"
                className="w-full border rounded-xl p-3"
                value={f.numero}
                onChange={(e) => setF({ ...f, numero: e.target.value })}
                placeholder="Ex: 123"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600">
                Bairro
              </label>
              <input
                type="text"
                className="w-full border rounded-xl p-3 bg-gray-50"
                value={f.bairro}
                onChange={(e) => setF({ ...f, bairro: e.target.value })}
                placeholder="Ex: Centro"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600">
              Complemento / Referência
            </label>
            <input
              type="text"
              className="w-full border rounded-xl p-3"
              value={f.referencia}
              onChange={(e) => setF({ ...f, referencia: e.target.value })}
              placeholder="Ex: Próximo à padaria"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-600 mb-2">
            Condições Marcadas (Manual)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setF({ ...f, isGestante: !f.isGestante })}
              disabled={f.sex === "M"}
              className={`border p-2 rounded-xl text-xs font-bold ${
                f.sex === "M"
                  ? "opacity-50 bg-gray-50"
                  : f.isGestante
                  ? "bg-teal-50 border-teal-500 text-teal-800"
                  : "bg-white text-gray-600"
              }`}
            >
              🤰 Gestante
            </button>
            <button
              type="button"
              onClick={() => setF({ ...f, isDM: !f.isDM })}
              className={`border p-2 rounded-xl text-xs font-bold ${
                f.isDM
                  ? "bg-teal-50 border-teal-500 text-teal-800"
                  : "bg-white text-gray-600"
              }`}
            >
              🩸 Diabético
            </button>
            <button
              type="button"
              onClick={() => setF({ ...f, isHA: !f.isHA })}
              className={`border p-2 rounded-xl text-xs font-bold ${
                f.isHA
                  ? "bg-teal-50 border-teal-500 text-teal-800"
                  : "bg-white text-gray-600"
              }`}
            >
              ❤️ Hipertenso
            </button>
            <button
              type="button"
              onClick={() => setF({ ...f, isBolsaFamilia: !f.isBolsaFamilia })}
              className={`border p-2 rounded-xl text-xs font-bold ${
                f.isBolsaFamilia
                  ? "bg-teal-50 border-teal-500 text-teal-800"
                  : "bg-white text-gray-600"
              }`}
            >
              📄 Bolsa Família
            </button>
          </div>
        </div>

        {f.birthDate && (
          <div className="pt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">
              Grupos Automáticos (Saúde 360)
            </label>
            <div className="flex flex-wrap gap-2">
              {ageMonths <= 24 && (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">
                  👶 Infantil (C.2)
                </span>
              )}
              {age >= 60 && (
                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold">
                  👵 Idoso (C.6)
                </span>
              )}
              {f.sex === "F" && age >= 25 && age <= 64 && (
                <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-[10px] font-bold">
                  🎗️ Prev. Mulher (C.7)
                </span>
              )}
              {ageMonths > 24 &&
                age < 60 &&
                !(f.sex === "F" && age >= 25 && age <= 64) && (
                  <span className="text-gray-400 text-xs font-medium">
                    Nenhum grupo detectado.
                  </span>
                )}
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-4 border-t border-gray-100 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-xl"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

function UserProfileModal({ user, onClose, onChangePassword }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError(true);
      setMsg("A palavra-passe deve ter pelo menos 4 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(true);
      setMsg("As palavras-passe não coincidem.");
      return;
    }

    onChangePassword(newPassword);
    setError(false);
    setMsg("Palavra-passe atualizada com sucesso!");
    setTimeout(onClose, 2000);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-in zoom-in-95 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-3">
            <User className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">O Meu Perfil</h3>
          <p className="text-gray-500 text-sm">{user.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">
            Alterar Palavra-passe
          </h4>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Nova Palavra-passe
            </label>
            <input
              type="password"
              required
              className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova palavra-passe"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Confirmar Palavra-passe
            </label>
            <input
              type="password"
              required
              className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a palavra-passe"
            />
          </div>

          {msg && (
            <div
              className={`p-3 rounded-xl text-sm font-medium flex items-center ${
                error
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {error ? (
                <AlertCircle className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {msg}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-teal-700 transition mt-2"
          >
            Guardar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}

function FormGroup({ title, color, children }) {
  const bg = `bg-${color}-50`;
  const border = `border-${color}-200`;
  const text = `text-${color}-800`;
  return (
    <div className={`p-4 rounded-2xl border ${border} ${bg} shadow-sm`}>
      <h4 className={`font-bold ${text} mb-3 text-sm flex items-center`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function CheckboxBtn({ label, checked, onClick, block }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center p-2.5 rounded-lg border text-left transition-all ${
        block ? "w-full" : "flex-1"
      } ${
        checked
          ? "bg-teal-500 border-teal-600 text-white shadow-inner"
          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center mr-2 flex-shrink-0 ${
          checked ? "border-white bg-teal-500" : "border-gray-300"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-[11px] font-bold leading-tight">{label}</span>
    </button>
  );
}

function CounterBtn({ label, count, onInc, onDec, target }) {
  return (
    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-black text-gray-800 w-8 text-center">
          {count}/{target}
        </span>
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={onDec}
            className="bg-gray-100 text-gray-700 w-8 h-8 rounded-md flex justify-center items-center font-bold hover:bg-gray-200 active:scale-95 transition"
          >
            -
          </button>
          <button
            type="button"
            onClick={onInc}
            className="bg-gray-100 text-gray-700 w-8 h-8 rounded-md flex justify-center items-center font-bold hover:bg-gray-200 active:scale-95 transition"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionDateBtn({ label, date, onClick }) {
  const d = date ? new Date(date).toLocaleDateString("pt-BR") : "Pendente";
  return (
    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
      <div>
        <span className="block text-xs font-bold text-gray-700">{label}</span>
        <span
          className={`text-[10px] font-bold ${
            date ? "text-teal-600" : "text-red-500"
          }`}
        >
          Último: {d}
        </span>
      </div>
      <button
        onClick={onClick}
        className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-1.5 px-2 rounded-md transition border border-gray-300 uppercase"
      >
        Marcar Hoje
      </button>
    </div>
  );
}

function ReportSection({ title, icon, patients, ruleId, color, textColor }) {
  const total = patients.length;
  const inCompliance = patients.filter(
    (p) => p.evaluation.rules.find((r) => r.id === ruleId)?.isOk
  ).length;
  const percentage = total === 0 ? 0 : Math.round((inCompliance / total) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 print:border-gray-300 print:shadow-none print:break-inside-avoid">
      <div className="flex justify-between items-center mb-4">
        <h3
          className={`font-bold ${textColor} flex items-center print:text-black`}
        >
          <span className="mr-2 text-xl">{icon}</span> {title}
        </h3>
      </div>
      {total === 0 ? (
        <p className="text-xs text-gray-400">Nenhum paciente neste grupo.</p>
      ) : (
        <>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 print:text-black">
              Pacientes em dia:
            </span>
            <span className="font-bold text-gray-800 print:text-black">
              {inCompliance} de {total}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden print:border print:border-gray-400 print:bg-white">
            <div
              className={`${color.replace(
                "50",
                "500"
              )} h-3 rounded-full print:bg-black`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-right font-bold text-gray-500 print:text-black">
            {percentage}% da meta alcançada
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between cursor-pointer border border-transparent hover:border-gray-200"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${color} mb-2`}
      >
        {React.cloneElement(icon, { className: "h-4 w-4" })}
      </div>
      <p className="text-2xl font-black text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{title}</p>
    </div>
  );
}
function GroupCard({ icon, title, count }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center space-x-3">
      <div className="text-2xl bg-gray-50 w-10 h-10 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
        <p className="text-lg font-bold text-gray-800">{count}</p>
      </div>
    </div>
  );
}
function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-14 py-2 relative transition-colors ${
        active ? "text-teal-600" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {badge > 0 && (
        <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
          {badge}
        </span>
      )}
      {React.cloneElement(icon, {
        className: `h-6 w-6 mb-1 ${active ? "fill-teal-50" : ""}`,
      })}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
function PatientListItem({ patient, onClick, isAlert }) {
  const { evaluation } = patient;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md relative overflow-hidden ${
        isAlert
          ? "border-red-200 border-l-4 border-l-red-500"
          : "border-gray-100 border-l-4 border-l-teal-500"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-2">
          <h3 className="font-bold text-gray-800 text-[15px] leading-tight mb-1">
            {patient.name}
          </h3>
          <p className="text-xs text-gray-500">
            {getAge(patient.birthDate)} anos • MA: {patient.microarea}
          </p>
        </div>
        <div
          className={`${
            evaluation.hasPending
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600"
          } p-1.5 rounded-lg flex items-center`}
        >
          {evaluation.hasPending ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({
  users,
  onAddUser,
  onToggleAccess,
  onChangeUserPassword,
}) {
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState("");

  const handleSavePassword = (email) => {
    if (editPassword) {
      onChangeUserPassword(email, editPassword);
      setEditingUser(null);
      setEditPassword("");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 rounded-2xl shadow-md text-white border border-gray-700">
        <h2 className="font-black text-lg flex items-center mb-1">
          <KeyRound className="w-5 h-5 mr-2 text-teal-400" /> Venda de Acessos
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newEmail && newPassword) {
              onAddUser(newEmail, newPassword);
              setNewEmail("");
              setNewPassword("");
            }
          }}
          className="mt-4 space-y-3 bg-gray-800 p-3 rounded-xl border border-gray-700"
        >
          <input
            type="email"
            required
            placeholder="E-mail do cliente"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-teal-500"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            type="text"
            required
            placeholder="Crie uma palavra-passe"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-teal-500"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-500 font-bold py-2.5 rounded-lg text-sm"
          >
            Liberar Acesso
          </button>
        </form>
      </div>
      <div className="space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className={`bg-white p-4 rounded-xl shadow-sm border ${
              u.active ? "border-gray-200" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-800 text-sm">{u.email}</p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                    u.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {u.active ? "LIBERADO" : "BLOQUEADO"}
                </span>
              </div>
              {u.role !== "master" && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingUser(editingUser === u.email ? null : u.email);
                      setEditPassword("");
                    }}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    <KeyRound className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onToggleAccess(u.email, u.active)}
                    className={`p-2 rounded-lg ${
                      u.active
                        ? "bg-red-100 text-red-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            {editingUser === u.email && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Nova palavra-passe"
                  className="flex-1 border rounded-lg p-2 text-sm outline-none focus:border-teal-500"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
                <button
                  onClick={() => handleSavePassword(u.email)}
                  className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-bold"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
