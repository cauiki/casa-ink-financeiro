import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  Timestamp,
  where 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, // Mudança: Login com senha
  signInWithCustomToken,
  onAuthStateChanged,
  signOut // Para sair
} from 'firebase/auth';
import { 
  Plus, 
  DollarSign, 
  User, 
  Scissors, 
  CreditCard, 
  Trash2, 
  History,
  TrendingUp,
  Download,
  Zap,
  Lock,
  LogOut
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }
  return {
    apiKey: "AIzaSyBziidFxTOUj6Dw1bue91VqkvCcx_GuWeo",
    authDomain: "a-casa-ink.firebaseapp.com",
    projectId: "a-casa-ink",
    storageBucket: "a-casa-ink.firebasestorage.app",
    messagingSenderId: "896931473476",
    appId: "1:896931473476:web:038948d8f21af498f3f411",
    measurementId: "G-6NCN2T1FLB"
  };
};

const firebaseConfig = getFirebaseConfig();

// Inicialização Segura
let app, auth, db;
if (firebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
  }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'casa-ink-prod';

// --- Componente Principal ---
export default function ACasaInkFinancial() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dayTotal, setDayTotal] = useState(0);

  // Estados de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados do Formulário de Entrada
  const [clientName, setClientName] = useState('');
  const [artist, setArtist] = useState('');
  const [service, setService] = useState('Tatuagem');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [value, setValue] = useState('');
  const [obs, setObs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listas de Opções
  const artistsList = [
    "Jhully", 
    "Aryan", 
    "Salomão", 
    "Lih", 
    "Guest 1"
  ];

  // --- Autenticação ---
  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      // Se estiver no ambiente de teste da IA, loga automático para eu poder te mostrar
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
           await signInWithCustomToken(auth, __initial_auth_token); 
        } catch (e) {
           console.warn("Token IA falhou");
        }
      }
      // Se estiver na Vercel (Produção), NÃO faz nada. Espera o usuário digitar a senha.
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false); // Para mostrar a tela de login
    });

    return () => unsubscribeAuth();
  }, []);

  // --- Login Manual ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Sucesso: o onAuthStateChanged vai atualizar o user e a tela vai mudar
    } catch (error) {
      console.error(error);
      setLoginError("Acesso negado. Verifique e-mail e senha.");
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // --- Buscar Transações (Só roda se tiver user) ---
  useEffect(() => {
    if (!user || !db) return;

    setLoading(true);
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'transactions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(data);
      
      const today = new Date().toDateString();
      const total = data
        .filter(t => t.createdAt && t.createdAt.toDate().toDateString() === today)
        .reduce((acc, curr) => acc + parseFloat(curr.value), 0);
      
      setDayTotal(total);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar:", error);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user]);

  // --- Funções Auxiliares ---
  const handleValueChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    val = (val / 100).toFixed(2) + '';
    val = val.replace(".", ",");
    val = val.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setValue(val);
  };

  const parseCurrency = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString('pt-BR');
  };

  const handleExport = () => {
    if (transactions.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    let csvContent = "Data;Hora;Cliente;Artista;Serviço;Pagamento;Valor;Obs\n";
    transactions.forEach(t => {
      const date = t.createdAt ? t.createdAt.toDate().toLocaleDateString('pt-BR') : '';
      const time = t.createdAt ? t.createdAt.toDate().toLocaleTimeString('pt-BR') : '';
      const val = t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const cleanObs = t.obs ? t.obs.replace(/;/g, ",").replace(/\n/g, " ") : "";
      csvContent += `${date};${time};${t.clientName};${t.artist};${t.service};${t.paymentMethod};${val};${cleanObs}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CAIXA_CASA_INK_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName || !artist || !value) return;
    setIsSubmitting(true);
    try {
      const numericValue = parseCurrency(value);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
        clientName,
        artist,
        service,
        paymentMethod,
        value: numericValue,
        obs,
        createdAt: Timestamp.now(),
        userId: user.uid
      });
      setClientName('');
      setValue('');
      setObs('');
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar transação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("CONFIRMA A EXCLUSÃO DESTE REGISTRO?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
    }
  };

  // --- RENDERIZAÇÃO: TELA DE LOGIN ---
  if (!user) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap'); .font-raleway { font-family: 'Raleway', sans-serif; }`}</style>
        <div className="min-h-screen bg-black text-white font-raleway flex items-center justify-center p-4 selection:bg-[#ec008c]">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
            {/* Efeito Neon */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ec008c] to-transparent opacity-70"></div>
            
            <div className="flex flex-col items-center mb-8">
               <div className="h-16 w-auto mb-4">
                 <img 
                   src="/logo.png?v=4" 
                   alt="Logo Casa Ink" 
                   className="h-full w-full object-contain"
                   onError={(e) => { e.target.style.display = 'none'; }}
                 />
               </div>
               <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white">Acesso Restrito</h2>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Gestão Financeira</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">E-mail</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-zinc-600" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@acasaink.com"
                    className="w-full bg-black border border-zinc-800 text-white p-3 pl-10 focus:border-[#ec008c] focus:outline-none transition-colors uppercase text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-zinc-600" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-zinc-800 text-white p-3 pl-10 focus:border-[#ec008c] focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="text-[#ec008c] text-xs font-bold text-center bg-[#ec008c]/10 p-2 border border-[#ec008c]/20">
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] py-4 transition-all flex items-center justify-center gap-2"
              >
                {isLoggingIn ? 'Entrando...' : 'Acessar Sistema'}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // --- RENDERIZAÇÃO: APP PRINCIPAL (Logado) ---
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap');
        .font-raleway { font-family: 'Raleway', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-black text-white font-raleway pb-12 selection:bg-[#ec008c] selection:text-white">
        
        {/* Header Black & White */}
        <header className="bg-black border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-md bg-opacity-95">
          <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-start">
            <div className="flex items-center gap-4 mt-2">
              <div className="h-16 w-auto flex items-center">
                 <img 
                   src="/logo.png?v=4" 
                   alt="Logo Casa Ink" 
                   className="h-full w-full object-contain" 
                   onError={(e) => {
                     e.target.onerror = null; 
                     e.target.style.display = 'none'; 
                     e.target.parentNode.innerHTML = '<span class="text-white font-black text-xl border-2 border-white p-2">CI</span>';
                   }}
                 />
              </div>

              <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                  A CASA INK
                </h1>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Gestão Financeira</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-col items-end leading-none">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-[#ec008c]" />
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Total Hoje</span>
                </div>
                <span className="text-[#ec008c] font-black text-6xl tracking-tighter drop-shadow-[0_0_15px_rgba(236,0,140,0.4)] leading-[0.8]">
                  {formatCurrency(dayTotal)}
                </span>
              </div>
              
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 text-[9px] uppercase font-bold text-zinc-600 hover:text-white transition-colors group"
                  title="Baixar Excel"
                >
                  <Download size={12} className="group-hover:text-white transition-colors" />
                  CSV
                </button>
                <div className="w-[1px] h-3 bg-zinc-800 self-center"></div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-[9px] uppercase font-bold text-zinc-600 hover:text-[#ec008c] transition-colors group"
                  title="Sair do Sistema"
                >
                  <LogOut size={12} className="group-hover:text-[#ec008c] transition-colors" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
          {/* Formulário de Entrada */}
          <section className="relative">
            <div className="relative bg-black p-8 border border-zinc-800 shadow-2xl">
              <div className="flex items-center justify-between mb-10 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1 rounded-none">
                    <Plus className="text-black" size={20} strokeWidth={3} />
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">Nova Entrada</h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Linha 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-white transition-colors">Cliente</label>
                    <div className="relative">
                      <User className="absolute left-0 top-3 text-zinc-600 group-focus-within:text-white transition-colors" size={20} />
                      <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="NOME DO CLIENTE" className="w-full bg-black border-b border-zinc-800 text-white font-bold text-lg rounded-none py-3 pl-8 pr-4 focus:outline-none focus:border-white transition-all placeholder-zinc-800 uppercase" />
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-[#ec008c] uppercase tracking-widest ml-1 opacity-80 group-focus-within:opacity-100 transition-opacity">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-0 top-3 text-[#ec008c]" size={20} />
                      <input type="text" required value={value} onChange={handleValueChange} placeholder="0,00" className="w-full bg-black border-b border-zinc-800 text-[#ec008c] font-black text-2xl rounded-none py-2 pl-8 pr-4 focus:outline-none focus:border-[#ec008c] transition-all placeholder-zinc-800 tracking-wider" />
                    </div>
                  </div>
                </div>

                {/* Linha 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-white transition-colors">Artista</label>
                    <div className="relative">
                      <User className="absolute left-0 top-3 text-zinc-600 group-focus-within:text-white transition-colors" size={20} />
                      <select required value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full bg-black border-b border-zinc-800 text-white font-bold text-sm rounded-none py-3 pl-8 pr-4 focus:outline-none focus:border-white appearance-none uppercase">
                        <option value="" disabled>SELECIONE O ARTISTA</option>
                        {artistsList.map((art, idx) => (
                          <option key={idx} value={art}>{art.toUpperCase()}</option>
                        ))}
                      </select>
                      <div className="absolute right-0 top-4 w-2 h-2 border-r-2 border-b-2 border-zinc-700 pointer-events-none rotate-45"></div>
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-white transition-colors">Serviço</label>
                    <div className="relative">
                      <Scissors className="absolute left-0 top-3 text-zinc-600 group-focus-within:text-white transition-colors" size={20} />
                      <select value={service} onChange={(e) => setService(e.target.value)} className="w-full bg-black border-b border-zinc-800 text-white font-bold text-sm rounded-none py-3 pl-8 pr-4 focus:outline-none focus:border-white appearance-none uppercase">
                        <option value="Tatuagem">TATUAGEM</option>
                        <option value="Sinal/Reserva">SINAL / RESERVA</option>
                        <option value="Piercing">PIERCING (PERFURAÇÃO)</option>
                        <option value="Joia">JOIA (VENDA AVULSA)</option>
                        <option value="Retoque">RETOQUE</option>
                        <option value="Curso/Workshop">CURSO / WORKSHOP</option>
                        <option value="Workshop">WORKSHOP</option>
                      </select>
                      <div className="absolute right-0 top-4 w-2 h-2 border-r-2 border-b-2 border-zinc-700 pointer-events-none rotate-45"></div>
                    </div>
                  </div>
                </div>

                {/* Linha 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-white transition-colors">Pagamento</label>
                    <div className="relative">
                      <CreditCard className="absolute left-0 top-3 text-zinc-600 group-focus-within:text-white transition-colors" size={20} />
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-black border-b border-zinc-800 text-white font-bold text-sm rounded-none py-3 pl-8 pr-4 focus:outline-none focus:border-white appearance-none uppercase">
                        <option value="Pix">PIX</option>
                        <option value="Dinheiro">DINHEIRO</option>
                        <option value="Débito">DÉBITO</option>
                        <option value="Crédito 1x">CRÉDITO À VISTA (1x)</option>
                        <option value="Crédito Parc.">CRÉDITO PARCELADO (2x+)</option>
                      </select>
                      <div className="absolute right-0 top-4 w-2 h-2 border-r-2 border-b-2 border-zinc-700 pointer-events-none rotate-45"></div>
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">OBS (Opcional)</label>
                    <input type="text" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="EX: PARCELOU EM 10X" className="w-full bg-black border-b border-zinc-800 text-white rounded-none py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all placeholder-zinc-800 uppercase text-sm font-medium" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full mt-10 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] py-5 rounded-none transition-all flex items-center justify-center gap-3 shadow-[4px_4px_0px_#333] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                  {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR ENTRADA'}
                </button>
              </form>
            </div>
          </section>

          {/* Histórico */}
          <section>
            <div className="flex items-center gap-3 mb-8 px-1 border-b border-zinc-900 pb-2">
              <History className="text-white" size={20} />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Fluxo Recente</h3>
            </div>
            {loading ? (
              <div className="text-center py-12 text-zinc-500 font-mono text-xs uppercase animate-pulse">Carregando dados...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 bg-zinc-950 border border-zinc-900 border-dashed text-zinc-600 text-xs font-bold uppercase tracking-widest">Nenhum movimento registrado hoje.</div>
            ) : (
              <div className="space-y-6">
                {transactions.map((t) => (
                  <div key={t.id} className="relative bg-zinc-950 p-6 border-l-[1px] border-zinc-800 hover:border-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all group">
                    <div className="absolute right-0 bottom-0 opacity-[0.02] pointer-events-none transform translate-x-1/4 translate-y-1/4"><Zap size={100} className="text-white" /></div>
                    <div className="flex items-start gap-6 z-10 relative">
                      <div className={`h-12 w-12 flex items-center justify-center font-black text-xs border shrink-0 ${t.service === 'Sinal/Reserva' ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-500 bg-zinc-900'}`}>{t.service === 'Sinal/Reserva' ? 'R' : 'T'}</div>
                      <div>
                        <div className="flex items-center gap-3"><h4 className="font-bold text-white uppercase tracking-wide text-lg">{t.clientName}</h4>{t.obs && <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-none uppercase tracking-wide font-bold">{t.obs}</span>}</div>
                        <div className="flex items-center gap-2 mt-2"><span className="text-[10px] font-bold text-white uppercase tracking-wider bg-zinc-900 px-2 py-1">{t.artist}</span><span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{t.service}</span></div>
                        <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">{t.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto sm:gap-10 pl-18 sm:pl-0 z-10 relative mt-4 sm:mt-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[#ec008c] font-black text-4xl tracking-tighter drop-shadow-sm leading-none">{formatCurrency(t.value)}</span>
                        <span className="text-[9px] text-zinc-600 font-bold uppercase font-mono mt-2">{formatFullDate(t.createdAt)} • {formatDate(t.createdAt)}</span>
                      </div>
                      <button onClick={() => handleDelete(t.id)} className="text-zinc-800 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-2 absolute -right-2 -top-2 sm:relative sm:right-auto sm:top-auto" title="Apagar registro"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}