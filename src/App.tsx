/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, db, storage 
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Fuel, 
  History, 
  MapPin, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  TrendingUp, 
  Calendar,
  Gauge,
  Search,
  Wrench,
  ChevronRight,
  AlertCircle,
  Car,
  Trash2,
  Chrome,
  Star,
  ExternalLink,
  Ticket,
  X,
  Crown,
  CreditCard,
  CheckCircle2,
  ShoppingBag,
  Tag,
  ArrowUpRight,
  Sparkles,
  FileText,
  Upload,
  Download,
  FileCheck,
  FileWarning,
  ShieldCheck,
  Lock,
  Unlock,
  MapPinOff
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfWeek, startOfMonth, isWithinInterval, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FuelLog, UserProfile, Vehicle, Partner, Coupon, MaintenanceLog, ParkingLog } from './types';
import { findNearbyPlaces } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { deleteDoc, limit } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Check if user profile exists, if not create it
      const userDoc = await getDocFromServer(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userCredential.user.uid}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar com Google. Verifique se o pop-up foi bloqueado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userCredential.user.uid}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O cadastro por E-mail/Senha não está ativado no Firebase Console. Use o Google ou ative-o manualmente.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-sm border border-black/5">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
            <Fuel className="text-emerald-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FuelControl</h1>
          <p className="text-gray-500 text-sm">Controle seus gastos com inteligência</p>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 transition mb-6"
        >
          <Chrome size={20} className="text-blue-500" />
          Entrar com Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Ou use e-mail</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-600 text-sm font-medium hover:underline"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ logs }: { logs: FuelLog[] }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const weeklyLogs = logs.filter(log => isWithinInterval(parseISO(log.date), { start: weekStart, end: now }));
    const monthlyLogs = logs.filter(log => isWithinInterval(parseISO(log.date), { start: monthStart, end: now }));

    const sum = (arr: FuelLog[]) => arr.reduce((acc, curr) => acc + curr.totalCost, 0);
    const sumFuel = (arr: FuelLog[]) => arr.reduce((acc, curr) => acc + curr.fuelAmount, 0);

    const lastLog = logs[0];
    const prevLog = logs[1];

    return {
      weeklyTotal: sum(weeklyLogs),
      monthlyTotal: sum(monthlyLogs),
      weeklyFuel: sumFuel(weeklyLogs),
      monthlyFuel: sumFuel(monthlyLogs),
      lastOdometer: lastLog?.odometer || 0,
      lastFuel: lastLog?.fuelAmount || 0,
      lastCost: lastLog?.totalCost || 0,
      kmPerLiter: (lastLog && prevLog) ? (lastLog.odometer - prevLog.odometer) / prevLog.fuelAmount : 0
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-3">
            <Calendar size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Esta Semana</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">R$ {stats.weeklyTotal.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">{stats.weeklyFuel.toFixed(1)} Litros</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-3">
            <TrendingUp size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Este Mês</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">R$ {stats.monthlyTotal.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">{stats.monthlyFuel.toFixed(1)} Litros</div>
        </div>
      </div>

      <div className="bg-emerald-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Último Hodômetro</div>
              <div className="text-4xl font-mono font-bold tracking-tighter">{stats.lastOdometer.toLocaleString()} <span className="text-xl font-sans font-normal opacity-60">km</span></div>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <Gauge size={24} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <div className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest mb-1">Último Abastecimento</div>
              <div className="text-lg font-bold">R$ {stats.lastCost.toFixed(2)}</div>
              <div className="text-[10px] opacity-60">{stats.lastFuel.toFixed(1)}L</div>
            </div>
            <div>
              <div className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest mb-1">Consumo Médio</div>
              <div className="text-lg font-bold">{stats.kmPerLiter > 0 ? stats.kmPerLiter.toFixed(2) : '--'}</div>
              <div className="text-[10px] opacity-60">km/L</div>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-800 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Sponsored Deal (Monetization) */}
      <div className="bg-white p-6 rounded-[32px] border border-amber-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">Patrocinado</div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <ShoppingBag size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 leading-tight">Pneu Pirelli Scorpion ATR - 205/60R16</h3>
            <p className="text-[10px] text-gray-500 mt-1">Oferta exclusiva para usuários FuelControl. Economize 15% hoje.</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm font-black text-amber-600">R$ 589,90</span>
              <button className="text-[10px] font-bold text-gray-900 flex items-center gap-1 group-hover:text-amber-600 transition">
                Ver Oferta <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FuelForm = ({ onCancel }: { onCancel: () => void }) => {
  const [odometer, setOdometer] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'fuelLogs'), {
        userId: auth.currentUser.uid,
        odometer: Number(odometer),
        fuelAmount: Number(fuelAmount),
        totalCost: Number(totalCost),
        location,
        date: new Date().toISOString()
      });
      onCancel();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'fuelLogs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Novo Registro</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Hodômetro (km)</label>
              <input 
                type="number" 
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Litros</label>
              <input 
                type="number" 
                step="0.01"
                value={fuelAmount}
                onChange={(e) => setFuelAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valor Total (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Local (Opcional)</label>
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              placeholder="Nome do Posto"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50 mt-4"
          >
            {loading ? 'Salvando...' : 'Salvar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Discovery = () => {
  const [type, setType] = useState<'gas_station' | 'car_repair'>('gas_station');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, grounding: any[] } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showAllPartners, setShowAllPartners] = useState(false);

  useEffect(() => {
    const qPartners = query(collection(db, 'partners'), limit(showAllPartners ? 50 : 10));
    const unsubPartners = onSnapshot(qPartners, (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Partner[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'partners');
    });

    const qCoupons = query(collection(db, 'coupons'), limit(10));
    const unsubCoupons = onSnapshot(qCoupons, (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'coupons');
    });

    return () => {
      unsubPartners();
      unsubCoupons();
    };
  }, [showAllPartners]);

  const seedData = async () => {
    if (auth.currentUser?.email !== 'gdnpchc1978@gmail.com') return;
    
    const samplePartners = [
      {
        name: "Posto Estrela",
        category: "Posto de Combustível",
        logoUrl: "https://picsum.photos/seed/gas1/200/200",
        description: "Combustível de qualidade e conveniência 24h. Descontos exclusivos para usuários FuelControl.",
        rating: 4.8,
        websiteUrl: "https://google.com"
      },
      {
        name: "Oficina do João",
        category: "Mecânica",
        logoUrl: "https://picsum.photos/seed/repair1/200/200",
        description: "Especialista em motores e suspensão. Atendimento rápido e preço justo.",
        rating: 4.9,
        websiteUrl: "https://google.com"
      }
    ];

    const sampleCoupons = [
      {
        title: "10% OFF Gasolina",
        discount: "10%",
        code: "FUEL10",
        expiryDate: "2026-12-31"
      },
      {
        title: "Troca de Óleo Grátis",
        discount: "100%",
        code: "OILFREE",
        expiryDate: "2026-06-30"
      }
    ];

    try {
      for (const p of samplePartners) {
        await addDoc(collection(db, 'partners'), p);
      }
      for (const c of sampleCoupons) {
        await addDoc(collection(db, 'coupons'), c);
      }
      alert('Dados inicializados com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'partners/coupons');
    }
  };

  const handleSearch = () => {
    setLoading(true);
    setLocationError('');
    setResult(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada pelo navegador.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await findNearbyPlaces(type, position.coords.latitude, position.coords.longitude);
          setResult(data);
        } catch (err) {
          setLocationError('Erro ao buscar locais próximos.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLocationError('Permissão de localização negada.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Admin Seed Button */}
      {auth.currentUser?.email === 'gdnpchc1978@gmail.com' && partners.length === 0 && (
        <button 
          onClick={seedData}
          className="w-full py-3 bg-amber-50 text-amber-700 rounded-2xl text-xs font-bold border border-amber-100 flex items-center justify-center gap-2"
        >
          <Star size={14} className="fill-current" /> Inicializar Parceiros e Cupons (Admin)
        </button>
      )}

      {/* Featured Partners */}
      {partners.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="text-amber-500 fill-current" size={20} /> {showAllPartners ? 'Todos os Parceiros' : 'Parceiros em Destaque'}
            </h2>
            <button 
              onClick={() => setShowAllPartners(!showAllPartners)}
              className="text-xs font-bold text-emerald-600"
            >
              {showAllPartners ? 'Ver menos' : 'Ver todos'}
            </button>
          </div>
          <div className={cn(
            "flex gap-4 pb-4 no-scrollbar",
            showAllPartners ? "flex-wrap" : "overflow-x-auto -mx-6 px-6"
          )}>
            {partners.map(p => (
              <div 
                key={p.id} 
                className={cn(
                  "bg-white p-5 rounded-[32px] border border-black/5 shadow-sm transition hover:border-emerald-200",
                  showAllPartners ? "w-full" : "min-w-[260px]"
                )}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img src={p.logoUrl} alt={p.name} className="w-14 h-14 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">{p.category}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">{p.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-bold">{p.rating}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedPartner(p)}
                    className="text-xs font-bold text-gray-900 flex items-center gap-1 hover:text-emerald-600 transition"
                  >
                    Detalhes <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Coupons */}
      {coupons.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Ticket className="text-emerald-500" size={20} /> Cupons Exclusivos
          </h2>
          <div className="space-y-4">
            {coupons.map(c => (
              <div key={c.id} className="relative overflow-hidden bg-emerald-600 rounded-[32px] p-0.5 shadow-lg shadow-emerald-100 group">
                <div className="bg-white rounded-[30px] p-5 flex items-center gap-5 border-2 border-dashed border-emerald-100">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                    <Tag size={32} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900">{c.title}</h3>
                      <span className="text-lg font-black text-emerald-600">{c.discount}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">Válido até {c.expiryDate}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 font-mono font-bold text-gray-900 text-sm flex justify-between items-center">
                        {c.code}
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(c.code);
                            alert('Código copiado!');
                          }}
                          className="text-emerald-600 hover:scale-110 transition"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-emerald-600 rounded-full -translate-y-1/2" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-emerald-600 rounded-full -translate-y-1/2" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partner Details Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="bg-white w-full max-w-md rounded-[40px] p-8 pb-12 shadow-2xl relative"
          >
            <button 
              onClick={() => setSelectedPartner(null)}
              className="absolute right-6 top-6 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-6 mb-8">
              <img src={selectedPartner.logoUrl} alt={selectedPartner.name} className="w-24 h-24 rounded-3xl object-cover shadow-lg shadow-black/5" referrerPolicy="no-referrer" />
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">{selectedPartner.category}</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{selectedPartner.name}</h3>
                <div className="flex items-center gap-1 text-amber-500 mt-1">
                  <Star size={16} fill="currentColor" />
                  <span className="text-sm font-bold">{selectedPartner.rating}</span>
                </div>
              </div>
            </div>

            <p className="text-gray-500 leading-relaxed mb-8">
              {selectedPartner.description}
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => window.open(selectedPartner.websiteUrl, '_blank')}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <ExternalLink size={20} /> Visitar Website
              </button>
              <button 
                onClick={() => setSelectedPartner(null)}
                className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Descobrir</h2>
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setType('gas_station')}
            className={cn(
              "flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold transition",
              type === 'gas_station' ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
            )}
          >
            <Fuel size={18} />
            Postos
          </button>
          <button 
            onClick={() => setType('car_repair')}
            className={cn(
              "flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold transition",
              type === 'car_repair' ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
            )}
          >
            <Wrench size={18} />
            Peças
          </button>
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition disabled:opacity-50"
        >
          {loading ? 'Buscando...' : (
            <>
              <Search size={20} />
              Buscar {type === 'gas_station' ? 'Postos' : 'Auto Peças'} Próximos
            </>
          )}
        </button>

        {locationError && <p className="text-red-500 text-xs mt-4 text-center">{locationError}</p>}
      </div>

      {result && (
        <div className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="prose prose-sm max-w-none text-gray-600">
            <ReactMarkdown>{result.text}</ReactMarkdown>
          </div>
          
          {result.grounding.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Links do Google Maps</h3>
              <div className="space-y-2">
                {result.grounding.map((chunk: any, idx: number) => (
                  chunk.maps && (
                    <a 
                      key={idx}
                      href={chunk.maps.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition group"
                    >
                      <span className="text-sm font-medium text-gray-700">{chunk.maps.title || 'Ver no Mapa'}</span>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-emerald-600 transition" />
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Deals = () => {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Pneus');

  const categories = [
    { name: 'Pneus', query: 'melhor preço pneus aro 13 14 15 16 e caminhão' },
    { name: 'Óleo', query: 'promoção óleo lubrificante 5w30 10w40 diesel' },
    { name: 'Caminhão', query: 'ofertas peças caminhão lona rodoar tacógrafo' },
    { name: 'Baterias', query: 'melhor preço bateria automotiva 60ah 70ah 150ah' },
    { name: 'Acessórios', query: 'promoção rádio automotivo led tapete capa' },
    { name: 'Ferramentas', query: 'ofertas ferramentas mecânicas scanner automotivo' }
  ];

  const fetchDeals = async (queryStr: string) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um especialista em compras automotivas no Brasil. 
        Busque as MELHORES ofertas e MENORES preços atuais para: ${queryStr}.
        Priorize lojas confiáveis como: Mercado Livre, Amazon Brasil, Magalu, Shopee (vendedores oficiais), PneuStore, Autozone, e Connect Parts.
        Compare os preços e retorne apenas as promoções reais e ativas.
        Retorne uma lista JSON com: title, price, store, link, description, category, discountPercentage (se houver).
        Importante: O campo 'price' deve ser o valor numérico formatado como string (ex: "R$ 299,90").`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                price: { type: Type.STRING },
                store: { type: Type.STRING },
                link: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                discountPercentage: { type: Type.STRING }
              },
              required: ["title", "price", "store", "link"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || "[]");
      setDeals(data);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals(categories[0].query);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-amber-500 rounded-[40px] p-8 text-white relative overflow-hidden shadow-xl shadow-amber-100">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShoppingBag size={120} />
        </div>
        <div className="relative z-10">
          <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
            <Sparkles size={24} />
          </div>
          <h2 className="text-3xl font-bold mb-2">Melhor Preço</h2>
          <p className="text-amber-50 opacity-80 text-sm">Monitoramos as principais lojas do Brasil para encontrar o menor preço para você.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => {
              setActiveCategory(cat.name);
              fetchDeals(cat.query);
            }}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-bold transition whitespace-nowrap border",
              activeCategory === cat.name 
                ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200" 
                : "bg-white text-gray-500 border-black/5 hover:border-amber-500"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-[32px] border border-black/5 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="h-4 bg-gray-100 rounded w-1/4" />
                <div className="h-6 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-4" />
              <div className="h-3 bg-gray-50 rounded w-full mb-2" />
              <div className="h-3 bg-gray-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {deals.length === 0 ? (
            <div className="bg-white p-12 rounded-[32px] text-center border border-black/5">
              <Search className="mx-auto mb-4 text-gray-200" size={48} />
              <p className="text-gray-500 font-medium">Nenhuma oferta encontrada no momento.</p>
              <button onClick={() => fetchDeals(categories.find(c => c.name === activeCategory)?.query || '')} className="mt-4 text-amber-600 font-bold text-sm">Tentar novamente</button>
            </div>
          ) : (
            deals.map((deal, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-md transition group relative overflow-hidden">
                {deal.discountPercentage && (
                  <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-br-xl">
                    -{deal.discountPercentage}
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider">
                    {deal.category || activeCategory}
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">{deal.price}</div>
                    <div className="text-[10px] text-emerald-600 font-bold">Menor Preço</div>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 leading-tight mb-2 group-hover:text-amber-600 transition">{deal.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">{deal.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Loja</span>
                    <span className="text-xs font-bold text-gray-900">{deal.store}</span>
                  </div>
                  <a 
                    href={deal.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-amber-500 transition shadow-lg shadow-gray-100"
                  >
                    Ir para Loja <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="bg-gray-50 p-6 rounded-[32px] border border-black/5 text-center">
        <Sparkles className="mx-auto mb-3 text-amber-500" size={24} />
        <p className="text-xs font-bold text-gray-900">Busca Inteligente Ativa</p>
        <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] mx-auto">Analisamos milhares de preços para garantir que você pague o mínimo possível.</p>
      </div>
    </div>
  );
};

const Premium = ({ profile }: { profile: UserProfile | null }) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          email: auth.currentUser.email
        }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.isPremium) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-600 rounded-[40px] p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-100">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Crown size={120} />
          </div>
          <div className="relative z-10">
            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <Crown size={24} />
            </div>
            <h2 className="text-3xl font-bold mb-2">Você é Premium!</h2>
            <p className="text-emerald-50 opacity-80">Obrigado por apoiar o FuelControl. Aproveite todos os recursos exclusivos.</p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 border border-black/5 space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" size={20} /> Seus Benefícios Ativos
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Relatórios avançados de consumo
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Suporte prioritário
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Sem anúncios (em breve)
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Backup em nuvem ilimitado
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="relative z-10">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">Plano Premium</span>
          <h2 className="text-3xl font-bold mt-4 mb-2">Evolua sua Gestão</h2>
          <p className="text-gray-400 text-sm leading-relaxed">Tenha controle total sobre seus gastos e economize mais com recursos exclusivos.</p>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-black">R$ 19,90</span>
            <span className="text-gray-500 text-sm">/mês</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6">Por que ser Premium?</h3>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Análise Profissional</h4>
              <p className="text-xs text-gray-500 mt-1">Gráficos detalhados e projeções de gastos para o mês.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
              <Ticket size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Cupons VIP</h4>
              <p className="text-xs text-gray-500 mt-1">Acesso antecipado e descontos maiores em parceiros selecionados.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Gestão de Frotas</h4>
              <p className="text-xs text-gray-500 mt-1">Cadastre quantos veículos quiser sem limitações.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full mt-10 py-5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Processando...' : (
            <>
              Assinar Agora <ChevronRight size={20} />
            </>
          )}
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-4">Cancele a qualquer momento. Pagamento seguro via Stripe.</p>
      </div>
    </div>
  );
};

const HistoryList = ({ logs }: { logs: FuelLog[] }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico</h2>
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <History size={48} className="mx-auto mb-4 opacity-20" />
          <p>Nenhum registro encontrado</p>
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Fuel size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900">R$ {log.totalCost.toFixed(2)}</h3>
                <span className="text-[10px] text-gray-400 font-medium">{format(parseISO(log.date), "dd MMM, HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Gauge size={12} /> {log.odometer} km</span>
                <span className="text-xs text-gray-500 flex items-center gap-1"><Fuel size={12} /> {log.fuelAmount}L</span>
              </div>
              {log.location && (
                <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin size={10} /> {log.location}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const VehicleForm = ({ onCancel }: { onCancel: () => void }) => {
  const [type, setType] = useState('Carro');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [fuelType, setFuelType] = useState<'Álcool' | 'Gasolina' | 'Flex'>('Flex');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'vehicles'), {
        userId: auth.currentUser.uid,
        type,
        model,
        year: Number(year),
        fuelType
      });
      onCancel();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vehicles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Novo Veículo</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
            >
              <option value="Carro">Carro</option>
              <option value="Moto">Moto</option>
              <option value="Caminhão">Caminhão</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Modelo</label>
            <input 
              type="text" 
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              placeholder="Ex: Civic, Onix"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ano</label>
              <input 
                type="number" 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                placeholder="2024"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Combustível</label>
              <select 
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              >
                <option value="Álcool">Álcool</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Flex">Flex</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50 mt-4"
          >
            {loading ? 'Salvando...' : 'Cadastrar Veículo'}
          </button>
        </form>
      </div>
    </div>
  );
};

const MaintenanceLogForm = ({ vehicle, onCancel }: { vehicle: Vehicle, onCancel: () => void }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [mechanicName, setMechanicName] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !vehicle.id) return;
    setLoading(true);
    
    try {
      let fileUrl = '';
      let fileName = '';

      if (file) {
        const storageRef = ref(storage, `maintenance/${auth.currentUser.uid}/${vehicle.id}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(uploadResult.ref);
        fileName = file.name;
      }

      await addDoc(collection(db, 'maintenanceLogs'), {
        userId: auth.currentUser.uid,
        vehicleId: vehicle.id,
        date,
        description,
        mechanicName,
        cost: Number(cost) || 0,
        odometer: Number(odometer) || 0,
        fileUrl,
        fileName
      });
      onCancel();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'maintenanceLogs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nova Manutenção</h2>
            <p className="text-xs text-gray-400 mt-1">{vehicle.model}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Custo (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Quilometragem (km)</label>
            <input 
              type="number" 
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              placeholder="Ex: 45000"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mecânico / Oficina</label>
            <input 
              type="text" 
              value={mechanicName}
              onChange={(e) => setMechanicName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
              placeholder="Nome do mecânico ou oficina"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Serviço</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition min-h-[100px]"
              placeholder="Ex: Troca de óleo, pastilhas de freio..."
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Anexo PDF (Opcional)</label>
            <div className="relative">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="pdf-upload"
              />
              <label 
                htmlFor="pdf-upload"
                className={cn(
                  "w-full px-4 py-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition",
                  file ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-gray-50 text-gray-400 hover:border-emerald-300"
                )}
              >
                {file ? (
                  <>
                    <FileCheck size={24} />
                    <span className="text-xs font-bold truncate max-w-[200px]">{file.name}</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} />
                    <span className="text-xs font-bold">Selecionar PDF da Manutenção</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <FileText size={20} />
                Salvar Histórico
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const MaintenanceLogList = ({ vehicle, logs, onAdd, onBack }: { vehicle: Vehicle, logs: MaintenanceLog[], onAdd: () => void, onBack: () => void }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition">
          <Plus className="rotate-45" size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Histórico de Manutenção</h2>
          <p className="text-xs text-gray-400">{vehicle.model}</p>
        </div>
      </div>

      <button 
        onClick={onAdd}
        className="w-full py-4 bg-white border-2 border-dashed border-emerald-200 text-emerald-600 rounded-[32px] font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
      >
        <Plus size={20} /> Registrar Nova Manutenção
      </button>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-[32px] border border-black/5">
          <Wrench size={48} className="mx-auto mb-4 opacity-20" />
          <p>Nenhuma manutenção registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{format(parseISO(log.date), 'dd MMM yyyy', { locale: ptBR })}</div>
                    <h3 className="font-bold text-gray-900">{log.mechanicName || 'Mecânico não informado'}</h3>
                  </div>
                </div>
                {log.cost && log.cost > 0 && (
                  <div className="text-lg font-black text-emerald-600">R$ {log.cost.toFixed(2)}</div>
                )}
              </div>
              
              <div className="flex gap-4 mb-4">
                {log.odometer && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    <Gauge size={12} /> {log.odometer} km
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">{log.description}</p>

              {log.fileUrl && (
                <a 
                  href={log.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-emerald-50 hover:border-emerald-200 transition group"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Documento PDF</div>
                    <div className="text-xs font-bold text-gray-900 truncate">{log.fileName || 'Ver Comprovante'}</div>
                  </div>
                  <Download size={18} className="text-gray-300 group-hover:text-emerald-600" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VehicleList = ({ vehicles, onSelectLogs }: { vehicles: Vehicle[], onSelectLogs: (v: Vehicle) => void }) => {
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este veículo?')) return;
    try {
      await deleteDoc(doc(db, 'vehicles', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `vehicles/${id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Meus Veículos</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition"
        >
          <Plus size={20} />
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-[32px] border border-black/5">
          <Car size={48} className="mx-auto mb-4 opacity-20" />
          <p>Nenhum veículo cadastrado</p>
          <button 
            onClick={() => setShowForm(true)}
            className="mt-4 text-emerald-600 font-bold text-sm"
          >
            Cadastrar Primeiro Veículo
          </button>
        </div>
      ) : (
        vehicles.map((v) => (
          <div key={v.id} className="bg-white p-5 rounded-[32px] border border-black/5 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Car size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{v.model}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">{v.type}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-500">{v.year}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{v.fuelType}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => onSelectLogs(v)}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition flex items-center gap-1"
                title="Histórico de Manutenção"
              >
                <FileText size={18} />
                <span className="text-[10px] font-bold uppercase">Manutenções</span>
              </button>
              <button 
                onClick={() => v.id && handleDelete(v.id)}
                className="p-2 text-gray-300 hover:text-red-500 transition self-end"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))
      )}

      {showForm && <VehicleForm onCancel={() => setShowForm(false)} />}
    </div>
  );
};

// --- Main App ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.operationType) {
          errorMessage = `Erro no Firestore (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-red-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
            <p className="text-gray-500 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

const ParkingGuard = ({ vehicles, parkingLogs }: { vehicles: Vehicle[], parkingLogs: ParkingLog[] }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [odometer, setOdometer] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const activeLog = parkingLogs.find(l => l.status === 'active');

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedVehicleId || !odometer) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'parkingLogs'), {
        userId: auth.currentUser.uid,
        vehicleId: selectedVehicleId,
        entryOdometer: Number(odometer),
        entryDate: new Date().toISOString(),
        locationName: location,
        status: 'active'
      });
      setOdometer('');
      setLocation('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'parkingLogs');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async (logId: string, entryOdometer: number) => {
    const exitKm = prompt('Informe a quilometragem atual:');
    if (!exitKm) return;
    const exitVal = Number(exitKm);
    
    if (exitVal < entryOdometer) {
      alert('A quilometragem de saída não pode ser menor que a de entrada!');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'parkingLogs', logId), {
        exitOdometer: exitVal,
        exitDate: new Date().toISOString(),
        status: 'completed'
      }, { merge: true });
      
      const diff = exitVal - entryOdometer;
      if (diff > 0) {
        alert(`Atenção! O veículo rodou ${diff} km enquanto estava estacionado.`);
      } else {
        alert('Tudo certo! O veículo não foi movimentado.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parkingLogs/${logId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-xl shadow-gray-100">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck size={120} />
        </div>
        <div className="relative z-10">
          <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
            <Lock size={24} />
          </div>
          <h2 className="text-3xl font-bold mb-2">Guarda-Vagas</h2>
          <p className="text-gray-400 text-sm">Proteja seu veículo contra uso não autorizado em estacionamentos e oficinas.</p>
        </div>
      </div>

      {activeLog ? (
        <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-200 animate-pulse">
            <Lock size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Monitoramento Ativo</h3>
            <p className="text-sm text-gray-500 mt-1">
              {vehicles.find(v => v.id === activeLog.vehicleId)?.model} estacionado em <span className="font-bold text-gray-900">{activeLog.locationName || 'Local não informado'}</span>
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl inline-block border border-amber-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Km na Entrada</div>
            <div className="text-2xl font-black text-gray-900">{activeLog.entryOdometer} km</div>
          </div>
          <button 
            onClick={() => handleEnd(activeLog.id!, activeLog.entryOdometer)}
            disabled={loading}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition flex items-center justify-center gap-2"
          >
            <Unlock size={20} /> Liberar Veículo
          </button>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MapPinOff size={20} className="text-emerald-600" /> Iniciar Monitoramento
          </h3>
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Veículo</label>
              <select 
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                required
              >
                <option value="">Selecione um veículo</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.model}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Km Atual</label>
                <input 
                  type="number" 
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                  placeholder="Ex: 45000"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Local</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition"
                  placeholder="Ex: Estacionamento X"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading || vehicles.length === 0}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock size={20} /> Travar Quilometragem
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Histórico Recente</h3>
        {parkingLogs.filter(l => l.status === 'completed').slice(0, 5).map(log => {
          const diff = (log.exitOdometer || 0) - log.entryOdometer;
          return (
            <div key={log.id} className="bg-white p-5 rounded-[32px] border border-black/5 flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                diff > 0 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
              )}>
                {diff > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(parseISO(log.entryDate), 'dd MMM HH:mm', { locale: ptBR })}</div>
                <h4 className="font-bold text-gray-900">{log.locationName || 'Estacionamento'}</h4>
                <p className="text-[10px] text-gray-500">{vehicles.find(v => v.id === log.vehicleId)?.model}</p>
              </div>
              <div className="text-right">
                <div className={cn("text-sm font-black", diff > 0 ? "text-red-500" : "text-emerald-600")}>
                  {diff > 0 ? `+${diff} km` : '0 km'}
                </div>
                <div className="text-[10px] text-gray-400">Movimentação</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'discovery' | 'vehicles' | 'premium' | 'deals' | 'parking'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [parkingLogs, setParkingLogs] = useState<ParkingLog[]>([]);
  const [selectedVehicleForLogs, setSelectedVehicleForLogs] = useState<Vehicle | null>(null);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Logs listener
    const qLogs = query(
      collection(db, 'fuelLogs'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FuelLog[];
      setLogs(newLogs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'fuelLogs');
    });

    // Vehicles listener
    const qVehicles = query(
      collection(db, 'vehicles'),
      where('userId', '==', user.uid)
    );
    const unsubVehicles = onSnapshot(qVehicles, (snapshot) => {
      const newVehicles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vehicle[];
      setVehicles(newVehicles);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vehicles');
    });

    // Profile listener
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile({ uid: snapshot.id, ...snapshot.data() } as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Maintenance logs listener
    const qMaint = query(
      collection(db, 'maintenanceLogs'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubMaint = onSnapshot(qMaint, (snapshot) => {
      setMaintenanceLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MaintenanceLog[]);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'maintenanceLogs');
    });

    // Parking logs listener
    const qParking = query(
      collection(db, 'parkingLogs'),
      where('userId', '==', user.uid),
      orderBy('entryDate', 'desc')
    );
    const unsubParking = onSnapshot(qParking, (snapshot) => {
      setParkingLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ParkingLog[]);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'parkingLogs');
    });

    return () => {
      unsubLogs();
      unsubVehicles();
      unsubProfile();
      unsubMaint();
      unsubParking();
    };
  }, [user]);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f5f5f5] pb-24">
        {/* Header */}
        <header className="bg-white border-b border-black/5 px-6 py-4 sticky top-0 z-30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <Fuel size={20} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">FuelControl</h1>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 transition"
          >
            <LogOut size={20} />
          </button>
        </header>

        {/* Content */}
        <main className="max-w-md mx-auto p-6">
          {activeTab === 'dashboard' && <Dashboard logs={logs} />}
          {activeTab === 'history' && <HistoryList logs={logs} />}
          {activeTab === 'discovery' && <Discovery />}
          {activeTab === 'vehicles' && (
            selectedVehicleForLogs ? (
              <MaintenanceLogList 
                vehicle={selectedVehicleForLogs}
                logs={maintenanceLogs.filter(l => l.vehicleId === selectedVehicleForLogs.id)}
                onAdd={() => setShowMaintenanceForm(true)}
                onBack={() => setSelectedVehicleForLogs(null)}
              />
            ) : (
              <VehicleList vehicles={vehicles} onSelectLogs={setSelectedVehicleForLogs} />
            )
          )}
          {activeTab === 'premium' && <Premium profile={profile} />}
          {activeTab === 'deals' && <Deals />}
          {activeTab === 'parking' && <ParkingGuard vehicles={vehicles} parkingLogs={parkingLogs} />}
        </main>

        {/* FAB */}
        <button 
          onClick={() => setShowForm(true)}
          className="fixed right-6 bottom-28 w-16 h-16 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-200 flex items-center justify-center hover:scale-105 active:scale-95 transition z-40"
        >
          <Plus size={32} />
        </button>

        {/* Bottom Nav */}
        <nav className="fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-black/5 rounded-[32px] p-2 flex justify-between items-center shadow-2xl z-30">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex-1 flex flex-col items-center py-3 rounded-3xl transition",
              activeTab === 'dashboard' ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <TrendingUp size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('vehicles')}
            className={cn(
              "flex-1 flex flex-col items-center py-3 rounded-3xl transition",
              activeTab === 'vehicles' ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Car size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Veículos</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex-1 flex flex-col items-center py-3 rounded-3xl transition",
              activeTab === 'history' ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <History size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Logs</span>
          </button>
          <button 
            onClick={() => setActiveTab('discovery')}
            className={cn(
              "flex-1 flex flex-col items-center py-3 rounded-3xl transition",
              activeTab === 'discovery' ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <MapPin size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Mapa</span>
          </button>
          <button 
            onClick={() => setActiveTab('parking')}
            className={cn(
              "flex-1 flex flex-col items-center py-3 rounded-3xl transition",
              activeTab === 'parking' ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <ShieldCheck size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Guarda</span>
          </button>
          <button 
            onClick={() => setActiveTab('premium')}
            className={cn(
              "flex-1 flex flex-col items-center py-3 rounded-3xl transition",
              activeTab === 'premium' ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Crown size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Premium</span>
          </button>
          <button 
            onClick={() => setActiveTab('deals')}
            className={cn(
              "flex-1 flex flex-col items-center py-3 rounded-3xl transition",
              activeTab === 'deals' ? "bg-amber-500 text-white" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <ShoppingBag size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Ofertas</span>
          </button>
        </nav>

        {showForm && <FuelForm onCancel={() => setShowForm(false)} />}
        {showMaintenanceForm && selectedVehicleForLogs && (
          <MaintenanceLogForm 
            vehicle={selectedVehicleForLogs} 
            onCancel={() => setShowMaintenanceForm(false)} 
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
