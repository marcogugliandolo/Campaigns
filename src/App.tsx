import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Target, TrendingUp, Euro, Check, X, BarChart3, Calculator, ArrowRight, Upload, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

export default function App() {
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [targetBudget, setTargetBudget] = useState<number>(600);
  const [targetCoupons, setTargetCoupons] = useState<number>(150);
  const [recommendations, setRecommendations] = useState<Record<string, BudgetRecommendation>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Lógica de Optimización Simulada ---
  const runOptimization = () => {
    setIsOptimizing(true);
    
    setTimeout(() => {
      // Algoritmo simple: dar más presupuesto a las campañas con menor CPA
      const totalInverseCpa = campaigns.reduce((sum, c) => sum + (1 / c.cpa), 0);
      const newRecs: Record<string, BudgetRecommendation> = {};
      
      campaigns.forEach(c => {
        const performanceShare = (1 / c.cpa) / totalInverseCpa;
        let recommendedBudget = Math.round(targetBudget * performanceShare);
        
        // Reglas de negocio simuladas: no bajar de 10€ ni subir más del triple
        recommendedBudget = Math.max(10, Math.min(c.daily_budget * 3, recommendedBudget));
        
        const projectedCoupons = Math.round(recommendedBudget / c.cpa);
        
        newRecs[c.id] = {
          campaignId: c.id,
          recommendedBudget,
          projectedCoupons,
          status: 'pending'
        };
      });
      
      setRecommendations(newRecs);
      setIsOptimizing(false);
    }, 800); // Pequeño retraso para efecto visual
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
          coupons: rec.projectedCoupons // Simulamos que ya genera estos cupones
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

  // --- Datos para el Gráfico ---
  const chartData = useMemo(() => {
    return campaigns.map(c => {
      const rec = recommendations[c.id];
      const recBudget = rec && rec.status !== 'rejected' ? rec.recommendedBudget : c.daily_budget;
      return {
        name: c.name.split(' - ')[0], // Nombre corto
        'Presupuesto Actual': c.daily_budget,
        'Presupuesto Sugerido': recBudget,
      };
    });
  }, [campaigns, recommendations]);

  const hasRecommendations = Object.keys(recommendations).length > 0;
  const hasApproved = (Object.values(recommendations) as BudgetRecommendation[]).some(r => r.status === 'approved');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* Header Amigable */}
      <header className="bg-white/70 border-b border-slate-200/60 sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-200/50">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Simulador Meta Ads</h1>
              <p className="text-sm text-slate-500 font-medium">Entorno de Prácticas & Estimaciones</p>
            </div>
          </div>
          
          <div>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        
        {/* Sección Superior: Controles y Resumen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Panel de Controles */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4 bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Tus Objetivos</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Presupuesto Diario</span>
                  <span className="text-indigo-600">{targetBudget}€</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={targetBudget}
                  onChange={(e) => setTargetBudget(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Objetivo de Cupones</span>
                  <span className="text-purple-600">{targetCoupons}</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={targetCoupons}
                  onChange={(e) => setTargetCoupons(Number(e.target.value))}
                  className="w-full accent-purple-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <button
                onClick={runOptimization}
                disabled={isOptimizing}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-70 shadow-md shadow-slate-900/10"
              >
                {isOptimizing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Calculator className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isOptimizing ? 'Calculando...' : 'Simular Optimización'}
              </button>
            </div>
          </motion.div>

          {/* Panel de Resumen */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {/* Tarjeta Presupuesto */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Euro className="w-32 h-32 transform translate-x-4 -translate-y-4" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Presupuesto</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800">{hasRecommendations ? projectedTotalBudget : currentTotalBudget}€</span>
              </div>
              {hasRecommendations && (
                <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <span>Actual: {currentTotalBudget}€</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className={projectedTotalBudget > currentTotalBudget ? 'text-indigo-600' : 'text-emerald-600'}>
                    {projectedTotalBudget > currentTotalBudget ? 'Sube' : 'Baja'}
                  </span>
                </div>
              )}
            </div>

            {/* Tarjeta Cupones */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="w-32 h-32 transform translate-x-4 -translate-y-4" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Cupones Est.</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800">{hasRecommendations ? projectedTotalCoupons : currentTotalCoupons}</span>
              </div>
              {hasRecommendations && (
                <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <span>Actual: {currentTotalCoupons}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className={projectedTotalCoupons > currentTotalCoupons ? 'text-emerald-600' : 'text-red-500'}>
                    {projectedTotalCoupons > currentTotalCoupons ? 'Mejora' : 'Empeora'}
                  </span>
                </div>
              )}
            </div>

            {/* Tarjeta CPA */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-32 h-32 transform translate-x-4 -translate-y-4" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">CPA Promedio</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800">{(hasRecommendations ? projectedAvgCpa : currentAvgCpa).toFixed(2)}€</span>
              </div>
              {hasRecommendations && (
                <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <span>Actual: {currentAvgCpa.toFixed(2)}€</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className={projectedAvgCpa < currentAvgCpa ? 'text-emerald-600' : 'text-red-500'}>
                    {projectedAvgCpa < currentAvgCpa ? 'Más barato' : 'Más caro'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sección Gráfico */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Distribución de Presupuesto</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} tickFormatter={(val) => `${val}€`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => [`${value}€`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Presupuesto Actual" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={50} />
                <Bar dataKey="Presupuesto Sugerido" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tabla de Campañas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Detalle por Campaña</h3>
              <p className="text-sm text-slate-500 mt-1">Revisa y aprueba las estimaciones</p>
            </div>
            
            {hasRecommendations && (
              <button
                onClick={applyChanges}
                disabled={!hasApproved}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
              >
                <Check className="w-4 h-4" />
                Guardar Escenario
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-8 py-4 font-bold">Campaña</th>
                  <th className="px-8 py-4 font-bold text-right">CPA Actual</th>
                  <th className="px-8 py-4 font-bold text-right">Presupuesto Actual</th>
                  <th className="px-8 py-4 font-bold text-right bg-indigo-50/30 text-indigo-600/70 rounded-tl-xl">Sugerido</th>
                  <th className="px-8 py-4 font-bold text-center bg-indigo-50/30 text-indigo-600/70 rounded-tr-xl">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {campaigns.map((campaign) => {
                  const rec = recommendations[campaign.id];
                  const budgetDiff = rec ? rec.recommendedBudget - campaign.daily_budget : 0;
                  const isApproved = rec?.status === 'approved';
                  const isRejected = rec?.status === 'rejected';
                  
                  return (
                    <tr key={campaign.id} className={`transition-colors ${isApproved ? 'bg-emerald-50/30' : isRejected ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50'}`}>
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800">{campaign.name}</div>
                        <div className="text-xs text-slate-400 font-medium mt-1">ID: {campaign.id}</div>
                      </td>
                      <td className="px-8 py-5 text-right font-mono font-medium text-slate-600">
                        {campaign.cpa.toFixed(2)}€
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="font-mono font-bold text-slate-700">{campaign.daily_budget}€</div>
                        <div className="text-xs text-slate-400 font-medium mt-1">{campaign.coupons} cupones</div>
                      </td>
                      <td className="px-8 py-5 text-right bg-indigo-50/10">
                        {rec ? (
                          <div className={`transition-all ${isRejected ? 'line-through opacity-50' : ''}`}>
                            <div className="font-mono font-black text-indigo-600 text-lg">
                              {rec.recommendedBudget}€
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-1">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${budgetDiff > 0 ? 'bg-emerald-100 text-emerald-700' : budgetDiff < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                {budgetDiff > 0 ? '+' : ''}{budgetDiff}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                ~{rec.projectedCoupons} cupones
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-sm font-medium italic">Esperando simulación...</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center bg-indigo-50/10">
                        {rec ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAction(campaign.id, 'approved')}
                              className={`p-2 rounded-xl transition-all ${isApproved ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 scale-110' : 'bg-white text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 border border-slate-200'}`}
                              title="Aprobar"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleAction(campaign.id, 'rejected')}
                              className={`p-2 rounded-xl transition-all ${isRejected ? 'bg-slate-200 text-slate-500 scale-110' : 'bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 border border-slate-200'}`}
                              title="Rechazar"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-200">-</span>
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
  );
}
