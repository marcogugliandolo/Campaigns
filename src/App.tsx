import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, TrendingUp, Euro, Check, X, BarChart3, Calculator, 
  ArrowRight, Upload, User, Lock, Sun, Moon, Infinity as MetaIcon, 
  LogOut, Activity, Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Papa from 'papaparse';

// --- Datos Simulados para el Ejercicio ---
const INITIAL_CAMPAIGNS = [
  { id: 'c1', name: 'Retargeting - Web', daily_budget: 50, spend: 48.5, coupons: 12, cpa: 4.04 },
  { id: 'c2', name: 'Prospecting - Lookalike', daily_budget: 150, spend: 145.2, coupons: 25, cpa: 5.80 },
  { id: 'c3', name: 'Broad - Advantage+', daily_budget: 200, spend: 198.0, coupons: 42, cpa: 4.71 },
  { id: 'c4', name: 'CRM - Compradores', daily_budget: 80, spend: 75.0, coupons: 22, cpa: 3.40 },
];

interface BudgetRecommendation {
  campaignId: string;
  recommendedBudget: number;
  projectedCoupons: number;
  status: 'pending' | 'approved' | 'rejected';
}

// --- Componente Logo ---
const BrandLogo = ({ size = "normal" }: { size?: "normal" | "large" }) => {
  const dims = size === "large" ? "w-20 h-20 rounded-[2rem]" : "w-12 h-12 rounded-2xl";
  const iconSize = size === "large" ? "w-10 h-10" : "w-6 h-6";
  
  return (
    <div className={`relative flex items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/30 overflow-hidden shrink-0 ${dims}`}>
      <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
      <MetaIcon className={`${iconSize} text-white relative z-10 drop-shadow-md`} />
    </div>
  );
};

export default function App() {
  // --- Estados de Autenticación y Tema ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('diego_meta_auth') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- Estados de la Aplicación ---
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [targetBudget, setTargetBudget] = useState<number>(600);
  const [targetCoupons, setTargetCoupons] = useState<number>(150);
  const [recommendations, setRecommendations] = useState<Record<string, BudgetRecommendation>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers de Login ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'dgparga' && password === 'dgparga95') {
      setIsAuthenticated(true);
      localStorage.setItem('diego_meta_auth', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('diego_meta_auth');
    setUsername('');
    setPassword('');
  };

  // --- Handlers de Archivos ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedCampaigns = results.data.map((row: any, index) => ({
          id: row.id || `csv-${index}`,
          name: row.name || `Campaña ${index + 1}`,
          daily_budget: Number(row.daily_budget) || 0,
          spend: Number(row.spend) || 0,
          coupons: Number(row.coupons) || 0,
          cpa: Number(row.cpa) || 0,
        }));
        setCampaigns(parsedCampaigns);
        setRecommendations({});
      },
      error: (error) => {
        console.error("Error al parsear CSV:", error);
        alert("Hubo un error al leer el archivo CSV.");
      }
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Lógica de Optimización Simulada ---
  const runOptimization = () => {
    setIsOptimizing(true);
    
    setTimeout(() => {
      const totalInverseCpa = campaigns.reduce((sum, c) => sum + (1 / (c.cpa || 1)), 0);
      const newRecs: Record<string, BudgetRecommendation> = {};
      
      campaigns.forEach(c => {
        const safeCpa = c.cpa || 1;
        const performanceShare = (1 / safeCpa) / totalInverseCpa;
        let recommendedBudget = Math.round(targetBudget * performanceShare);
        
        recommendedBudget = Math.max(10, Math.min(c.daily_budget * 3, recommendedBudget));
        const projectedCoupons = Math.round(recommendedBudget / safeCpa);
        
        newRecs[c.id] = {
          campaignId: c.id,
          recommendedBudget,
          projectedCoupons,
          status: 'pending'
        };
      });
      
      setRecommendations(newRecs);
      setIsOptimizing(false);
    }, 1200);
  };

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    setRecommendations(prev => ({
      ...prev,
      [id]: { ...prev[id], status: action }
    }));
  };

  const applyChanges = () => {
    const newCampaigns = campaigns.map(c => {
      const rec = recommendations[c.id];
      if (rec && rec.status === 'approved') {
        return {
          ...c,
          daily_budget: rec.recommendedBudget,
          coupons: rec.projectedCoupons
        };
      }
      return c;
    });
    
    setCampaigns(newCampaigns);
    setRecommendations({});
  };

  // --- Cálculos de Resumen ---
  const currentTotalBudget = campaigns.reduce((sum, c) => sum + c.daily_budget, 0);
  const currentTotalCoupons = campaigns.reduce((sum, c) => sum + c.coupons, 0);
  const currentAvgCpa = currentTotalCoupons > 0 ? (currentTotalBudget / currentTotalCoupons) : 0;

  const projectedTotalBudget = campaigns.reduce((sum, c) => {
    const rec = recommendations[c.id];
    return sum + (rec && rec.status !== 'rejected' ? rec.recommendedBudget : c.daily_budget);
  }, 0);
  
  const projectedTotalCoupons = campaigns.reduce((sum, c) => {
    const rec = recommendations[c.id];
    return sum + (rec && rec.status !== 'rejected' ? rec.projectedCoupons : c.coupons);
  }, 0);

  const projectedAvgCpa = projectedTotalCoupons > 0 ? (projectedTotalBudget / projectedTotalCoupons) : 0;

  const chartData = useMemo(() => {
    return campaigns.map(c => {
      const rec = recommendations[c.id];
      const recBudget = rec && rec.status !== 'rejected' ? rec.recommendedBudget : c.daily_budget;
      return {
        name: c.name.split(' - ')[0],
        'Actual': c.daily_budget,
        'Sugerido': recBudget,
      };
    });
  }, [campaigns, recommendations]);

  const hasRecommendations = Object.keys(recommendations).length > 0;
  const hasApproved = (Object.values(recommendations) as BudgetRecommendation[]).some(r => r.status === 'approved');

  // --- PANTALLA DE LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0B1121] p-4 relative overflow-hidden transition-colors duration-500">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 dark:bg-blue-500/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/20 dark:bg-purple-500/10 blur-[120px] pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-3xl p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-white/50 dark:border-slate-800/50 w-full max-w-md relative z-10"
          >
            <div className="absolute top-6 right-6">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full bg-white/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-center mb-8">
              <BrandLogo size="large" />
            </div>
            
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 tracking-tight mb-2">
                MetaAds Studio
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Plataforma de Optimización</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400"
                    placeholder="Usuario"
                  />
                </div>
              </div>
              <div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400"
                    placeholder="Contraseña"
                  />
                </div>
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 dark:text-red-400 text-sm font-semibold text-center bg-red-50 dark:bg-red-900/20 py-3 rounded-xl"
                  >
                    Credenciales incorrectas.
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full flex justify-center py-4 px-4 rounded-2xl shadow-xl shadow-blue-500/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-all active:scale-[0.98] mt-4"
              >
                Acceder al Simulador
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- PANTALLA PRINCIPAL ---
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0B1121] text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/50 selection:text-blue-900 dark:selection:text-blue-100 pb-20 transition-colors duration-500 relative">
        
        {/* Background Gradients */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 dark:bg-blue-500/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/5 dark:bg-purple-500/5 blur-[120px]" />
        </div>

        {/* Header Flotante */}
        <header className="sticky top-0 sm:top-6 z-30 sm:mx-4 lg:mx-auto max-w-6xl">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b sm:border border-white/50 dark:border-slate-800/60 shadow-md sm:shadow-xl shadow-slate-200/40 dark:shadow-none sm:rounded-3xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-3 sm:gap-4">
              <BrandLogo size="normal" />
              <div>
                <h1 className="text-lg sm:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 tracking-tight leading-none">
                  MetaAds Studio
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5 sm:mt-1">
                  Simulador
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                title="Importar CSV"
              >
                <Upload className="w-4 h-4 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Importar</span>
              </button>

              <div className="w-px h-6 sm:h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                title="Alternar tema"
              >
                {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors shadow-sm"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 relative z-10">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Panel de Controles */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-4 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/30 dark:shadow-none border border-white/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Configuración</h2>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                    <span>Presupuesto Diario</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="50"
                      value={targetBudget}
                      onChange={(e) => setTargetBudget(Number(e.target.value))}
                      className="flex-1 accent-blue-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="relative w-28">
                      <input
                        type="number"
                        value={targetBudget}
                        onChange={(e) => setTargetBudget(Number(e.target.value))}
                        className="w-full pl-3 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors shadow-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                    <span>Objetivo de Cupones</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={targetCoupons}
                      onChange={(e) => setTargetCoupons(Number(e.target.value))}
                      className="flex-1 accent-purple-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="relative w-28">
                      <input
                        type="number"
                        value={targetCoupons}
                        onChange={(e) => setTargetCoupons(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-colors shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={runOptimization}
                    disabled={isOptimizing}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-blue-500/20"
                  >
                    {isOptimizing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <MetaIcon className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <Calculator className="w-5 h-5" />
                    )}
                    {isOptimizing ? 'Procesando IA...' : 'Generar Estimación'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Sección Gráfico */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/30 dark:shadow-none border border-white/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Distribución de Inversión</h2>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 600}} tickFormatter={(val) => `${val}€`} />
                    <Tooltip 
                      cursor={{fill: isDarkMode ? '#1e293b' : '#f1f5f9'}} 
                      contentStyle={{
                        borderRadius: '16px', 
                        border: '1px solid ' + (isDarkMode ? '#334155' : '#e2e8f0'), 
                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        fontWeight: 'bold'
                      }}
                      formatter={(value: number) => [`${value}€`, '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 600, fontSize: '13px' }} />
                    <Bar dataKey="Actual" fill={isDarkMode ? '#475569' : '#cbd5e1'} radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Sugerido" fill="url(#colorSugerido)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <defs>
                      <linearGradient id="colorSugerido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Tarjetas de Resumen (Movidas Abajo) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
          >
            {/* Tarjeta Presupuesto */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-6 shadow-xl shadow-slate-200/30 dark:shadow-none border border-white/60 dark:border-slate-800/60 flex flex-col justify-center relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                <Euro className="w-24 h-24 transform translate-x-4 -translate-y-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Euro className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Presupuesto</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">{hasRecommendations ? projectedTotalBudget : currentTotalBudget}€</span>
              </div>
              {hasRecommendations && (
                <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-bold bg-white/50 dark:bg-slate-800/50 w-fit px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Actual: {currentTotalBudget}€</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className={projectedTotalBudget > currentTotalBudget ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {projectedTotalBudget > currentTotalBudget ? 'Sube' : 'Baja'}
                  </span>
                </div>
              )}
            </div>

            {/* Tarjeta Cupones */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-6 shadow-xl shadow-slate-200/30 dark:shadow-none border border-white/60 dark:border-slate-800/60 flex flex-col justify-center relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                <Target className="w-24 h-24 transform translate-x-4 -translate-y-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cupones Est.</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">{hasRecommendations ? projectedTotalCoupons : currentTotalCoupons}</span>
              </div>
              {hasRecommendations && (
                <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-bold bg-white/50 dark:bg-slate-800/50 w-fit px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Actual: {currentTotalCoupons}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className={projectedTotalCoupons > currentTotalCoupons ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                    {projectedTotalCoupons > currentTotalCoupons ? 'Mejora' : 'Empeora'}
                  </span>
                </div>
              )}
            </div>

            {/* Tarjeta CPA */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-6 shadow-xl shadow-slate-200/30 dark:shadow-none border border-white/60 dark:border-slate-800/60 flex flex-col justify-center relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                <Activity className="w-24 h-24 transform translate-x-4 -translate-y-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CPA Promedio</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">{(hasRecommendations ? projectedAvgCpa : currentAvgCpa).toFixed(2)}€</span>
              </div>
              {hasRecommendations && (
                <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-bold bg-white/50 dark:bg-slate-800/50 w-fit px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Actual: {currentAvgCpa.toFixed(2)}€</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className={projectedAvgCpa < currentAvgCpa ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                    {projectedAvgCpa < currentAvgCpa ? 'Mejora' : 'Empeora'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tabla de Campañas */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] shadow-xl shadow-slate-200/30 dark:shadow-none border border-white/60 dark:border-slate-800/60 overflow-hidden"
          >
            <div className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 dark:bg-slate-900/40">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight">Detalle Operativo</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Revisa y aprueba las estimaciones campaña por campaña</p>
              </div>
              
              <AnimatePresence>
                {hasRecommendations && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={applyChanges}
                    disabled={!hasApproved}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 dark:shadow-white/10 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    Aplicar Cambios
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800/60">Campaña</th>
                    <th className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800/60 text-right">CPA Actual</th>
                    <th className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800/60 text-right">Presupuesto Actual</th>
                    <th className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800/60 text-right bg-blue-50/30 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">Sugerido</th>
                    <th className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800/60 text-center bg-blue-50/30 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {campaigns.map((campaign) => {
                    const rec = recommendations[campaign.id];
                    const budgetDiff = rec ? rec.recommendedBudget - campaign.daily_budget : 0;
                    const isApproved = rec?.status === 'approved';
                    const isRejected = rec?.status === 'rejected';
                    
                    return (
                      <tr key={campaign.id} className={`transition-colors group ${isApproved ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : isRejected ? 'bg-slate-50/50 dark:bg-slate-800/20 opacity-60' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'}`}>
                        <td className="px-6 sm:px-8 py-5">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 group-hover:border-blue-300 dark:group-hover:border-blue-700 transition-colors shrink-0">
                              {campaign.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{campaign.name}</div>
                              <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 font-mono truncate">ID: {campaign.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                          {campaign.cpa.toFixed(2)}€
                        </td>
                        <td className="px-6 sm:px-8 py-5 text-right">
                          <div className="font-mono font-black text-slate-700 dark:text-slate-300 text-base sm:text-lg">{campaign.daily_budget}€</div>
                          <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">{campaign.coupons} cupones</div>
                        </td>
                        <td className="px-6 sm:px-8 py-5 text-right bg-blue-50/10 dark:bg-blue-900/5">
                          {rec ? (
                            <div className={`transition-all ${isRejected ? 'line-through opacity-50' : ''}`}>
                              <div className="font-mono font-black text-blue-600 dark:text-blue-400 text-lg sm:text-xl">
                                {rec.recommendedBudget}€
                              </div>
                              <div className="flex items-center justify-end gap-1 sm:gap-2 mt-1">
                                <span className={`text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-md ${budgetDiff > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : budgetDiff < 0 ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                  {budgetDiff > 0 ? '+' : ''}{budgetDiff}€
                                </span>
                                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold">
                                  ~{rec.projectedCoupons} cup.
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-sm font-bold italic">-</span>
                          )}
                        </td>
                        <td className="px-6 sm:px-8 py-5 text-center bg-blue-50/10 dark:bg-blue-900/5">
                          {rec ? (
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                              <button
                                onClick={() => handleAction(campaign.id, 'approved')}
                                className={`p-2 sm:p-2.5 rounded-xl transition-all ${isApproved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700'}`}
                                title="Aprobar"
                              >
                                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button
                                onClick={() => handleAction(campaign.id, 'rejected')}
                                className={`p-2 sm:p-2.5 rounded-xl transition-all ${isRejected ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 scale-110' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700'}`}
                                title="Rechazar"
                              >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-200 dark:text-slate-700">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

        </main>
      </div>
    </div>
  );
}
