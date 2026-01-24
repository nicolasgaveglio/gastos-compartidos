import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { Upload, DollarSign, User, Filter, Edit2, Plus, Save, X, Trash2, ListChecks, LogOut, CreditCard, Calendar, ArrowLeft, Wallet, TrendingUp, PiggyBank, Building, Target, Copy, AlertTriangle, TrendingDown, Percent, RefreshCw, BarChart3, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

// =====================================================
// CONFIGURACIÓN
// =====================================================
const DEFAULT_CATEGORIES = {
  Alquiler: ['alquiler', 'rent'],
  Electricidad: ['electricidad', 'electric', 'endesa', 'iberdrola'],
  Gas: ['gas natural', 'gas'],
  Agua: ['agua', 'aguas', 'aigues'],
  Celular: ['telefonica moviles', 'movistar', 'vodafone', 'orange', 'yoigo', 'celular'],
  Internet: ['telefonica de espana', 'fijo', 'internet', 'fibra'],
  'Casa': ['ikea', 'leroy', 'media markt', 'worten', 'el corte ingles', 'ferreteria', 'el millor preu'],
  'Transporte público': ['tmb', 't mobilitat', 'renfe', 'metro', 'bus'],
  Bicing: ['bicing'],
  'Uber/taxi': ['uber', 'taxi', 'cabify', 'bolt', 'yego'],
  Supermercado: [
    'mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'caprabo', 'bonpreu', 
    'condis', 'supermercat', 'kachafruit', 'greensland', 'cash and carry', 'beauty', 'sempre obert', 'botiga'
  ],
  Suplementos: ['suplemento', 'proteina', 'vitamina', 'myprotein'],
  Salidas: [
    'restauran', 'bar ', 'popis', 'fornet', 'canigo', 'bonastre', 'bravas', 'foix', 'pedreta', 
    'pren algo', 'el tomas de sarria', 'tomas de sarria', 'lucciano', 'cem tres', 'tragaluz', 'dellaostia', 'yuki'
  ],
  Ropa: ['zara', 'h&m', 'mango', 'pull&bear', 'bershka', 'stradivarius', 'oysho', 'massimo dutti', 'uniqlo'],
  Limpieza: ['limpieza', 'detergente', 'lejia'],
  'Peluquería/Barbería': ['peluqueria', 'barberia', 'salon', 'corte pelo'],
  Educación: ['universidad', 'curso', 'academia', 'escuela', 'nuclio', 'udemy', 'coursera'],
  'Plataformas (Netflix/Amazon/Adobe/Spotify/Microsoft)': ['netflix', 'amazon prime', 'spotify', 'adobe', 'microsoft', 'disney', 'hbo', 'apple'],
  'Conciertos/Obras de teatro': ['concierto', 'teatro', 'entradas', 'ticketmaster'],
  Deportes: ['decathlon', 'sprinter', 'gimnasio', 'deporte'],
  'Recreación al aire libre': ['parque', 'excursion', 'montana'],
  'Seguro médico': ['seguro medico', 'axa', 'sanitas', 'mapfre', 'planeta seguros'],
  Gimnasio: ['gimnasio', 'gym', 'fitness', 'crossfit'],
  'Consultas de médicos/odontólogos': ['medico', 'doctor', 'clinica', 'dentista', 'odontologo'],
  'Farmacia/Medicamentos': ['farmacia', 'medicamento', 'parafarmacia', 'fcia'],
  Pasajes: ['vueling', 'ryanair', 'iberia', 'renfe', 'avion', 'tren'],
  Alojamiento: ['booking', 'airbnb', 'hotel', 'hostal'],
  Comidas: ['comida', 'meal', 'food'],
  Recuerdos: ['souvenir', 'recuerdo', 'regalo'],
  'Alquiler de coches': ['rent a car', 'alquiler coche', 'hertz', 'avis', 'europcar'],
  Psicóloga: ['psicologa', 'psicologo', 'terapia', 'psicoterapia'],
  'Cuotas': ['klarna', 'scalapay', 'aplazame', 'aplázame', 'paypal credit', 'sequra', 'cetelem', 'cofidis', 'pepper'],
  Otro: [],
};

const DEFAULT_PAYMENT_METHODS = ['Klarna', 'Scalapay', 'Aplázame', 'Caixa', 'Paypal', 'Revolut', 'Bizum'];
const ACCOUNT_TYPES = ['cuenta', 'inversion', 'prestamo'];
const CURRENCIES = ['EUR', 'USD', 'AUD', 'GBP', 'TWD'];
const INCOME_TYPES = ['salario', 'rendimiento', 'devolucion', 'otro'];
const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6', '#f97316'];
const ALLOWED_EMAILS = ['nicogaveglio@gmail.com', 'constanzabetelu@gmail.com'];

// Exchanges disponibles para inversiones
const EXCHANGES = ['NASDAQ', 'NYSE', 'AMS', 'XETRA', 'LON', 'TPE', 'BME', 'MIL'];

// Mapeo de tickers a Yahoo Finance
const TICKER_YAHOO_MAP = {
  // US stocks (sin sufijo)
  'META': 'META', 'GOOG': 'GOOG', 'GOOGL': 'GOOGL', 'MSFT': 'MSFT',
  'AMZN': 'AMZN', 'NVDA': 'NVDA', 'AAPL': 'AAPL', 'TSLA': 'TSLA',
  // European
  'ASML': 'ASML.AS',  // Amsterdam
  'SXR8': 'SXR8.DE',  // Alemania (ETF S&P500)
  // UK
  'ZEG': 'ZEG.L',     // Londres
  // Taiwan
  '2330': '2330.TW',  // TSMC
};

// Colores para categorías de inversión
const INVESTMENT_CATEGORY_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', 
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
];

// Categorías de inversión por defecto
const DEFAULT_INVESTMENT_CATEGORIES = [
  { name: 'Tech', color: '#8b5cf6' },
  { name: 'Semiconductores', color: '#06b6d4' },
  { name: 'ETFs', color: '#10b981' },
  { name: 'Financiero', color: '#f59e0b' },
  { name: 'Salud', color: '#ef4444' },
  { name: 'Energía', color: '#3b82f6' },
  { name: 'Consumo', color: '#ec4899' },
  { name: 'Cripto', color: '#f97316' },
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
const ExpenseTrackerApp = () => {
  const [currentPage, setCurrentPage] = useState('expenses');
  const [user, setUser] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ person: 'all', category: 'all', month: 'all' });
  const [installmentFilter, setInstallmentFilter] = useState({ person: 'all' });
  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState([]);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [showManualExpenseModal, setShowManualExpenseModal] = useState(false);
  const [manualExpense, setManualExpense] = useState({
    date: new Date().toLocaleDateString('es-ES'),
    concept: '',
    amount: '',
    category: 'Otro',
    person: 'Nicolás',
  });
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [installmentForm, setInstallmentForm] = useState({
    description: '',
    payment_method: 'Klarna',
    total_amount: '',
    total_installments: '',
    start_month: new Date().toISOString().slice(0, 7),
    person: 'Nicolás',
  });

  // Estados para Presupuesto
  const [accounts, setAccounts] = useState([]);
  const [accountBalances, setAccountBalances] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [budgetAdjustments, setBudgetAdjustments] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({ USD: 0.92, AUD: 0.60 }); // Tasas por defecto
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({
    name: '',
    currency: 'EUR',
    type: 'cuenta',
    person: 'Compartido',
    notes: '',
  });
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    account_id: '',
    month: new Date().toISOString().slice(0, 7),
    balance: '',
  });
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [incomeForm, setIncomeForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    type: 'salario',
    description: '',
    amount: '',
    person: 'Nicolás',
  });
  const [budgetViewMonth, setBudgetViewMonth] = useState(new Date().toISOString().slice(0, 7));

  // Estados para página de Presupuesto (proyección)
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [budgetMonthly, setBudgetMonthly] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [showBudgetCategoryModal, setShowBudgetCategoryModal] = useState(false);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null);
  const [budgetCategoryForm, setBudgetCategoryForm] = useState({
    name: '',
    monthly_amount: '',
  });
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);
  const [savingsGoalForm, setSavingsGoalForm] = useState({
    name: '',
    target_amount: '',
  });
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState('all');

  // Estados para métodos de pago personalizados
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(new Date().toISOString().slice(0, 7));

  // Estados para página de Inversiones
  const [investments, setInvestments] = useState([]);
  const [investmentTransactions, setInvestmentTransactions] = useState([]);
  const [investmentCategories, setInvestmentCategories] = useState([]);
  const [portfolioSnapshots, setPortfolioSnapshots] = useState([]);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [investmentForm, setInvestmentForm] = useState({
    ticker: '',
    name: '',
    exchange: 'NASDAQ',
    currency: 'USD',
    category_id: '',
    person: 'Nicolás',
    date: new Date().toISOString().slice(0, 10),
    quantity: '',
    price: '',
    commission: '0',
  });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionForm, setTransactionForm] = useState({
    investment_id: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'buy',
    quantity: '',
    price: '',
    commission: '0',
    notes: '',
  });
  const [showInvestmentCategoryModal, setShowInvestmentCategoryModal] = useState(false);
  const [newInvestmentCategory, setNewInvestmentCategory] = useState('');
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [exchangeRatesInv, setExchangeRatesInv] = useState({ USD: 1, EUR: 1, GBP: 1, TWD: 1, AUD: 1 });
  const [showTransactionsTable, setShowTransactionsTable] = useState(false);

  // =====================================================
  // AUTENTICACIÓN
  // =====================================================
  useEffect(() => {
    const validateAndSetUser = async (session) => {
      if (session?.user) {
        const email = session.user.email?.toLowerCase();
        if (!ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
          alert('Acceso no autorizado. Esta aplicación es privada.');
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(session?.user ?? null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      validateAndSetUser(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null);
        setExpenses([]);
        setInstallments([]);
        setGroupId(null);
        setIsInitialized(false);
        setLoading(false);
        return;
      }
      validateAndSetUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // =====================================================
  // CARGAR GRUPO
  // =====================================================
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadUserGroup = async () => {
      try {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, name')
          .contains('user_ids', [user.id])
          .single();

        if (groupError && groupError.code !== 'PGRST116') throw groupError;

        if (groupData) {
          setGroupId(groupData.id);
        } else {
          const { data: newGroup, error: createError } = await supabase
            .from('groups')
            .insert({ name: `Grupo de ${user.email?.split('@')[0] || 'Usuario'}`, user_ids: [user.id] })
            .select('id')
            .single();
          if (createError) throw createError;
          setGroupId(newGroup.id);
        }
      } catch (error) {
        console.error('Error en loadUserGroup:', error);
        alert('Error cargando tu grupo. Por favor recarga la página.');
      }
    };

    loadUserGroup();
  }, [user]);

  // =====================================================
  // CARGAR DATOS
  // =====================================================
  useEffect(() => {
    if (!user || groupId === null) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('*')
          .eq('group_id', groupId)
          .order('date', { ascending: false });
        setExpenses(expensesData || []);

        const { data: installmentsData } = await supabase
          .from('installments')
          .select('*')
          .eq('group_id', groupId)
          .order('start_month', { ascending: true });
        setInstallments(installmentsData || []);

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('categories')
          .eq('group_id', groupId)
          .single();
        if (categoriesData?.categories) {
          setCategories({ ...DEFAULT_CATEGORIES, ...categoriesData.categories });
        }

        // Cargar datos de presupuesto
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('*')
          .eq('group_id', groupId)
          .eq('is_active', true)
          .order('name');
        setAccounts(accountsData || []);

        const { data: balancesData } = await supabase
          .from('account_balances')
          .select('*')
          .eq('group_id', groupId)
          .order('month', { ascending: false });
        setAccountBalances(balancesData || []);

        const { data: incomesData } = await supabase
          .from('incomes')
          .select('*')
          .eq('group_id', groupId)
          .order('month', { ascending: false });
        setIncomes(incomesData || []);

        const { data: adjustmentsData } = await supabase
          .from('budget_adjustments')
          .select('*')
          .eq('group_id', groupId)
          .order('month', { ascending: false });
        setBudgetAdjustments(adjustmentsData || []);

        // Cargar categorías de presupuesto
        const { data: budgetCategoriesData } = await supabase
          .from('budget_categories')
          .select('*')
          .eq('group_id', groupId)
          .eq('is_active', true)
          .order('sort_order');
        setBudgetCategories(budgetCategoriesData || []);

        // Cargar montos mensuales de presupuesto
        const { data: budgetMonthlyData } = await supabase
          .from('budget_monthly')
          .select('*')
          .eq('group_id', groupId);
        setBudgetMonthly(budgetMonthlyData || []);

        // Cargar metas de ahorro
        const { data: savingsGoalsData } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('group_id', groupId)
          .eq('is_active', true);
        setSavingsGoals(savingsGoalsData || []);

        // Cargar inversiones
        const { data: investmentsData } = await supabase
          .from('investments')
          .select('*')
          .eq('group_id', groupId)
          .eq('is_active', true)
          .order('ticker');
        setInvestments(investmentsData || []);

        // Cargar transacciones de inversiones
        const { data: transactionsData } = await supabase
          .from('investment_transactions')
          .select('*')
          .order('date', { ascending: false });
        setInvestmentTransactions(transactionsData || []);

        // Cargar categorías de inversión
        const { data: invCategoriesData } = await supabase
          .from('investment_categories')
          .select('*')
          .eq('group_id', groupId)
          .order('sort_order');
        
        // Si no hay categorías, crear las por defecto
        if (!invCategoriesData || invCategoriesData.length === 0) {
          const defaultCats = DEFAULT_INVESTMENT_CATEGORIES.map((cat, idx) => ({
            group_id: groupId,
            name: cat.name,
            color: cat.color,
            sort_order: idx,
          }));
          const { data: newCats } = await supabase
            .from('investment_categories')
            .insert(defaultCats)
            .select();
          setInvestmentCategories(newCats || []);
        } else {
          setInvestmentCategories(invCategoriesData);
        }

        // Cargar snapshots del portafolio
        const { data: snapshotsData } = await supabase
          .from('portfolio_snapshots')
          .select('*')
          .eq('group_id', groupId)
          .order('date', { ascending: true });
        setPortfolioSnapshots(snapshotsData || []);

        // Cargar tasas de cambio (API gratuita)
        try {
          const ratesResponse = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
          const ratesData = await ratesResponse.json();
          if (ratesData.rates) {
            setExchangeRates({
              USD: 1 / ratesData.rates.USD,
              AUD: 1 / ratesData.rates.AUD,
            });
            setExchangeRatesInv({
              USD: ratesData.rates.USD,
              EUR: 1,
              GBP: ratesData.rates.GBP,
              TWD: ratesData.rates.TWD,
              AUD: ratesData.rates.AUD,
            });
          }
        } catch (e) {
          console.log('Usando tasas de cambio por defecto');
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, groupId]);

  // =====================================================
  // FUNCIONES AUTH
  // =====================================================
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) alert('Error al iniciar sesión: ' + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // =====================================================
  // FUNCIONES DE PERSISTENCIA - GASTOS
  // =====================================================
  const saveExpenseToDb = async (expense) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          date: expense.date,
          concept: expense.concept,
          amount: parseFloat(expense.amount),
          category: expense.category,
          person: expense.person,
        }])
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally {
      setSaving(false);
    }
  };

  const updateExpenseInDb = async (id, updates) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('group_id', groupId)
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally {
      setSaving(false);
    }
  };

  const deleteExpenseFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id).eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  const saveCategoriestoDb = async (newCategories) => {
    if (!groupId) return;
    try {
      const { error } = await supabase
        .from('categories')
        .upsert([{ group_id: groupId, categories: newCategories }], { onConflict: 'group_id' });
      if (!error) setCategories(newCategories);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // =====================================================
  // FUNCIONES DE PERSISTENCIA - CUOTAS
  // =====================================================
  const saveInstallmentToDb = async (installment) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('installments')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          description: installment.description,
          payment_method: installment.payment_method,
          total_amount: parseFloat(installment.total_amount),
          total_installments: parseInt(installment.total_installments),
          installment_amount: parseFloat(installment.total_amount) / parseInt(installment.total_installments),
          start_month: installment.start_month + '-01',
          person: installment.person,
        }])
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally {
      setSaving(false);
    }
  };

  const updateInstallmentInDb = async (id, updates) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('installments')
        .update({
          description: updates.description,
          payment_method: updates.payment_method,
          total_amount: parseFloat(updates.total_amount),
          total_installments: parseInt(updates.total_installments),
          installment_amount: parseFloat(updates.total_amount) / parseInt(updates.total_installments),
          start_month: updates.start_month + '-01',
          person: updates.person,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('group_id', groupId)
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally {
      setSaving(false);
    }
  };

  const deleteInstallmentFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase.from('installments').delete().eq('id', id).eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  // =====================================================
  // FUNCIONES DE PERSISTENCIA - PRESUPUESTO
  // =====================================================
  
  // CUENTAS
  const saveAccountToDb = async (account) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{ group_id: groupId, ...account }])
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const updateAccountInDb = async (id, updates) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('group_id', groupId)
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const deleteAccountFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', id).eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  // SALDOS
  const saveBalanceToDb = async (balance) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      // Calcular saldo en EUR
      const account = accounts.find(a => a.id === balance.account_id);
      let balanceEur = parseFloat(balance.balance);
      let rate = 1;
      if (account && account.currency !== 'EUR') {
        rate = exchangeRates[account.currency] || 1;
        balanceEur = parseFloat(balance.balance) * rate;
      }

      const balanceData = {
        group_id: groupId,
        account_id: balance.account_id,
        month: balance.month + '-01',
        balance: parseFloat(balance.balance),
        balance_eur: balanceEur,
        exchange_rate: rate,
      };

      // Upsert - actualizar si existe, insertar si no
      const { data, error } = await supabase
        .from('account_balances')
        .upsert([balanceData], { onConflict: 'account_id,month' })
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  // INGRESOS
  const saveIncomeToDb = async (income) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('incomes')
        .insert([{
          group_id: groupId,
          month: income.month + '-01',
          type: income.type,
          description: income.description,
          amount: parseFloat(income.amount),
          person: income.person,
        }])
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const updateIncomeInDb = async (id, updates) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('incomes')
        .update({
          month: updates.month + '-01',
          type: updates.type,
          description: updates.description,
          amount: parseFloat(updates.amount),
          person: updates.person,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('group_id', groupId)
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const deleteIncomeFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase.from('incomes').delete().eq('id', id).eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  // =====================================================
  // FUNCIONES DE PERSISTENCIA - CATEGORÍAS DE PRESUPUESTO
  // =====================================================
  
  const saveBudgetCategoryToDb = async (category) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert([{ 
          group_id: groupId, 
          name: category.name,
          monthly_amount: parseFloat(category.monthly_amount) || 0,
          sort_order: budgetCategories.length,
        }])
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const updateBudgetCategoryInDb = async (id, updates) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('group_id', groupId)
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const deleteBudgetCategoryFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase.from('budget_categories').update({ is_active: false }).eq('id', id).eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  const saveBudgetMonthlyToDb = async (categoryId, month, amount) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('budget_monthly')
        .upsert([{
          group_id: groupId,
          category_id: categoryId,
          month: month + '-01',
          amount: parseFloat(amount) || 0,
        }], { onConflict: 'category_id,month' })
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const copyBudgetFromPreviousMonth = async (targetMonth) => {
    if (!user || groupId === null) return;
    setSaving(true);
    try {
      const targetDate = new Date(targetMonth + '-01');
      const prevDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
      const prevMonth = prevDate.toISOString().slice(0, 7) + '-01';
      
      const prevBudgets = budgetMonthly.filter(b => b.month === prevMonth);
      
      for (const budget of prevBudgets) {
        await supabase
          .from('budget_monthly')
          .upsert([{
            group_id: groupId,
            category_id: budget.category_id,
            month: targetMonth + '-01',
            amount: budget.amount,
          }], { onConflict: 'category_id,month' });
      }
      
      // Recargar datos
      const { data } = await supabase
        .from('budget_monthly')
        .select('*')
        .eq('group_id', groupId);
      setBudgetMonthly(data || []);
      
      alert('✅ Presupuesto copiado del mes anterior');
    } catch (error) {
      alert('Error al copiar presupuesto');
    } finally { setSaving(false); }
  };

  // METAS DE AHORRO
  const saveSavingsGoalToDb = async (goal) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert([{
          group_id: groupId,
          name: goal.name,
          target_amount: parseFloat(goal.target_amount),
        }])
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } finally { setSaving(false); }
  };

  const deleteSavingsGoalFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase.from('savings_goals').update({ is_active: false }).eq('id', id).eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  // =====================================================
  // FUNCIONES CRUD INVERSIONES
  // =====================================================
  
  // Guardar nueva inversión con primera transacción
  const saveInvestmentToDb = async (formData) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const total = (parseFloat(formData.quantity) * parseFloat(formData.price)) + parseFloat(formData.commission || 0);
      
      // Crear inversión
      const { data: investment, error: invError } = await supabase
        .from('investments')
        .insert([{
          group_id: groupId,
          ticker: formData.ticker.toUpperCase(),
          name: formData.name || formData.ticker.toUpperCase(),
          exchange: formData.exchange,
          currency: formData.currency,
          category_id: formData.category_id || null,
          quantity: parseFloat(formData.quantity),
          avg_purchase_price: parseFloat(formData.price),
          total_invested: total,
          person: formData.person,
        }])
        .select()
        .single();
      
      if (invError) { alert(`Error: ${invError.message}`); return null; }
      
      // Crear primera transacción
      const { data: transaction, error: txError } = await supabase
        .from('investment_transactions')
        .insert([{
          investment_id: investment.id,
          date: formData.date,
          type: 'buy',
          quantity: parseFloat(formData.quantity),
          price: parseFloat(formData.price),
          commission: parseFloat(formData.commission || 0),
          total: total,
        }])
        .select()
        .single();
      
      if (txError) console.error('Error creando transacción:', txError);
      
      if (transaction) {
        setInvestmentTransactions([transaction, ...investmentTransactions]);
      }
      
      return investment;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Actualizar inversión
  const updateInvestmentInDb = async (id, updates) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('investments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('group_id', groupId)
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } catch { return null; }
    finally { setSaving(false); }
  };

  // Eliminar inversión
  const deleteInvestmentFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase
        .from('investments')
        .update({ is_active: false })
        .eq('id', id)
        .eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  // Agregar transacción (compra/venta)
  const saveTransactionToDb = async (formData) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const total = (parseFloat(formData.quantity) * parseFloat(formData.price)) + parseFloat(formData.commission || 0);
      
      const { data: transaction, error } = await supabase
        .from('investment_transactions')
        .insert([{
          investment_id: formData.investment_id,
          date: formData.date,
          type: formData.type,
          quantity: parseFloat(formData.quantity),
          price: parseFloat(formData.price),
          commission: parseFloat(formData.commission || 0),
          total: total,
          notes: formData.notes,
        }])
        .select()
        .single();
      
      if (error) { alert(`Error: ${error.message}`); return null; }
      
      // Recalcular la inversión
      await recalculateInvestment(formData.investment_id);
      
      return transaction;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Actualizar transacción
  const updateTransactionInDb = async (id, updates) => {
    if (!user || groupId === null) return null;
    setSaving(true);
    try {
      const total = (parseFloat(updates.quantity) * parseFloat(updates.price)) + parseFloat(updates.commission || 0);
      
      const { data, error } = await supabase
        .from('investment_transactions')
        .update({ 
          ...updates, 
          total: total,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) { alert(`Error: ${error.message}`); return null; }
      
      // Recalcular la inversión
      if (data.investment_id) {
        await recalculateInvestment(data.investment_id);
      }
      
      return data;
    } catch { return null; }
    finally { setSaving(false); }
  };

  // Eliminar transacción
  const deleteTransactionFromDb = async (id, investmentId) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase
        .from('investment_transactions')
        .delete()
        .eq('id', id);
      if (error) { alert(`Error: ${error.message}`); return false; }
      
      // Recalcular la inversión
      await recalculateInvestment(investmentId);
      
      return true;
    } catch { return false; }
  };

  // Recalcular totales de una inversión basado en sus transacciones
  const recalculateInvestment = async (investmentId) => {
    try {
      const { data: txs } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('investment_id', investmentId)
        .order('date');
      
      if (!txs || txs.length === 0) return;
      
      let totalQty = 0;
      let totalCost = 0;
      
      txs.forEach(tx => {
        if (tx.type === 'buy') {
          totalQty += tx.quantity;
          totalCost += tx.total;
        } else if (tx.type === 'sell') {
          totalQty -= tx.quantity;
          totalCost -= (tx.quantity * (totalCost / (totalQty + tx.quantity)));
        }
      });
      
      const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
      
      await supabase
        .from('investments')
        .update({
          quantity: totalQty,
          avg_purchase_price: avgPrice,
          total_invested: totalCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', investmentId);
      
      // Actualizar estado local
      setInvestments(prev => prev.map(inv => 
        inv.id === investmentId 
          ? { ...inv, quantity: totalQty, avg_purchase_price: avgPrice, total_invested: totalCost }
          : inv
      ));
      
    } catch (e) {
      console.error('Error recalculando inversión:', e);
    }
  };

  // Guardar categoría de inversión
  const saveInvestmentCategoryToDb = async (name) => {
    if (!user || groupId === null || !name.trim()) return null;
    setSaving(true);
    try {
      const color = INVESTMENT_CATEGORY_COLORS[investmentCategories.length % INVESTMENT_CATEGORY_COLORS.length];
      const { data, error } = await supabase
        .from('investment_categories')
        .insert([{ group_id: groupId, name: name.trim(), color, sort_order: investmentCategories.length }])
        .select()
        .single();
      if (error) { alert(`Error: ${error.message}`); return null; }
      return data;
    } catch { return null; }
    finally { setSaving(false); }
  };

  // Eliminar categoría de inversión
  const deleteInvestmentCategoryFromDb = async (id) => {
    if (!user || groupId === null) return false;
    try {
      const { error } = await supabase.from('investment_categories').delete().eq('id', id).eq('group_id', groupId);
      if (error) { alert(`Error: ${error.message}`); return false; }
      return true;
    } catch { return false; }
  };

  // Obtener precio de Yahoo Finance usando proxy CORS
  const fetchStockPrice = async (ticker, exchange) => {
    try {
      // Construir el símbolo de Yahoo Finance
      let yahooTicker = TICKER_YAHOO_MAP[ticker];
      if (!yahooTicker) {
        // Intentar construir basado en exchange
        switch (exchange) {
          case 'AMS': yahooTicker = `${ticker}.AS`; break;
          case 'XETRA': yahooTicker = `${ticker}.DE`; break;
          case 'LON': yahooTicker = `${ticker}.L`; break;
          case 'TPE': yahooTicker = `${ticker}.TW`; break;
          case 'BME': yahooTicker = `${ticker}.MC`; break;
          case 'MIL': yahooTicker = `${ticker}.MI`; break;
          default: yahooTicker = ticker;
        }
      }
      
      // Usar proxy CORS para evitar bloqueo
      const proxyUrl = 'https://corsproxy.io/?';
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`;
      
      const response = await fetch(proxyUrl + encodeURIComponent(yahooUrl));
      
      if (response.ok) {
        const data = await response.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) return price;
      }
      
      // Fallback: Intentar con otro proxy
      const altProxyUrl = 'https://api.allorigins.win/raw?url=';
      const altResponse = await fetch(altProxyUrl + encodeURIComponent(yahooUrl));
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        const price = altData?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) return price;
      }
      
      return null;
    } catch (e) {
      console.error(`Error fetching price for ${ticker}:`, e);
      return null;
    }
  };

  // Actualizar precios de todas las inversiones
  const updateAllPrices = async () => {
    if (investments.length === 0) return;
    setUpdatingPrices(true);
    
    try {
      const updates = [];
      
      for (const inv of investments) {
        const price = await fetchStockPrice(inv.ticker, inv.exchange);
        if (price) {
          const currentValue = inv.quantity * price;
          updates.push({
            id: inv.id,
            current_price: price,
            current_value: currentValue,
            last_price_update: new Date().toISOString(),
          });
        }
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Actualizar en la base de datos
      for (const update of updates) {
        await supabase
          .from('investments')
          .update({
            current_price: update.current_price,
            current_value: update.current_value,
            last_price_update: update.last_price_update,
          })
          .eq('id', update.id);
      }
      
      // Actualizar estado local
      setInvestments(prev => prev.map(inv => {
        const update = updates.find(u => u.id === inv.id);
        return update ? { ...inv, ...update } : inv;
      }));
      
      setLastPriceUpdate(new Date());
      
      // Guardar snapshot del día si no existe
      await savePortfolioSnapshot();
      
    } catch (e) {
      console.error('Error actualizando precios:', e);
      alert('Error actualizando algunos precios. Los precios disponibles fueron actualizados.');
    } finally {
      setUpdatingPrices(false);
    }
  };

  // Guardar snapshot del portafolio
  const savePortfolioSnapshot = async () => {
    if (!user || groupId === null) return;
    
    const today = new Date().toISOString().slice(0, 10);
    const existingSnapshot = portfolioSnapshots.find(s => s.date === today);
    if (existingSnapshot) return; // Ya existe snapshot de hoy
    
    const totalValue = investments.reduce((sum, inv) => {
      const valueEur = convertToEur(inv.current_value || 0, inv.currency);
      return sum + valueEur;
    }, 0);
    
    const totalInvested = investments.reduce((sum, inv) => {
      const investedEur = convertToEur(inv.total_invested, inv.currency);
      return sum + investedEur;
    }, 0);
    
    const lastSnapshot = portfolioSnapshots[portfolioSnapshots.length - 1];
    const dailyChange = lastSnapshot ? totalValue - lastSnapshot.total_value : 0;
    
    try {
      const { data } = await supabase
        .from('portfolio_snapshots')
        .insert([{
          group_id: groupId,
          date: today,
          total_value: totalValue,
          total_invested: totalInvested,
          daily_change: dailyChange,
        }])
        .select()
        .single();
      
      if (data) {
        setPortfolioSnapshots([...portfolioSnapshots, data]);
      }
    } catch (e) {
      console.error('Error guardando snapshot:', e);
    }
  };

  // Convertir a EUR
  const convertToEur = (amount, currency) => {
    if (currency === 'EUR') return amount;
    const rate = exchangeRatesInv[currency] || 1;
    return amount / rate;
  };

  // =====================================================
  // FUNCIONES DE CATEGORIZACIÓN
  // =====================================================
  const categorizeExpense = useCallback((concept) => {
    const conceptLower = concept.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (category === 'Otro') continue;
      for (const keyword of keywords) {
        if (conceptLower.includes(keyword.toLowerCase())) return category;
      }
    }
    return 'Otro';
  }, [categories]);

  const getPersonFromUser = useCallback(() => {
    const email = user?.email?.toLowerCase() || '';
    if (email.includes('constanzabetelu')) return 'Connie';
    if (email.includes('nicogaveglio')) return 'Nicolás';
    return 'Nicolás';
  }, [user]);

  // =====================================================
  // PARSER EXCEL
  // =====================================================
  const parseExcel = async (file) => {
    if (!user || groupId === null) { alert('Error: Debes estar logueado'); return; }
    setUploading(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true, cellNF: true, cellStyles: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      let bankType = 'UNKNOWN';
      let headerRowIndex = -1;

      for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
        const row = jsonData[i];
        const rowStr = row.map(cell => String(cell).toUpperCase()).join(' ');
        
        if (rowStr.includes('FECHA OPERACIÓN') || rowStr.includes('IMPORTE EUR')) {
          bankType = 'SANTANDER';
          headerRowIndex = i;
          break;
        }
        
        if (rowStr.includes('F.VALOR') || rowStr.includes('F. VALOR') || (rowStr.includes('CONCEPTO') && rowStr.includes('MOVIMIENTO'))) {
          bankType = 'BBVA';
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.some(cell => String(cell).toUpperCase().includes('FECHA') || String(cell).toUpperCase().includes('CONCEPTO') || String(cell).toUpperCase().includes('IMPORTE'))) {
            headerRowIndex = i;
            bankType = 'SANTANDER';
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        alert('No se pudo detectar el formato del extracto bancario.');
        setUploading(false);
        return;
      }

      const newExpenses = [];
      const currentPerson = getPersonFromUser();

      if (bankType === 'SANTANDER') {
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[0] || !row[2] || row[3] === undefined) continue;
          const amountRaw = parseFloat(String(row[3]).replace(',', '.'));
          if (isNaN(amountRaw) || amountRaw >= 0) continue;
          const amount = Math.abs(amountRaw);
          const concept = String(row[2]).trim();
          let dateStr = row[0];
          if (dateStr instanceof Date) dateStr = dateStr.toLocaleDateString('es-ES');
          else if (typeof dateStr === 'number') dateStr = new Date((dateStr - 25569) * 86400 * 1000).toLocaleDateString('es-ES');
          newExpenses.push({ date: dateStr, concept, amount, category: categorizeExpense(concept), person: currentPerson });
        }
      } else if (bankType === 'BBVA') {
        const headerRow = jsonData[headerRowIndex];
        let colFValor = -1, colFecha = -1, colConcepto = -1, colMovimiento = -1, colImporte = -1;
        
        for (let c = 0; c < headerRow.length; c++) {
          const cellValue = String(headerRow[c] || '').toUpperCase().trim();
          if (cellValue.includes('F.VALOR') || cellValue === 'F. VALOR') colFValor = c;
          else if (cellValue === 'FECHA') colFecha = c;
          else if (cellValue === 'CONCEPTO') colConcepto = c;
          else if (cellValue === 'MOVIMIENTO') colMovimiento = c;
          else if (cellValue === 'IMPORTE') colImporte = c;
        }
        
        if (colConcepto === -1 || colImporte === -1) {
          alert('Error: No se pudieron detectar las columnas del extracto BBVA');
          setUploading(false);
          return;
        }
        
        const colDate = colFValor !== -1 ? colFValor : colFecha;
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const dateCell = row[colDate];
          const conceptoCell = String(row[colConcepto] || '').trim();
          const movimientoCell = colMovimiento !== -1 ? String(row[colMovimiento] || '').trim() : '';
          let importeCell = row[colImporte];
          
          if (!dateCell || !conceptoCell) continue;
          
          const skipKeywords = ['extracto', 'actualiza', 'términos', 'condiciones', 'plan 760', 'ya tienes tu', 'últimos movimientos'];
          if (skipKeywords.some(kw => conceptoCell.toLowerCase().includes(kw))) continue;
          
          if (conceptoCell.toLowerCase().includes('transferencia') && (movimientoCell.toLowerCase().includes('para constanza') || movimientoCell.toLowerCase().includes('para nicolas'))) continue;

          let amount = 0;
          if (importeCell !== undefined && importeCell !== null && importeCell !== '') {
            if (typeof importeCell === 'number') amount = importeCell;
            else {
              let amountStr = String(importeCell).replace(/\s/g, '');
              if (amountStr.includes(',')) amountStr = amountStr.replace(/\./g, '').replace(',', '.');
              amount = parseFloat(amountStr);
            }
          }
          
          if (isNaN(amount) || amount >= 0) continue;
          amount = Math.abs(amount);

          let dateStr = dateCell;
          if (dateCell instanceof Date) dateStr = dateCell.toLocaleDateString('es-ES');
          else if (typeof dateCell === 'number') dateStr = new Date((dateCell - 25569) * 86400 * 1000).toLocaleDateString('es-ES');

          let concept = conceptoCell.replace(/(-?\d+[.,]?\d*)\s*€?\s*$/, '').replace(/adeudo de/i, '').trim();
          if (concept.length < 3) concept = conceptoCell;

          newExpenses.push({ date: dateStr, concept, amount, category: categorizeExpense(concept), person: currentPerson });
        }
      }

      if (newExpenses.length === 0) {
        alert(`No se encontraron gastos en el archivo (${bankType}).`);
        setUploading(false);
        return;
      }

      const existingKeys = new Set(expenses.map(e => `${e.date}-${e.concept}-${e.amount}`));
      const uniqueNew = newExpenses.filter(e => !existingKeys.has(`${e.date}-${e.concept}-${e.amount}`));

      if (uniqueNew.length === 0) {
        alert('Todos los gastos del archivo ya existen');
        setUploading(false);
        return;
      }

      const expensesToInsert = uniqueNew.map(exp => ({
        group_id: groupId, user_id: user.id, date: exp.date, concept: exp.concept, amount: exp.amount, category: exp.category, person: exp.person,
      }));

      const { data: insertedData, error } = await supabase.from('expenses').insert(expensesToInsert).select();

      if (error) { alert(`Error: ${error.message}`); return; }

      const updatedExpenses = [...insertedData, ...expenses].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return dateB.localeCompare(dateA);
      });

      setExpenses(updatedExpenses);
      alert(`✅ ${uniqueNew.length} nuevos gastos añadidos (${bankType})`);

    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) { parseExcel(file); e.target.value = ''; }
  };

  // =====================================================
  // MANEJO DE GASTOS MANUALES
  // =====================================================
  const openManualExpenseModal = () => {
    setManualExpense({ date: new Date().toLocaleDateString('es-ES'), concept: '', amount: '', category: 'Otro', person: getPersonFromUser() });
    setShowManualExpenseModal(true);
  };

  const saveManualExpense = async () => {
    if (!manualExpense.concept.trim()) { alert('Ingresa una descripción'); return; }
    if (!manualExpense.amount || parseFloat(manualExpense.amount) <= 0) { alert('Ingresa un monto válido'); return; }
    const savedExpense = await saveExpenseToDb(manualExpense);
    if (savedExpense) {
      const updatedExpenses = [savedExpense, ...expenses].sort((a, b) => b.date.split('/').reverse().join('-').localeCompare(a.date.split('/').reverse().join('-')));
      setExpenses(updatedExpenses);
      setShowManualExpenseModal(false);
      alert('✅ Gasto agregado correctamente');
    }
  };

  // =====================================================
  // MANEJO DE CUOTAS
  // =====================================================
  const openInstallmentModal = (installment = null) => {
    if (installment) {
      setEditingInstallment(installment);
      setInstallmentForm({
        description: installment.description,
        payment_method: installment.payment_method || 'Klarna',
        total_amount: String(installment.total_amount),
        total_installments: String(installment.total_installments),
        start_month: installment.start_month.slice(0, 7),
        person: installment.person,
      });
    } else {
      setEditingInstallment(null);
      setInstallmentForm({ description: '', payment_method: 'Klarna', total_amount: '', total_installments: '', start_month: new Date().toISOString().slice(0, 7), person: getPersonFromUser() });
    }
    setShowInstallmentModal(true);
  };

  const saveInstallment = async () => {
    if (!installmentForm.description.trim()) { alert('Ingresa una descripción'); return; }
    if (!installmentForm.total_amount || parseFloat(installmentForm.total_amount) <= 0) { alert('Ingresa un monto total válido'); return; }
    if (!installmentForm.total_installments || parseInt(installmentForm.total_installments) <= 0) { alert('Ingresa una cantidad de cuotas válida'); return; }

    if (editingInstallment) {
      const updated = await updateInstallmentInDb(editingInstallment.id, installmentForm);
      if (updated) {
        setInstallments(installments.map(inst => inst.id === editingInstallment.id ? updated : inst));
        setShowInstallmentModal(false);
        alert('✅ Cuota actualizada');
      }
    } else {
      const saved = await saveInstallmentToDb(installmentForm);
      if (saved) {
        setInstallments([...installments, saved].sort((a, b) => a.start_month.localeCompare(b.start_month)));
        setShowInstallmentModal(false);
        alert('✅ Cuota agregada');
      }
    }
  };

  const deleteInstallment = async (id) => {
    if (!window.confirm('¿Eliminar esta cuota?')) return;
    if (await deleteInstallmentFromDb(id)) setInstallments(installments.filter(inst => inst.id !== id));
  };

  // =====================================================
  // EDICIÓN DE GASTOS
  // =====================================================
  const startEdit = (expense) => { setEditingId(expense.id); setEditCategory(expense.category); };
  const cancelEdit = () => { setEditingId(null); setEditCategory(''); };
  const saveEdit = async (expenseId) => {
    const updated = await updateExpenseInDb(expenseId, { category: editCategory });
    if (updated) setExpenses(expenses.map(exp => exp.id === expenseId ? { ...exp, category: editCategory } : exp));
    setEditingId(null); setEditCategory('');
  };

  // =====================================================
  // ELIMINACIÓN DE GASTOS
  // =====================================================
  const deleteExpense = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    if (await deleteExpenseFromDb(id)) setExpenses(expenses.filter(exp => exp.id !== id));
  };

  const deleteSelectedExpenses = async () => {
    if (selectedExpenses.length === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedExpenses.length} gasto(s)?`)) return;
    const { error } = await supabase.from('expenses').delete().in('id', selectedExpenses).eq('group_id', groupId);
    if (!error) { setExpenses(expenses.filter(exp => !selectedExpenses.includes(exp.id))); setSelectedExpenses([]); }
  };

  const toggleSelectExpense = (id) => {
    setSelectedExpenses(prev => prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]);
  };

  // =====================================================
  // GESTIÓN DE CATEGORÍAS
  // =====================================================
  const toggleSelectCategoryKey = (key) => {
    setSelectedCategoryKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) { alert('Escribe un nombre válido'); return; }
    if (categories[name]) { alert('Ya existe esa categoría'); return; }
    await saveCategoriestoDb({ ...categories, [name]: [] });
    setNewCategoryName('');
  };

  const renameSelectedCategory = async () => {
    if (selectedCategoryKeys.length !== 1) { alert('Selecciona exactamente 1 categoría'); return; }
    const oldName = selectedCategoryKeys[0];
    const newName = window.prompt('Nuevo nombre:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    const updatedCategories = { ...categories }; updatedCategories[newName] = updatedCategories[oldName] || []; delete updatedCategories[oldName];
    const expensesToUpdate = expenses.filter(exp => exp.category === oldName);
    if (expensesToUpdate.length > 0) await supabase.from('expenses').update({ category: newName }).in('id', expensesToUpdate.map(e => e.id));
    await saveCategoriestoDb(updatedCategories);
    setExpenses(expenses.map(exp => exp.category === oldName ? { ...exp, category: newName } : exp));
    setSelectedCategoryKeys([]); setShowCategoryManager(false);
  };

  const deleteSelectedCategories = async () => {
    if (selectedCategoryKeys.length === 0) { alert('Selecciona al menos una categoría'); return; }
    if (!window.confirm(`¿Eliminar ${selectedCategoryKeys.length} categoría(s)?`)) return;
    const updatedCategories = { ...categories }; selectedCategoryKeys.forEach(k => delete updatedCategories[k]);
    const expensesToUpdate = expenses.filter(exp => selectedCategoryKeys.includes(exp.category));
    if (expensesToUpdate.length > 0) await supabase.from('expenses').update({ category: 'Otro' }).in('id', expensesToUpdate.map(e => e.id));
    await saveCategoriestoDb(updatedCategories);
    setExpenses(expenses.map(exp => selectedCategoryKeys.includes(exp.category) ? { ...exp, category: 'Otro' } : exp));
    setSelectedCategoryKeys([]); setShowCategoryManager(false);
  };

  // =====================================================
  // DATOS PARA GRÁFICOS
  // =====================================================
  const getFilteredExpenses = useCallback(() => {
    return expenses.filter(exp => {
      if (filter.person !== 'all' && exp.person !== filter.person) return false;
      if (filter.category !== 'all' && exp.category !== filter.category) return false;
      if (filter.month !== 'all') {
        const parts = exp.date.split('/');
        if (parts.length === 3 && `${parts[2]}-${parts[1].padStart(2, '0')}` !== filter.month) return false;
      }
      return true;
    });
  }, [expenses, filter]);

  const getCategoryData = () => {
    const filtered = getFilteredExpenses();
    const categoryTotals = {};
    filtered.forEach(exp => { categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + Number(exp.amount); });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) })).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const getMonthlyData = () => {
    const monthlyTotals = {};
    expenses.forEach(exp => {
      if (filter.person !== 'all' && exp.person !== filter.person) return;
      if (filter.category !== 'all' && exp.category !== filter.category) return;
      const parts = exp.date.split('/');
      if (parts.length === 3) {
        const monthKey = `${parts[2]}-${parts[1].padStart(2, '0')}`;
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Number(exp.amount);
      }
    });
    return Object.entries(monthlyTotals).sort((a, b) => a[0].localeCompare(b[0])).map(([month, total]) => {
      const [year, m] = month.split('-');
      return { month: `${new Date(year, parseInt(m) - 1).toLocaleDateString('es-ES', { month: 'short' })} ${year}`, total: parseFloat(total.toFixed(2)) };
    });
  };

  const getPersonData = () => {
    const filtered = getFilteredExpenses();
    const personTotals = { 'Nicolás': 0, 'Connie': 0 };
    filtered.forEach(exp => { if (personTotals.hasOwnProperty(exp.person)) personTotals[exp.person] += Number(exp.amount); });
    return [{ name: 'Nicolás', value: parseFloat(personTotals['Nicolás'].toFixed(2)) }, { name: 'Connie', value: parseFloat(personTotals['Connie'].toFixed(2)) }];
  };

  const getTotalExpenses = () => getFilteredExpenses().reduce((sum, e) => sum + Number(e.amount), 0);

  const getAvailableMonths = () => {
    const months = new Set();
    expenses.forEach(exp => { const parts = exp.date.split('/'); if (parts.length === 3) months.add(`${parts[2]}-${parts[1].padStart(2, '0')}`); });
    return Array.from(months).sort().reverse();
  };

  // =====================================================
  // FUNCIONES CUOTAS
  // =====================================================
  const getFilteredInstallments = useCallback(() => {
    return installments.filter(inst => installmentFilter.person === 'all' || inst.person === installmentFilter.person);
  }, [installments, installmentFilter]);

  const getInstallmentMonths = () => {
    const today = new Date();
    const months = [];
    let startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    if (installments.length > 0) {
      const firstDate = new Date(Math.min(...installments.map(i => new Date(i.start_month).getTime())));
      if (firstDate < startDate) startDate = firstDate;
    }
    for (let i = 0; i < 24; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      months.push({ key: date.toISOString().slice(0, 7), label: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }), date });
    }
    return months;
  };

  const getInstallmentForMonth = (installment, monthKey) => {
    // Usar solo año y mes para evitar problemas de timezone
    const startYearMonth = installment.start_month.slice(0, 7); // "2025-12"
    const [startYear, startMonth] = startYearMonth.split('-').map(Number);
    const [checkYear, checkMonth] = monthKey.split('-').map(Number);
    
    const monthsDiff = (checkYear - startYear) * 12 + (checkMonth - startMonth);
    if (monthsDiff >= 0 && monthsDiff < installment.total_installments) {
      return { amount: installment.installment_amount, number: monthsDiff + 1, total: installment.total_installments };
    }
    return null;
  };

  const getMonthlyInstallmentTotals = () => {
    const months = getInstallmentMonths();
    const filtered = getFilteredInstallments();
    return months.map(month => {
      let total = 0;
      filtered.forEach(inst => { const info = getInstallmentForMonth(inst, month.key); if (info) total += info.amount; });
      return { ...month, total };
    });
  };

  const getTotalPendingInstallments = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [currentYear, currentMonthNum] = currentMonth.split('-').map(Number);
    const filtered = getFilteredInstallments();
    let total = 0;
    filtered.forEach(inst => {
      const startYearMonth = inst.start_month.slice(0, 7);
      const [startYear, startMonth] = startYearMonth.split('-').map(Number);
      
      for (let i = 0; i < inst.total_installments; i++) {
        const instYear = startYear + Math.floor((startMonth - 1 + i) / 12);
        const instMonth = ((startMonth - 1 + i) % 12) + 1;
        // Solo contar desde el mes actual en adelante
        if (instYear > currentYear || (instYear === currentYear && instMonth >= currentMonthNum)) {
          total += inst.installment_amount;
        }
      }
    });
    return total;
  };

  // =====================================================
  // FUNCIONES DE PRESUPUESTO
  // =====================================================
  
  // Abrir modal de cuenta
  const openAccountModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setAccountForm({
        name: account.name,
        currency: account.currency,
        type: account.type,
        person: account.person || 'Compartido',
        notes: account.notes || '',
      });
    } else {
      setEditingAccount(null);
      setAccountForm({ name: '', currency: 'EUR', type: 'cuenta', person: 'Compartido', notes: '' });
    }
    setShowAccountModal(true);
  };

  const saveAccount = async () => {
    if (!accountForm.name.trim()) { alert('Ingresa un nombre'); return; }
    if (editingAccount) {
      const updated = await updateAccountInDb(editingAccount.id, accountForm);
      if (updated) {
        setAccounts(accounts.map(a => a.id === editingAccount.id ? updated : a));
        setShowAccountModal(false);
      }
    } else {
      const saved = await saveAccountToDb(accountForm);
      if (saved) {
        setAccounts([...accounts, saved].sort((a, b) => a.name.localeCompare(b.name)));
        setShowAccountModal(false);
      }
    }
  };

  const deleteAccount = async (id) => {
    if (!window.confirm('¿Desactivar esta cuenta?')) return;
    if (await deleteAccountFromDb(id)) {
      setAccounts(accounts.filter(a => a.id !== id));
    }
  };

  // Abrir modal de saldo
  const openBalanceModal = (accountId = '', month = '') => {
    setBalanceForm({
      account_id: accountId || (accounts[0]?.id || ''),
      month: month || new Date().toISOString().slice(0, 7),
      balance: '',
    });
    setShowBalanceModal(true);
  };

  const saveBalance = async () => {
    if (!balanceForm.account_id) { alert('Selecciona una cuenta'); return; }
    if (!balanceForm.balance) { alert('Ingresa un saldo'); return; }
    const saved = await saveBalanceToDb(balanceForm);
    if (saved) {
      setAccountBalances(prev => {
        const filtered = prev.filter(b => !(b.account_id === saved.account_id && b.month === saved.month));
        return [...filtered, saved].sort((a, b) => b.month.localeCompare(a.month));
      });
      setShowBalanceModal(false);
    }
  };

  // Abrir modal de ingreso
  const openIncomeModal = (income = null) => {
    if (income) {
      setEditingIncome(income);
      setIncomeForm({
        month: income.month.slice(0, 7),
        type: income.type,
        description: income.description,
        amount: String(income.amount),
        person: income.person || 'Compartido',
      });
    } else {
      setEditingIncome(null);
      setIncomeForm({
        month: new Date().toISOString().slice(0, 7),
        type: 'salario',
        description: '',
        amount: '',
        person: getPersonFromUser(),
      });
    }
    setShowIncomeModal(true);
  };

  const saveIncome = async () => {
    if (!incomeForm.description.trim()) { alert('Ingresa una descripción'); return; }
    if (!incomeForm.amount || parseFloat(incomeForm.amount) <= 0) { alert('Ingresa un monto válido'); return; }
    if (editingIncome) {
      const updated = await updateIncomeInDb(editingIncome.id, incomeForm);
      if (updated) {
        setIncomes(incomes.map(i => i.id === editingIncome.id ? updated : i));
        setShowIncomeModal(false);
      }
    } else {
      const saved = await saveIncomeToDb(incomeForm);
      if (saved) {
        setIncomes([saved, ...incomes]);
        setShowIncomeModal(false);
      }
    }
  };

  const deleteIncome = async (id) => {
    if (!window.confirm('¿Eliminar este ingreso?')) return;
    if (await deleteIncomeFromDb(id)) {
      setIncomes(incomes.filter(i => i.id !== id));
    }
  };

  // Calcular saldo total de un mes en EUR
  const getTotalBalanceForMonth = (monthKey) => {
    const monthStr = monthKey + '-01';
    let total = 0;
    accounts.forEach(account => {
      const balance = accountBalances.find(b => b.account_id === account.id && b.month === monthStr);
      if (balance) {
        total += balance.balance_eur || 0;
      }
    });
    return total;
  };

  // Calcular ingresos totales de un mes
  const getTotalIncomesForMonth = (monthKey) => {
    const monthStr = monthKey + '-01';
    return incomes
      .filter(i => i.month === monthStr)
      .reduce((sum, i) => sum + Number(i.amount), 0);
  };

  // Calcular gastos totales de un mes (desde la página de gastos)
  const getTotalExpensesForMonth = (monthKey) => {
    return expenses
      .filter(exp => {
        const parts = exp.date.split('/');
        if (parts.length === 3) {
          const expMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;
          return expMonth === monthKey;
        }
        return false;
      })
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
  };

  // Calcular cuotas de un mes (solo para proyección, no para saldo)
  const getTotalInstallmentsForMonth = (monthKey) => {
    let total = 0;
    installments.forEach(inst => {
      const startDate = new Date(inst.start_month);
      const checkDate = new Date(monthKey + '-01');
      const monthsDiff = (checkDate.getFullYear() - startDate.getFullYear()) * 12 + (checkDate.getMonth() - startDate.getMonth());
      if (monthsDiff >= 0 && monthsDiff < inst.total_installments) {
        total += inst.installment_amount;
      }
    });
    return total;
  };

  // Generar meses para el saldo (3 atrás + 12 adelante)
  const getBudgetMonths = () => {
    const today = new Date();
    const months = [];
    for (let i = -3; i <= 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({
        key: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        isPast: i < 0,
        isCurrent: i === 0,
        isFuture: i > 0,
      });
    }
    return months;
  };

  // Calcular datos del SALDO para un mes (sin cuotas - ya están en gastos)
  const getSaldoDataForMonth = (monthKey, prevMonthBalance = 0) => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const isFutureMonth = monthKey > currentMonthKey;
    
    const saldoInicial = prevMonthBalance || getTotalBalanceForMonth(monthKey);
    // Solo mostrar ingresos y gastos reales, no proyectados para meses futuros
    const ingresos = getTotalIncomesForMonth(monthKey);
    const gastos = isFutureMonth ? 0 : getTotalExpensesForMonth(monthKey);
    const saldo = saldoInicial + ingresos - gastos;

    return {
      saldoInicial,
      ingresos,
      gastos,
      saldo,
    };
  };

  // Obtener presupuesto de una categoría para un mes (solo si está cargado explícitamente)
  const getBudgetAmountForCategory = (categoryId, monthKey) => {
    const monthStr = monthKey + '-01';
    const budget = budgetMonthly.find(b => b.category_id === categoryId && b.month === monthStr);
    if (budget) return budget.amount;
    // NO usar monto por defecto - solo mostrar si está cargado
    return 0;
  };

  // Obtener total presupuestado para un mes
  const getTotalBudgetForMonth = (monthKey) => {
    return budgetCategories.reduce((sum, cat) => sum + getBudgetAmountForCategory(cat.id, monthKey), 0);
  };

  // Calcular gasto real por categoría para un mes
  const getRealExpenseByCategory = (categoryName, monthKey) => {
    return expenses
      .filter(exp => {
        const parts = exp.date.split('/');
        if (parts.length === 3) {
          const expMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;
          return expMonth === monthKey && exp.category === categoryName;
        }
        return false;
      })
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
  };

  // Calcular ahorro del mes (presupuestado - gastado)
  const getSavingsForMonth = (monthKey) => {
    const presupuestado = getTotalBudgetForMonth(monthKey);
    const gastado = getTotalExpensesForMonth(monthKey);
    return presupuestado - gastado;
  };

  // Calcular tasa de ahorro
  const getSavingsRate = (monthKey) => {
    const ingresos = getTotalIncomesForMonth(monthKey);
    const gastos = getTotalExpensesForMonth(monthKey);
    if (ingresos === 0) return 0;
    return ((ingresos - gastos) / ingresos) * 100;
  };

  // Calcular variación vs mes anterior
  const getMonthVariation = (monthKey) => {
    const currentDate = new Date(monthKey + '-01');
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevMonthKey = prevDate.toISOString().slice(0, 7);
    
    const currentBalance = getTotalBalanceForMonth(monthKey);
    const prevBalance = getTotalBalanceForMonth(prevMonthKey);
    
    return currentBalance - prevBalance;
  };

  // Datos para gráfico de patrimonio histórico
  const getPatrimonioHistorico = () => {
    const months = getBudgetMonths().filter(m => m.isPast || m.isCurrent);
    return months.map(month => ({
      month: month.label,
      patrimonio: getTotalBalanceForMonth(month.key),
    }));
  };

  // Datos para gráfico de distribución del patrimonio
  const getDistribucionPatrimonio = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return accounts.map(account => {
      const balance = accountBalances.find(b => b.account_id === account.id);
      return {
        name: account.name,
        value: balance?.balance_eur || 0,
      };
    }).filter(a => a.value > 0);
  };

  // Datos para gráfico de ingresos vs gastos
  const getIngresosVsGastos = () => {
    const months = getBudgetMonths().filter(m => m.isPast || m.isCurrent);
    return months.map(month => ({
      month: month.label,
      ingresos: getTotalIncomesForMonth(month.key),
      gastos: getTotalExpensesForMonth(month.key),
    }));
  };

  // Proyección a fin de año
  const getProyeccionFinDeAno = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentBalance = getTotalBalanceForMonth(currentMonth);
    
    // Calcular promedio de ahorro mensual de los últimos 3 meses
    const months = getBudgetMonths().filter(m => m.isPast);
    let totalAhorro = 0;
    months.forEach(month => {
      const ingresos = getTotalIncomesForMonth(month.key);
      const gastos = getTotalExpensesForMonth(month.key);
      totalAhorro += (ingresos - gastos);
    });
    const promedioAhorro = months.length > 0 ? totalAhorro / months.length : 0;
    
    // Meses restantes hasta fin de año
    const currentDate = new Date();
    const mesesRestantes = 12 - currentDate.getMonth();
    
    return currentBalance + (promedioAhorro * mesesRestantes);
  };

  // Datos para comparación presupuesto vs real por categoría
  const getPresupuestoVsReal = (monthKey) => {
    return budgetCategories.map(cat => {
      const presupuestado = getBudgetAmountForCategory(cat.id, monthKey);
      const real = getRealExpenseByCategory(cat.name, monthKey);
      return {
        name: cat.name,
        presupuestado,
        real,
        diferencia: presupuestado - real,
        excedido: real > presupuestado,
      };
    });
  };

  // Porcentaje de cumplimiento del presupuesto
  const getCumplimientoPresupuesto = (monthKey) => {
    const presupuestado = getTotalBudgetForMonth(monthKey);
    const gastado = getTotalExpensesForMonth(monthKey);
    if (presupuestado === 0) return 100;
    return Math.min(100, (gastado / presupuestado) * 100);
  };

  // =====================================================
  // RENDER: LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: LOGIN
  // =====================================================
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border border-purple-100">
          <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Finanzas Familiares 💑
          </h1>
          <p className="text-gray-600 mb-8 text-center">Inicia sesión para gestionar tus gastos</p>
          <button onClick={handleLogin} className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg">
            <User className="w-5 h-5" /> Iniciar sesión con Google
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: CUOTAS
  // =====================================================
  if (currentPage === 'installments') {
    const months = getInstallmentMonths();
    const filtered = getFilteredInstallments();
    const monthlyTotals = getMonthlyInstallmentTotals();
    const totalPending = getTotalPendingInstallments();
    const currentMonthKey = new Date().toISOString().slice(0, 7);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900">
        <div className="max-w-full mx-auto px-3 sm:px-4 py-4 md:py-10">
          <header className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8 border border-purple-100">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setCurrentPage('expenses')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" /></button>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Cuotas 📅</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestión de pagos en cuotas</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                <button onClick={() => setCurrentPage('expenses')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <DollarSign className="w-4 h-4" />Gastos
                </button>
                <button onClick={() => setCurrentPage('saldo')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <Wallet className="w-4 h-4" />Saldo
                </button>
                <button onClick={() => setCurrentPage('presupuesto')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <Target className="w-4 h-4" /><span className="hidden sm:inline">Presupuesto</span><span className="sm:hidden">Presup.</span>
                </button>
                <button onClick={() => setCurrentPage('investments')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <TrendingUp className="w-4 h-4" /><span className="hidden sm:inline">Inversiones</span><span className="sm:hidden">Invers.</span>
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold text-xs sm:text-base col-span-3 sm:col-span-1">
                  <LogOut className="w-4 h-4" />Salir
                </button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs sm:text-sm font-medium">Cuotas Activas</p><p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{filtered.length}</p></div>
                <div className="bg-purple-100 p-2 sm:p-3 rounded-xl"><CreditCard className="text-purple-600 w-6 h-6 sm:w-8 sm:h-8" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-pink-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs sm:text-sm font-medium">Este Mes</p><p className="text-2xl sm:text-3xl font-bold text-pink-600 mt-1">€{monthlyTotals.find(m => m.key === currentMonthKey)?.total.toFixed(2) || '0.00'}</p></div>
                <div className="bg-pink-100 p-2 sm:p-3 rounded-xl"><Calendar className="text-pink-600 w-6 h-6 sm:w-8 sm:h-8" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs sm:text-sm font-medium">Total Pendiente</p><p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">€{totalPending.toFixed(2)}</p></div>
                <div className="bg-blue-100 p-2 sm:p-3 rounded-xl"><DollarSign className="text-blue-600 w-6 h-6 sm:w-8 sm:h-8" /></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-6 items-stretch sm:items-center">
            <button onClick={() => openInstallmentModal()} disabled={saving || !isInitialized} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg font-semibold disabled:opacity-50 text-sm sm:text-base">
              <Plus className="w-4 h-4" />Agregar Cuota
            </button>
            <select value={installmentFilter.person} onChange={(e) => setInstallmentFilter({ person: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl text-sm sm:text-base">
              <option value="all">👥 Ambos</option>
              <option value="Nicolás">👤 Nicolás</option>
              <option value="Connie">👤 Connie</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-12 px-6"><CreditCard className="mx-auto text-gray-300 mb-4 w-16 h-16" /><p className="text-gray-500 text-lg">No hay cuotas registradas.</p></div>
            ) : (
                <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-purple-100">
                    <th className="p-3 pl-4 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 min-w-[140px] z-10">Descripción</th>
                    <th className="p-3 text-left font-semibold text-gray-700 sticky left-[140px] bg-gray-100 min-w-[90px] z-10">Método</th>
                    <th className="p-3 pr-4 text-right font-semibold text-gray-700 sticky left-[230px] bg-gray-100 min-w-[90px] z-10 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]">Total</th>
                    {months.map(month => (
                      <th key={month.key} className={`p-3 text-center font-semibold min-w-[90px] ${month.key === currentMonthKey ? 'bg-purple-100 text-purple-700' : 'text-gray-700'}`}>{month.label}</th>
                    ))}
                    <th className="p-3 pr-4 text-center font-semibold text-gray-700 min-w-[80px]">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inst) => (
                    <tr key={inst.id} className="border-b border-gray-100 hover:bg-purple-50">
                      <td className="p-3 pl-4 sticky left-0 bg-gray-50 z-10">
                        <div className="font-medium text-gray-800">{inst.description}</div>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium mt-1 ${inst.person === 'Nicolás' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>{inst.person}</span>
                      </td>
                      <td className="p-3 text-gray-600 sticky left-[140px] bg-gray-50 z-10">{inst.payment_method || '-'}</td>
                      <td className="p-3 pr-4 text-right font-semibold text-gray-800 sticky left-[230px] bg-gray-50 z-10 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]">€{Number(inst.total_amount).toFixed(2)}</td>
                      {months.map(month => {
                        const info = getInstallmentForMonth(inst, month.key);
                        return (
                          <td key={month.key} className={`p-3 text-center ${month.key === currentMonthKey ? 'bg-purple-50' : ''}`}>
                            {info ? (<div><span className="font-semibold text-purple-600">€{info.amount.toFixed(2)}</span><span className="text-xs text-gray-400 block">{info.number}/{info.total}</span></div>) : <span className="text-gray-300">-</span>}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openInstallmentModal(inst)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteInstallment(inst.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-purple-200 bg-purple-50 font-bold">
                    <td className="p-3 pl-4 sticky left-0 bg-purple-100 text-purple-700 z-10">TOTAL</td>
                    <td className="p-3 sticky left-[140px] bg-purple-100 z-10"></td>
                    <td className="p-3 pr-4 text-right text-purple-700 sticky left-[230px] bg-purple-100 z-10 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]">€{filtered.reduce((sum, inst) => sum + Number(inst.total_amount), 0).toFixed(2)}</td>
                    {monthlyTotals.map(month => (
                      <td key={month.key} className={`p-3 text-center text-purple-700 ${month.key === currentMonthKey ? 'bg-purple-100' : ''}`}>{month.total > 0 ? `€${month.total.toFixed(2)}` : '-'}</td>
                    ))}
                    <td className="p-3"></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {showInstallmentModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">{editingInstallment ? 'Editar Cuota' : 'Nueva Cuota'}</h3>
                  <button onClick={() => setShowInstallmentModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><input type="text" placeholder="Ej: Sklum sofá" value={installmentForm.description} onChange={(e) => setInstallmentForm({ ...installmentForm, description: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
                      <button type="button" onClick={() => setShowPaymentMethodModal(true)} className="text-xs text-purple-600 hover:text-purple-800">+ Agregar método</button>
                    </div>
                    <select value={installmentForm.payment_method} onChange={(e) => setInstallmentForm({ ...installmentForm, payment_method: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">{paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto Total (€)</label><input type="number" step="0.01" placeholder="0.00" value={installmentForm.total_amount} onChange={(e) => setInstallmentForm({ ...installmentForm, total_amount: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Cuotas</label><input type="number" placeholder="3" value={installmentForm.total_installments} onChange={(e) => setInstallmentForm({ ...installmentForm, total_installments: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  </div>
                  {installmentForm.total_amount && installmentForm.total_installments && (
                    <div className="bg-purple-50 p-3 rounded-xl"><p className="text-sm text-purple-700"><span className="font-semibold">Cuota mensual: </span>€{(parseFloat(installmentForm.total_amount) / parseInt(installmentForm.total_installments)).toFixed(2)}</p></div>
                  )}
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Mes de Inicio</label><input type="month" value={installmentForm.start_month} onChange={(e) => setInstallmentForm({ ...installmentForm, start_month: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Persona</label><select value={installmentForm.person} onChange={(e) => setInstallmentForm({ ...installmentForm, person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl"><option value="Nicolás">Nicolás</option><option value="Connie">Connie</option></select></div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={saveInstallment} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setShowInstallmentModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {showPaymentMethodModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">Gestionar Métodos de Pago</h3>
                  <button onClick={() => setShowPaymentMethodModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Nuevo método de pago" value={newPaymentMethod} onChange={(e) => setNewPaymentMethod(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" />
                    <button onClick={() => { if (newPaymentMethod.trim() && !paymentMethods.includes(newPaymentMethod.trim())) { setPaymentMethods([...paymentMethods, newPaymentMethod.trim()]); setNewPaymentMethod(''); }}} className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="border border-gray-200 rounded-xl max-h-60 overflow-y-auto">
                    {paymentMethods.map((method, index) => (
                      <div key={method} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <span>{method}</span>
                        {!DEFAULT_PAYMENT_METHODS.includes(method) && (
                          <button onClick={() => setPaymentMethods(paymentMethods.filter(m => m !== method))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowPaymentMethodModal(false)} className="flex-1 px-6 py-3 rounded-xl font-semibold bg-purple-600 text-white hover:bg-purple-700">Listo</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: SALDO
  // =====================================================
  if (currentPage === 'saldo') {
    const budgetMonths = getBudgetMonths();
    const currentMonthKey = new Date().toISOString().slice(0, 7);

    // Calcular datos de saldo para cada mes
    let runningBalance = 0;
    const saldoData = budgetMonths.map((month, index) => {
      if (index === 0) {
        runningBalance = getTotalBalanceForMonth(month.key);
      }
      const data = getSaldoDataForMonth(month.key, runningBalance);
      runningBalance = data.saldo;
      return { ...month, ...data };
    });

    const patrimonioActual = getTotalBalanceForMonth(currentMonthKey);
    const ingresosEsteMes = getTotalIncomesForMonth(currentMonthKey);
    const gastosEsteMes = getTotalExpensesForMonth(currentMonthKey);
    const ahorroDelMes = getSavingsForMonth(currentMonthKey);
    const tasaAhorro = getSavingsRate(currentMonthKey);
    const variacionMes = getMonthVariation(currentMonthKey);
    const proyeccionFinAno = getProyeccionFinDeAno();
    const patrimonioHistorico = getPatrimonioHistorico();
    const distribucionPatrimonio = getDistribucionPatrimonio();
    const ingresosVsGastos = getIngresosVsGastos();
    const metaActiva = savingsGoals[0];
    const progresoMeta = metaActiva ? (patrimonioActual / metaActiva.target_amount) * 100 : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900">
        <div className="max-w-full mx-auto px-3 sm:px-4 py-4 md:py-10">
          <header className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8 border border-purple-100">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setCurrentPage('expenses')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" /></button>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Saldo 💰</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">Control de patrimonio familiar</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                <button onClick={() => setCurrentPage('expenses')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <DollarSign className="w-4 h-4" />Gastos
                </button>
                <button onClick={() => setCurrentPage('presupuesto')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <Target className="w-4 h-4" /><span className="hidden sm:inline">Presupuesto</span><span className="sm:hidden">Presup.</span>
                </button>
                <button onClick={() => setCurrentPage('investments')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <TrendingUp className="w-4 h-4" /><span className="hidden sm:inline">Inversiones</span><span className="sm:hidden">Invers.</span>
                </button>
                <button onClick={() => setCurrentPage('installments')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <CreditCard className="w-4 h-4" />Cuotas
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold text-xs sm:text-base col-span-3 sm:col-span-1">
                  <LogOut className="w-4 h-4" />Salir
                </button>
              </div>
            </div>
          </header>

          {/* Stats Cards - Fila 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-purple-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Patrimonio Actual</p><p className="text-lg sm:text-xl font-bold text-purple-600 mt-1">€{patrimonioActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-purple-100 p-2 rounded-xl hidden sm:block"><PiggyBank className="text-purple-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-green-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Ingresos Este Mes</p><p className="text-lg sm:text-xl font-bold text-green-600 mt-1">€{ingresosEsteMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-green-100 p-2 rounded-xl hidden sm:block"><TrendingUp className="text-green-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-red-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Gastos Este Mes</p><p className="text-lg sm:text-xl font-bold text-red-600 mt-1">€{gastosEsteMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-red-100 p-2 rounded-xl hidden sm:block"><TrendingDown className="text-red-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-blue-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Ahorro del Mes</p><p className={`text-lg sm:text-xl font-bold mt-1 ${ahorroDelMes >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{ahorroDelMes >= 0 ? '€' : '-€'}{Math.abs(ahorroDelMes).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-blue-100 p-2 rounded-xl hidden sm:block"><DollarSign className="text-blue-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-cyan-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Tasa de Ahorro</p><p className={`text-lg sm:text-xl font-bold mt-1 ${tasaAhorro >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>{tasaAhorro.toFixed(1)}%</p></div>
                <div className="bg-cyan-100 p-2 rounded-xl hidden sm:block"><Percent className="text-cyan-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-orange-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Var. vs Mes Ant.</p><p className={`text-lg sm:text-xl font-bold mt-1 ${variacionMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>{variacionMes >= 0 ? '+' : ''}€{variacionMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className={`p-2 rounded-xl hidden sm:block ${variacionMes >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>{variacionMes >= 0 ? <TrendingUp className="text-green-600 w-6 h-6" /> : <TrendingDown className="text-red-600 w-6 h-6" />}</div>
              </div>
            </div>
          </div>

          {/* Meta de Ahorro */}
          {metaActiva && (
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-yellow-100 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                <div className="flex items-center gap-3">
                  <Target className="text-yellow-600 w-5 h-5 sm:w-6 sm:h-6" />
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">{metaActiva.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Meta: €{Number(metaActiva.target_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{Math.min(100, progresoMeta).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">completado</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-4 rounded-full transition-all" style={{ width: `${Math.min(100, progresoMeta)}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Faltan €{Math.max(0, metaActiva.target_amount - patrimonioActual).toLocaleString('es-ES', { minimumFractionDigits: 2 })} para alcanzar tu meta</p>
            </div>
          )}

          {/* Proyección fin de año */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Proyección a Fin de Año</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">€{proyeccionFinAno.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                <p className="text-purple-200 text-xs mt-1">Basado en tu promedio de ahorro mensual</p>
              </div>
              <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-purple-200" />
            </div>
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-6">
            <button onClick={() => openAccountModal()} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg font-semibold text-xs sm:text-base">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nueva Cuenta</span><span className="sm:hidden">Cuenta</span>
            </button>
            <button onClick={() => openBalanceModal()} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg font-semibold text-xs sm:text-base">
              <Wallet className="w-4 h-4" /><span className="hidden sm:inline">Actualizar Saldo</span><span className="sm:hidden">Saldo</span>
            </button>
            <button onClick={() => openIncomeModal()} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg font-semibold text-xs sm:text-base">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Agregar Ingreso</span><span className="sm:hidden">Ingreso</span>
            </button>
            <button onClick={() => setShowSavingsGoalModal(true)} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg font-semibold text-xs sm:text-base">
              <Target className="w-4 h-4" /><span className="hidden sm:inline">Nueva Meta</span><span className="sm:hidden">Meta</span>
            </button>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Patrimonio Histórico */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h3 className="font-bold mb-4 text-gray-800">Patrimonio Histórico</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={patrimonioHistorico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 'Patrimonio']} />
                    <Line type="monotone" dataKey="patrimonio" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribución del Patrimonio */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
              <h3 className="font-bold mb-4 text-gray-800">Distribución del Patrimonio</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={distribucionPatrimonio} cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name.substring(0, 10)}...`}>
                      {distribucionPatrimonio.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ingresos vs Gastos */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <h3 className="font-bold mb-4 text-gray-800">Ingresos vs Gastos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ingresosVsGastos}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '']} />
                    <Legend />
                    <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabla de Cuentas */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 mb-8">
            <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Building className="w-5 h-5 text-purple-600" />Cuentas y Fondos</h3>
            {accounts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay cuentas registradas. Agrega una para comenzar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-purple-100">
                      <th className="p-3 text-left font-semibold text-gray-700">Cuenta</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Tipo</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Moneda</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Persona</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Saldo Original</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Saldo EUR</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(account => {
                      const latestBalance = accountBalances.find(b => b.account_id === account.id);
                      return (
                        <tr key={account.id} className="border-b border-gray-100 hover:bg-purple-50">
                          <td className="p-3 font-medium text-gray-800">{account.name}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${account.type === 'cuenta' ? 'bg-blue-100 text-blue-700' : account.type === 'inversion' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{account.type}</span></td>
                          <td className="p-3 text-gray-600">{account.currency}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${account.person === 'Nicolás' ? 'bg-pink-100 text-pink-700' : account.person === 'Connie' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{account.person}</span></td>
                          <td className="p-3 text-right font-semibold">{latestBalance ? `${account.currency === 'EUR' ? '€' : account.currency === 'USD' ? '$' : 'A$'}${Number(latestBalance.balance).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '-'}</td>
                          <td className="p-3 text-right font-semibold text-purple-600">{latestBalance ? `€${Number(latestBalance.balance_eur).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '-'}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => openBalanceModal(account.id)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"><Wallet className="w-4 h-4" /></button>
                              <button onClick={() => openAccountModal(account)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteAccount(account.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-purple-200 bg-purple-50 font-bold">
                      <td className="p-3 text-purple-700" colSpan="5">TOTAL PATRIMONIO</td>
                      <td className="p-3 text-right text-purple-700">€{patrimonioActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabla de Saldo Mensual */}
          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-x-auto mb-8">
            <div className="p-6 border-b border-purple-100">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-600" />Saldo Mensual</h3>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b-2 border-purple-100">
                  <th className="p-3 pl-6 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 min-w-[160px] z-10">Concepto</th>
                  {saldoData.map(month => (
                    <th key={month.key} className={`p-3 text-center font-semibold min-w-[100px] ${month.isCurrent ? 'bg-purple-100 text-purple-700' : month.isPast ? 'bg-gray-50 text-gray-500' : 'text-gray-700'}`}>{month.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-3 pl-6 font-medium text-gray-700 sticky left-0 bg-white">Saldo Inicial</td>
                  {saldoData.map(month => (
                    <td key={month.key} className={`p-3 text-center ${month.isCurrent ? 'bg-purple-50' : ''}`}>€{month.saldoInicial.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-3 pl-6 font-medium text-green-700 sticky left-0 bg-green-50">Ingresos</td>
                  {saldoData.map(month => (
                    <td key={month.key} className={`p-3 text-center text-green-600 font-semibold ${month.isCurrent ? 'bg-green-100' : ''}`}>{month.ingresos > 0 ? `€${month.ingresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '-'}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-red-50">
                  <td className="p-3 pl-6 font-medium text-red-700 sticky left-0 bg-red-50">Gastos</td>
                  {saldoData.map(month => (
                    <td key={month.key} className={`p-3 text-center text-red-600 ${month.isCurrent ? 'bg-red-100' : ''}`}>{month.gastos > 0 ? `€${month.gastos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '-'}</td>
                  ))}
                </tr>
                <tr className="border-t-2 border-purple-200 bg-purple-100">
                  <td className="p-3 pl-6 font-bold text-purple-700 sticky left-0 bg-purple-100">Saldo</td>
                  {saldoData.map(month => (
                    <td key={month.key} className={`p-3 text-center font-bold ${month.saldo >= 0 ? 'text-purple-700' : 'text-red-600'} ${month.isCurrent ? 'bg-purple-200' : ''}`}>€{month.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ingresos del mes */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-600" />Ingresos Registrados</h3>
            {incomes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay ingresos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-purple-100">
                      <th className="p-3 text-left font-semibold text-gray-700">Mes</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Tipo</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Descripción</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Persona</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Monto</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.slice(0, 20).map(income => (
                      <tr key={income.id} className="border-b border-gray-100 hover:bg-green-50">
                        <td className="p-3 text-gray-600">{new Date(income.month).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${income.type === 'salario' ? 'bg-blue-100 text-blue-700' : income.type === 'rendimiento' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{income.type}</span></td>
                        <td className="p-3 font-medium text-gray-800">{income.description}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${income.person === 'Nicolás' ? 'bg-pink-100 text-pink-700' : income.person === 'Connie' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{income.person}</span></td>
                        <td className="p-3 text-right font-semibold text-green-600">€{Number(income.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => openIncomeModal(income)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteIncome(income.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modales */}
          {showAccountModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">{editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
                  <button onClick={() => setShowAccountModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" placeholder="Ej: Santander Nico" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label><select value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">{ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Persona</label><select value={accountForm.person} onChange={(e) => setAccountForm({ ...accountForm, person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl"><option value="Compartido">Compartido</option><option value="Nicolás">Nicolás</option><option value="Connie">Connie</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label><input type="text" placeholder="Opcional" value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={saveAccount} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setShowAccountModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {showBalanceModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">Actualizar Saldo</h3>
                  <button onClick={() => setShowBalanceModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label><select value={balanceForm.account_id} onChange={(e) => setBalanceForm({ ...balanceForm, account_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">{accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Mes</label><input type="month" value={balanceForm.month} onChange={(e) => setBalanceForm({ ...balanceForm, month: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Saldo</label><input type="number" step="0.01" placeholder="0.00" value={balanceForm.balance} onChange={(e) => setBalanceForm({ ...balanceForm, balance: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  {balanceForm.balance && balanceForm.account_id && (() => {
                    const account = accounts.find(a => a.id === balanceForm.account_id);
                    if (account && account.currency !== 'EUR') {
                      const rate = exchangeRates[account.currency] || 1;
                      const eurValue = parseFloat(balanceForm.balance) * rate;
                      return <div className="bg-purple-50 p-3 rounded-xl"><p className="text-sm text-purple-700"><span className="font-semibold">En EUR: </span>€{eurValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (tasa: {rate.toFixed(4)})</p></div>;
                    }
                    return null;
                  })()}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={saveBalance} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setShowBalanceModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {showIncomeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">{editingIncome ? 'Editar Ingreso' : 'Nuevo Ingreso'}</h3>
                  <button onClick={() => setShowIncomeModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Mes</label><input type="month" value={incomeForm.month} onChange={(e) => setIncomeForm({ ...incomeForm, month: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select value={incomeForm.type} onChange={(e) => setIncomeForm({ ...incomeForm, type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">{INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><input type="text" placeholder="Ej: Salario Enero" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto (€)</label><input type="number" step="0.01" placeholder="0.00" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Persona</label><select value={incomeForm.person} onChange={(e) => setIncomeForm({ ...incomeForm, person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl"><option value="Compartido">Compartido</option><option value="Nicolás">Nicolás</option><option value="Connie">Connie</option></select></div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={saveIncome} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setShowIncomeModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {showSavingsGoalModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">Nueva Meta de Ahorro</h3>
                  <button onClick={() => setShowSavingsGoalModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Meta</label><input type="text" placeholder="Ej: Fondo de emergencia" value={savingsGoalForm.name} onChange={(e) => setSavingsGoalForm({ ...savingsGoalForm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto Objetivo (€)</label><input type="number" step="0.01" placeholder="50000" value={savingsGoalForm.target_amount} onChange={(e) => setSavingsGoalForm({ ...savingsGoalForm, target_amount: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={async () => {
                    if (!savingsGoalForm.name || !savingsGoalForm.target_amount) { alert('Completa todos los campos'); return; }
                    const saved = await saveSavingsGoalToDb(savingsGoalForm);
                    if (saved) { setSavingsGoals([...savingsGoals, saved]); setShowSavingsGoalModal(false); setSavingsGoalForm({ name: '', target_amount: '' }); }
                  }} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setShowSavingsGoalModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: PRESUPUESTO (Proyección)
  // =====================================================
  if (currentPage === 'presupuesto') {
    const currentMonthKey = selectedBudgetMonth;
    const presupuestoVsReal = getPresupuestoVsReal(currentMonthKey);
    const cuotasDelMes = getTotalInstallmentsForMonth(currentMonthKey);
    const cumplimiento = getCumplimientoPresupuesto(currentMonthKey);
    const totalPresupuestado = getTotalBudgetForMonth(currentMonthKey);
    const totalGastado = getTotalExpensesForMonth(currentMonthKey);
    const totalConCuotas = totalGastado + cuotasDelMes;
    const categoriasExcedidas = presupuestoVsReal.filter(c => c.excedido && c.presupuestado > 0);
    
    // Filtrar datos para gráfico
    const dataParaGrafico = budgetCategoryFilter === 'all' 
      ? presupuestoVsReal.filter(c => c.presupuestado > 0 || c.real > 0)
      : presupuestoVsReal.filter(c => c.name === budgetCategoryFilter);

    const tendenciaHistorica = getBudgetMonths().filter(m => m.isPast || m.isCurrent).map(month => ({
      month: month.label,
      presupuestado: getTotalBudgetForMonth(month.key),
      real: getTotalExpensesForMonth(month.key),
    }));
    
    // Lista de categorías existentes en gastos para el dropdown
    const categoriasDeGastos = [...new Set(expenses.map(e => e.category))].filter(c => c && c !== 'Otro').sort();

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900">
        <div className="max-w-full mx-auto px-3 sm:px-4 py-4 md:py-10">
          <header className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8 border border-purple-100">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setCurrentPage('saldo')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" /></button>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Presupuesto 📋</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">Proyección y control de gastos</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                <button onClick={() => setCurrentPage('expenses')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base"><DollarSign className="w-4 h-4" />Gastos</button>
                <button onClick={() => setCurrentPage('saldo')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base"><Wallet className="w-4 h-4" />Saldo</button>
                <button onClick={() => setCurrentPage('investments')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base"><TrendingUp className="w-4 h-4" /><span className="hidden sm:inline">Inversiones</span><span className="sm:hidden">Invers.</span></button>
                <button onClick={() => setCurrentPage('installments')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base"><CreditCard className="w-4 h-4" />Cuotas</button>
                <button onClick={handleLogout} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold text-xs sm:text-base col-span-3 sm:col-span-1"><LogOut className="w-4 h-4" />Salir</button>
              </div>
            </div>
          </header>

          <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-4 mb-6 border border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-gray-700 text-sm sm:text-base">Mes:</label>
            <input type="month" value={selectedBudgetMonth} onChange={(e) => setSelectedBudgetMonth(e.target.value)} className="px-3 sm:px-4 py-2 border border-gray-300 rounded-xl text-sm sm:text-base" />
            <button onClick={() => copyBudgetFromPreviousMonth(selectedBudgetMonth)} disabled={saving} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 font-medium disabled:opacity-50 text-xs sm:text-base"><Copy className="w-4 h-4" /><span className="hidden sm:inline">Copiar del mes anterior</span><span className="sm:hidden">Copiar mes ant.</span></button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-green-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Total Presupuestado</p><p className="text-lg sm:text-xl font-bold text-green-600 mt-1">€{totalPresupuestado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-green-100 p-2 rounded-xl hidden sm:block"><Target className="text-green-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-red-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Total Gastado</p><p className="text-lg sm:text-xl font-bold text-red-600 mt-1">€{totalGastado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-red-100 p-2 rounded-xl hidden sm:block"><DollarSign className="text-red-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-orange-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Cuotas del Mes</p><p className="text-lg sm:text-xl font-bold text-orange-600 mt-1">€{cuotasDelMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p></div>
                <div className="bg-orange-100 p-2 rounded-xl hidden sm:block"><CreditCard className="text-orange-600 w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-purple-100">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">% Cumplimiento</p><p className={`text-lg sm:text-xl font-bold mt-1 ${cumplimiento <= 100 ? 'text-green-600' : 'text-red-600'}`}>{cumplimiento.toFixed(1)}%</p></div>
                <div className={`p-2 rounded-xl hidden sm:block ${cumplimiento <= 100 ? 'bg-green-100' : 'bg-red-100'}`}><Percent className={`w-6 h-6 ${cumplimiento <= 100 ? 'text-green-600' : 'text-red-600'}`} /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-cyan-100 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <div><p className="text-gray-600 text-xs font-medium">Categorías Excedidas</p><p className={`text-lg sm:text-xl font-bold mt-1 ${categoriasExcedidas.length === 0 ? 'text-green-600' : 'text-red-600'}`}>{categoriasExcedidas.length}</p></div>
                <div className={`p-2 rounded-xl hidden sm:block ${categoriasExcedidas.length === 0 ? 'bg-green-100' : 'bg-red-100'}`}><AlertTriangle className={`w-6 h-6 ${categoriasExcedidas.length === 0 ? 'text-green-600' : 'text-red-600'}`} /></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-100 mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-medium text-gray-700 text-sm sm:text-base">Progreso del Presupuesto</span>
              <span className={`font-bold text-sm sm:text-base ${cumplimiento <= 100 ? 'text-green-600' : 'text-red-600'}`}>{cumplimiento.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
              <div className={`h-3 sm:h-4 rounded-full transition-all ${cumplimiento <= 80 ? 'bg-green-500' : cumplimiento <= 100 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, cumplimiento)}%` }}></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">€{totalGastado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} de €{totalPresupuestado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} presupuestados (+ €{cuotasDelMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })} en cuotas)</p>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <button onClick={() => { setBudgetCategoryForm({ name: '', monthly_amount: '' }); setEditingBudgetCategory(null); setShowBudgetCategoryModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg font-semibold"><Plus className="w-4 h-4" />Nueva Categoría</button>
            <select value={budgetCategoryFilter} onChange={(e) => setBudgetCategoryFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-xl">
              <option value="all">Todas las categorías</option>
              {budgetCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h3 className="font-bold mb-4 text-gray-800">Presupuesto vs Real por Categoría</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataParaGrafico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '']} />
                    <Legend />
                    <Bar dataKey="presupuestado" fill="#10b981" name="Presupuestado" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="real" fill="#8b5cf6" name="Real" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
              <h3 className="font-bold mb-4 text-gray-800">Tendencia: Presupuesto vs Real</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaHistorica}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '']} />
                    <Legend />
                    <Line type="monotone" dataKey="presupuestado" stroke="#10b981" strokeWidth={2} name="Presupuestado" />
                    <Line type="monotone" dataKey="real" stroke="#8b5cf6" strokeWidth={2} name="Real" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {categoriasExcedidas.length > 0 && (
            <div className="bg-red-50 rounded-2xl shadow-lg p-6 border border-red-200 mb-6">
              <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Categorías Excedidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoriasExcedidas.map(cat => (
                  <div key={cat.name} className="bg-white rounded-xl p-4 border border-red-200">
                    <p className="font-medium text-gray-800">{cat.name}</p>
                    <p className="text-sm text-gray-600">Presupuesto: €{cat.presupuestado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm text-red-600 font-semibold">Gastado: €{cat.real.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ({((cat.real / cat.presupuestado) * 100).toFixed(0)}%)</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-green-600" />Presupuesto por Categoría</h3>
            {budgetCategories.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay categorías de presupuesto. Agrega una para comenzar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-purple-100">
                      <th className="p-3 text-left font-semibold text-gray-700">Categoría</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Presupuestado</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Gastado</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Diferencia</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Estado</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetCategories.map(cat => {
                      const presupuestado = getBudgetAmountForCategory(cat.id, currentMonthKey);
                      const real = getRealExpenseByCategory(cat.name, currentMonthKey);
                      const diferencia = presupuestado - real;
                      const excedido = real > presupuestado && presupuestado > 0;
                      return (
                        <tr key={cat.id} className={`border-b border-gray-100 ${excedido ? 'bg-red-50' : 'hover:bg-green-50'}`}>
                          <td className="p-3 font-medium text-gray-800">{cat.name}</td>
                          <td className="p-3 text-right">
                            <input type="number" step="0.01" className="w-24 px-2 py-1 border border-gray-300 rounded text-right" value={presupuestado || ''} onChange={async (e) => { const amount = e.target.value; await saveBudgetMonthlyToDb(cat.id, currentMonthKey, amount); const { data } = await supabase.from('budget_monthly').select('*').eq('group_id', groupId); setBudgetMonthly(data || []); }} placeholder="0.00" />
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-600">€{real.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className={`p-3 text-right font-semibold ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>{diferencia >= 0 ? '+' : ''}€{diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">{presupuestado > 0 ? (<span className={`px-2 py-1 rounded-full text-xs font-medium ${excedido ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{excedido ? 'Excedido' : 'OK'}</span>) : <span className="text-gray-400">-</span>}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => { setEditingBudgetCategory(cat); setBudgetCategoryForm({ name: cat.name, monthly_amount: String(cat.monthly_amount) }); setShowBudgetCategoryModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={async () => { if (window.confirm('¿Eliminar esta categoría?')) { await deleteBudgetCategoryFromDb(cat.id); setBudgetCategories(budgetCategories.filter(c => c.id !== cat.id)); }}} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {cuotasDelMes > 0 && (
                      <tr className="border-b border-gray-200 bg-blue-50/50">
                        <td className="p-3 font-medium text-blue-700">📅 Cuotas del Mes</td>
                        <td className="p-3 text-right"><span className="text-gray-400">-</span></td>
                        <td className="p-3 text-right font-semibold text-blue-600">€{cuotasDelMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right font-semibold text-blue-600">-€{cuotasDelMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-center"><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Fijo</span></td>
                        <td className="p-3 text-center">
                          <button onClick={() => setCurrentPage('installments')} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded text-xs">Ver →</button>
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-purple-200 bg-purple-50 font-bold">
                      <td className="p-3 text-purple-700">TOTAL</td>
                      <td className="p-3 text-right text-purple-700">€{totalPresupuestado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-purple-700">€{totalConCuotas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td className={`p-3 text-right font-bold ${(totalPresupuestado - totalConCuotas) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(totalPresupuestado - totalConCuotas) >= 0 ? '+' : ''}€{(totalPresupuestado - totalConCuotas).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showBudgetCategoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">{editingBudgetCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
                  <button onClick={() => setShowBudgetCategoryModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  {!editingBudgetCategory && categoriasDeGastos.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar de Gastos Existentes</label>
                      <select onChange={(e) => { if (e.target.value) setBudgetCategoryForm({ ...budgetCategoryForm, name: e.target.value }); }} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        <option value="">-- Elegir categoría existente --</option>
                        {categoriasDeGastos.filter(c => !budgetCategories.some(bc => bc.name === c)).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">O escribe un nombre nuevo abajo</p>
                    </div>
                  )}
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" placeholder="Ej: Alquiler" value={budgetCategoryForm.name} onChange={(e) => setBudgetCategoryForm({ ...budgetCategoryForm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto Mensual por Defecto (€)</label><input type="number" step="0.01" placeholder="0.00" value={budgetCategoryForm.monthly_amount} onChange={(e) => setBudgetCategoryForm({ ...budgetCategoryForm, monthly_amount: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={async () => {
                    if (!budgetCategoryForm.name) { alert('Ingresa un nombre'); return; }
                    if (editingBudgetCategory) {
                      // Actualizar categoría
                      const updated = await updateBudgetCategoryInDb(editingBudgetCategory.id, { name: budgetCategoryForm.name, monthly_amount: parseFloat(budgetCategoryForm.monthly_amount) || 0 });
                      if (updated) { 
                        setBudgetCategories(budgetCategories.map(c => c.id === editingBudgetCategory.id ? updated : c)); 
                        // También actualizar/crear el budget_monthly para el mes seleccionado
                        const existingMonthly = budgetMonthly.find(m => m.category_id === editingBudgetCategory.id && m.month === selectedBudgetMonth);
                        if (existingMonthly) {
                          // Actualizar existente
                          const { data: updatedMonthly } = await supabase
                            .from('budget_monthly')
                            .update({ amount: parseFloat(budgetCategoryForm.monthly_amount) || 0 })
                            .eq('id', existingMonthly.id)
                            .select()
                            .single();
                          if (updatedMonthly) {
                            setBudgetMonthly(budgetMonthly.map(m => m.id === existingMonthly.id ? updatedMonthly : m));
                          }
                        } else if (parseFloat(budgetCategoryForm.monthly_amount) > 0) {
                          // Crear nuevo
                          const monthlyData = await saveBudgetMonthlyToDb(editingBudgetCategory.id, selectedBudgetMonth, budgetCategoryForm.monthly_amount);
                          if (monthlyData) {
                            setBudgetMonthly([...budgetMonthly, monthlyData]);
                          }
                        }
                        setShowBudgetCategoryModal(false); 
                        setEditingBudgetCategory(null);
                      }
                    } else {
                      const saved = await saveBudgetCategoryToDb(budgetCategoryForm);
                      if (saved) { 
                        setBudgetCategories([...budgetCategories, saved]); 
                        // Si tiene monto, crear también el presupuesto para el mes seleccionado
                        if (budgetCategoryForm.monthly_amount && parseFloat(budgetCategoryForm.monthly_amount) > 0) {
                          const monthlyData = await saveBudgetMonthlyToDb(saved.id, selectedBudgetMonth, budgetCategoryForm.monthly_amount);
                          if (monthlyData) {
                            setBudgetMonthly([...budgetMonthly, monthlyData]);
                          }
                        }
                        setShowBudgetCategoryModal(false); 
                      }
                    }
                  }} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setShowBudgetCategoryModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: INVERSIONES
  // =====================================================
  if (currentPage === 'investments') {
    const activeInvestments = investments.filter(inv => inv.is_active && inv.quantity > 0);
    
    // Calcular totales
    const calculateCurrentValue = (inv) => {
      const price = inv.current_price || inv.avg_purchase_price;
      const valueInCurrency = inv.quantity * price;
      // Convertir a EUR
      const rate = exchangeRatesInv[inv.currency] || 1;
      return valueInCurrency * rate;
    };
    
    const totalPortfolioValue = activeInvestments.reduce((sum, inv) => sum + calculateCurrentValue(inv), 0);
    const totalInvested = activeInvestments.reduce((sum, inv) => {
      const rate = exchangeRatesInv[inv.currency] || 1;
      return sum + (inv.total_invested * rate);
    }, 0);
    const totalGain = totalPortfolioValue - totalInvested;
    const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
    
    // Calcular ganancias realizadas
    const realizedGains = investmentTransactions
      .filter(tx => tx.type === 'sell' && tx.realized_gain)
      .reduce((sum, tx) => sum + tx.realized_gain, 0);
    
    // Mejor y peor posición
    const positionsWithGain = activeInvestments.map(inv => {
      const currentValue = calculateCurrentValue(inv);
      const rate = exchangeRatesInv[inv.currency] || 1;
      const invested = inv.total_invested * rate;
      const gain = currentValue - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      return { ...inv, currentValue, invested, gain, gainPct };
    });
    
    const sortedByGainPct = [...positionsWithGain].sort((a, b) => b.gainPct - a.gainPct);
    const bestPosition = sortedByGainPct[0];
    const worstPosition = sortedByGainPct[sortedByGainPct.length - 1];
    
    // Datos para gráficos
    const rendimientoData = positionsWithGain
      .sort((a, b) => b.gainPct - a.gainPct)
      .map(inv => ({
        ticker: inv.ticker,
        rendimiento: parseFloat(inv.gainPct.toFixed(2)),
        ganancia: parseFloat(inv.gain.toFixed(2)),
        fill: inv.gainPct >= 0 ? '#10b981' : '#ef4444',
      }));
    
    const distribucionData = positionsWithGain
      .sort((a, b) => b.currentValue - a.currentValue)
      .map(inv => ({
        ticker: inv.ticker,
        valor: parseFloat(inv.currentValue.toFixed(2)),
        porcentaje: totalPortfolioValue > 0 ? parseFloat(((inv.currentValue / totalPortfolioValue) * 100).toFixed(1)) : 0,
      }));
    
    // Distribución por categoría
    const categoriaData = investmentCategories.map(cat => {
      const categoryInvestments = positionsWithGain.filter(inv => inv.category_id === cat.id);
      const valor = categoryInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
      return {
        name: cat.name,
        valor: parseFloat(valor.toFixed(2)),
        porcentaje: totalPortfolioValue > 0 ? parseFloat(((valor / totalPortfolioValue) * 100).toFixed(1)) : 0,
        color: cat.color,
      };
    }).filter(c => c.valor > 0);
    
    // Sin categoría
    const sinCategoriaValue = positionsWithGain
      .filter(inv => !inv.category_id)
      .reduce((sum, inv) => sum + inv.currentValue, 0);
    if (sinCategoriaValue > 0) {
      categoriaData.push({
        name: 'Sin categoría',
        valor: parseFloat(sinCategoriaValue.toFixed(2)),
        porcentaje: parseFloat(((sinCategoriaValue / totalPortfolioValue) * 100).toFixed(1)),
        color: '#9ca3af',
      });
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900">
        <div className="max-w-full mx-auto px-3 sm:px-4 py-4 md:py-10">
          {/* Header */}
          <header className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8 border border-purple-100">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setCurrentPage('expenses')} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Inversiones 📊
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">Control de tu portafolio</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                <button onClick={() => setCurrentPage('expenses')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <DollarSign className="w-4 h-4" />Gastos
                </button>
                <button onClick={() => setCurrentPage('saldo')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <Wallet className="w-4 h-4" />Saldo
                </button>
                <button onClick={() => setCurrentPage('presupuesto')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <Target className="w-4 h-4" /><span className="hidden sm:inline">Presupuesto</span><span className="sm:hidden">Presup.</span>
                </button>
                <button onClick={() => setCurrentPage('installments')} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-xs sm:text-base">
                  <CreditCard className="w-4 h-4" />Cuotas
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold text-xs sm:text-base col-span-3 sm:col-span-1">
                  <LogOut className="w-4 h-4" />Salir
                </button>
              </div>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-purple-100">
              <div><p className="text-gray-600 text-xs font-medium">Valor Total</p><p className="text-lg sm:text-xl font-bold text-purple-600 mt-1">€{totalPortfolioValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-blue-100">
              <div><p className="text-gray-600 text-xs font-medium">Total Invertido</p><p className="text-lg sm:text-xl font-bold text-blue-600 mt-1">€{totalInvested.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-green-100">
              <div><p className="text-gray-600 text-xs font-medium">Rendimiento Total</p><p className={`text-lg sm:text-xl font-bold mt-1 ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalGain >= 0 ? '+' : ''}€{totalGain.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalGainPct.toFixed(1)}%)</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-yellow-100">
              <div><p className="text-gray-600 text-xs font-medium">Ganancia Realizada</p><p className={`text-lg sm:text-xl font-bold mt-1 ${realizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>{realizedGains >= 0 ? '+' : ''}€{realizedGains.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-emerald-100">
              <div><p className="text-gray-600 text-xs font-medium">🏆 Mejor Posición</p><p className={`text-lg sm:text-xl font-bold mt-1 ${bestPosition?.gainPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{activeInvestments.length > 0 ? `${bestPosition?.ticker} ${bestPosition?.gainPct >= 0 ? '+' : ''}${bestPosition?.gainPct.toFixed(1)}%` : '-'}</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 border border-red-100">
              <div><p className="text-gray-600 text-xs font-medium">📉 Peor Posición</p><p className={`text-lg sm:text-xl font-bold mt-1 ${worstPosition?.gainPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{activeInvestments.length > 1 ? `${worstPosition?.ticker} ${worstPosition?.gainPct >= 0 ? '+' : ''}${worstPosition?.gainPct.toFixed(1)}%` : (activeInvestments.length === 1 ? 'Solo 1 posición' : '-')}</p></div>
            </div>
          </div>

          {/* Última actualización y botones */}
          <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-4 mb-6 border border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Precios: {lastPriceUpdate ? new Date(lastPriceUpdate).toLocaleString('es-ES') : 'No actualizado'}</span>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
              <button onClick={() => { setInvestmentForm({ ticker: '', name: '', exchange: 'NASDAQ', currency: 'USD', category_id: '', person: 'Nicolás', date: new Date().toISOString().slice(0, 10), quantity: '', price: '', commission: '0' }); setEditingInvestment(null); setShowInvestmentModal(true); }} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg font-semibold text-xs sm:text-sm">
                <Plus className="w-4 h-4" />Nueva Inversión
              </button>
              <button onClick={() => { setTransactionForm({ investment_id: activeInvestments[0]?.id || '', date: new Date().toISOString().slice(0, 10), type: 'buy', quantity: '', price: '', commission: '0', notes: '' }); setShowTransactionModal(true); }} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg font-semibold text-xs sm:text-sm">
                <Plus className="w-4 h-4" />Compra/Venta
              </button>
              <button onClick={() => setShowInvestmentCategoryModal(true)} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium text-xs sm:text-sm">
                <ListChecks className="w-4 h-4" />Categorías
              </button>
              <button onClick={updateAllPrices} disabled={updatingPrices} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium text-xs sm:text-sm disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${updatingPrices ? 'animate-spin' : ''}`} />{updatingPrices ? 'Actualizando...' : 'Actualizar Precios'}
              </button>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Rendimiento por Posición */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-100">
              <h3 className="font-bold mb-4 text-gray-800 text-sm sm:text-base">Rendimiento por Posición (%)</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rendimientoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="ticker" tick={{ fontSize: 10 }} width={50} />
                    <Tooltip formatter={(value, name) => [name === 'rendimiento' ? `${value}%` : `€${value}`, name === 'rendimiento' ? 'Rendimiento' : 'Ganancia']} />
                    <ReferenceLine x={0} stroke="#666" />
                    <Bar dataKey="rendimiento" radius={[0, 4, 4, 0]}>
                      {rendimientoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribución del Portafolio */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-pink-100">
              <h3 className="font-bold mb-4 text-gray-800 text-sm sm:text-base">Distribución del Portafolio</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribucionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v.toLocaleString()}`} />
                    <YAxis type="category" dataKey="ticker" tick={{ fontSize: 10 }} width={50} />
                    <Tooltip formatter={(value, name) => [name === 'valor' ? `€${value.toLocaleString()}` : `${value}%`, name === 'valor' ? 'Valor' : 'Porcentaje']} />
                    <Bar dataKey="valor" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolución del Portafolio */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-blue-100">
              <h3 className="font-bold mb-4 text-gray-800 text-sm sm:text-base">Evolución del Portafolio</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioSnapshots.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '']} labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES')} />
                    <Legend />
                    <Line type="monotone" dataKey="total_value" name="Valor Total" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="total_invested" name="Total Invertido" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribución por Categoría */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-green-100">
              <h3 className="font-bold mb-4 text-gray-800 text-sm sm:text-base">Distribución por Categoría</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoriaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v.toLocaleString()}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(value, name) => [name === 'valor' ? `€${value.toLocaleString()}` : `${value}%`, name === 'valor' ? 'Valor' : 'Porcentaje']} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                      {categoriaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabla de Posiciones */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-100 mb-6">
            <h3 className="font-bold mb-4 text-gray-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600" />Posiciones Activas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600">Ticker</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 hidden sm:table-cell">Exchange</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">Cantidad</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 hidden md:table-cell">P. Compra</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">P. Actual</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">Valor €</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">Var %</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 hidden lg:table-cell">Gan/Pér €</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsWithGain.map(inv => (
                    <tr key={inv.id} className={`border-b border-gray-100 hover:bg-gray-50 ${inv.gainPct < 0 ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-semibold text-sm">{inv.ticker}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[100px]">{inv.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600 hidden sm:table-cell">{inv.exchange}</td>
                      <td className="py-3 px-2 text-right text-sm">{inv.quantity.toFixed(4)}</td>
                      <td className="py-3 px-2 text-right text-sm hidden md:table-cell">{inv.currency === 'EUR' ? '€' : inv.currency === 'GBP' ? '£' : '$'}{inv.avg_purchase_price.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right text-sm">{inv.currency === 'EUR' ? '€' : inv.currency === 'GBP' ? '£' : '$'}{(inv.current_price || inv.avg_purchase_price).toFixed(2)}</td>
                      <td className="py-3 px-2 text-right text-sm font-semibold">€{inv.currentValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`py-3 px-2 text-right text-sm font-semibold ${inv.gainPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{inv.gainPct >= 0 ? '+' : ''}{inv.gainPct.toFixed(2)}%</td>
                      <td className={`py-3 px-2 text-right text-sm font-semibold hidden lg:table-cell ${inv.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>{inv.gain >= 0 ? '+' : ''}€{inv.gain.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditingInvestment(inv); setInvestmentForm({ ticker: inv.ticker, name: inv.name, exchange: inv.exchange, currency: inv.currency, category_id: inv.category_id || '', person: inv.person, date: '', quantity: '', price: '', commission: '0', current_price: '' }); setShowInvestmentModal(true); }} className="p-1 text-purple-600 hover:bg-purple-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => { if (confirm('¿Eliminar esta inversión?')) { const ok = await deleteInvestmentFromDb(inv.id); if (ok) setInvestments(investments.filter(i => i.id !== inv.id)); }}} className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-purple-50 font-bold">
                    <td className="py-3 px-2 text-sm" colSpan={5}>TOTAL</td>
                    <td className="py-3 px-2 text-right text-sm">€{totalPortfolioValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`py-3 px-2 text-right text-sm ${totalGainPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%</td>
                    <td className={`py-3 px-2 text-right text-sm hidden lg:table-cell ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalGain >= 0 ? '+' : ''}€{totalGain.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Tabla de Transacciones (colapsable) */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-100 mb-6">
            <button onClick={() => setShowTransactionsTable(!showTransactionsTable)} className="w-full flex items-center justify-between font-bold text-gray-800">
              <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-600" />Historial de Transacciones</span>
              <span className="text-purple-600">{showTransactionsTable ? '▲' : '▼'}</span>
            </button>
            {showTransactionsTable && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600">Fecha</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600">Ticker</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600">Tipo</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">Cantidad</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">Precio</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 hidden sm:table-cell">Comisión</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">Total</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 hidden md:table-cell">Gan/Pér</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investmentTransactions.slice(0, 50).map(tx => {
                      const inv = investments.find(i => i.id === tx.investment_id);
                      return (
                        <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 text-sm">{new Date(tx.date).toLocaleDateString('es-ES')}</td>
                          <td className="py-2 px-2 text-sm font-medium">{inv?.ticker || '-'}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {tx.type === 'buy' ? '🟢 Compra' : '🔴 Venta'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-sm">{tx.quantity.toFixed(4)}</td>
                          <td className="py-2 px-2 text-right text-sm">€{tx.price.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-sm hidden sm:table-cell">€{tx.commission.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-sm font-medium">€{tx.total.toFixed(2)}</td>
                          <td className={`py-2 px-2 text-right text-sm hidden md:table-cell ${tx.realized_gain ? (tx.realized_gain >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                            {tx.realized_gain ? `${tx.realized_gain >= 0 ? '+' : ''}€${tx.realized_gain.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {investmentTransactions.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No hay transacciones registradas</p>
                )}
              </div>
            )}
          </div>

          {/* Modal Nueva/Editar Inversión */}
          {showInvestmentModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">{editingInvestment ? 'Editar Inversión' : 'Nueva Inversión'}</h3>
                  <button onClick={() => setShowInvestmentModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ticker *</label>
                      <input type="text" placeholder="META" value={investmentForm.ticker} onChange={(e) => setInvestmentForm({ ...investmentForm, ticker: e.target.value.toUpperCase() })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" disabled={!!editingInvestment} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exchange *</label>
                      <select value={investmentForm.exchange} onChange={(e) => setInvestmentForm({ ...investmentForm, exchange: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        {EXCHANGES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input type="text" placeholder="Meta Platforms Inc" value={investmentForm.name} onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
                      <select value={investmentForm.currency} onChange={(e) => setInvestmentForm({ ...investmentForm, currency: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select value={investmentForm.category_id} onChange={(e) => setInvestmentForm({ ...investmentForm, category_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        <option value="">Sin categoría</option>
                        {investmentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
                    <select value={investmentForm.person} onChange={(e) => setInvestmentForm({ ...investmentForm, person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                      <option value="Nicolás">Nicolás</option>
                      <option value="Connie">Connie</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </div>
                  {editingInvestment && (
                    <>
                      <hr className="my-4" />
                      <p className="font-medium text-gray-700">Actualizar Precio Actual</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio Actual (manual)</label>
                        <input type="number" step="0.01" placeholder={editingInvestment.current_price || editingInvestment.avg_purchase_price} value={investmentForm.current_price || ''} onChange={(e) => setInvestmentForm({ ...investmentForm, current_price: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                        <p className="text-xs text-gray-500 mt-1">Dejá vacío para mantener el precio actual</p>
                      </div>
                    </>
                  )}
                  {!editingInvestment && (
                    <>
                      <hr className="my-4" />
                      <p className="font-medium text-gray-700">Primera Compra</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                        <input type="date" value={investmentForm.date} onChange={(e) => setInvestmentForm({ ...investmentForm, date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                          <input type="number" step="0.0001" placeholder="1.5" value={investmentForm.quantity} onChange={(e) => setInvestmentForm({ ...investmentForm, quantity: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                          <input type="number" step="0.01" placeholder="650.00" value={investmentForm.price} onChange={(e) => setInvestmentForm({ ...investmentForm, price: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comisión</label>
                        <input type="number" step="0.01" placeholder="1.00" value={investmentForm.commission} onChange={(e) => setInvestmentForm({ ...investmentForm, commission: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                      </div>
                      {investmentForm.quantity && investmentForm.price && (
                        <div className="bg-purple-50 p-3 rounded-xl">
                          <p className="text-sm text-purple-700">
                            <span className="font-semibold">Total: </span>
                            €{((parseFloat(investmentForm.quantity) * parseFloat(investmentForm.price)) + parseFloat(investmentForm.commission || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={async () => {
                    if (!investmentForm.ticker) { alert('Ingresa un ticker'); return; }
                    if (editingInvestment) {
                      const updates = { 
                        name: investmentForm.name, 
                        exchange: investmentForm.exchange,
                        currency: investmentForm.currency,
                        category_id: investmentForm.category_id || null,
                        person: investmentForm.person 
                      };
                      // Si se ingresó precio manual, actualizarlo
                      if (investmentForm.current_price) {
                        updates.current_price = parseFloat(investmentForm.current_price);
                        updates.current_value = editingInvestment.quantity * parseFloat(investmentForm.current_price);
                        updates.last_price_update = new Date().toISOString();
                      }
                      const updated = await updateInvestmentInDb(editingInvestment.id, updates);
                      if (updated) { 
                        setInvestments(investments.map(i => i.id === editingInvestment.id ? { ...i, ...updated } : i)); 
                        setShowInvestmentModal(false); 
                      }
                    } else {
                      if (!investmentForm.quantity || !investmentForm.price) { alert('Ingresa cantidad y precio'); return; }
                      const saved = await saveInvestmentToDb(investmentForm);
                      if (saved) { 
                        setInvestments([...investments, saved]); 
                        setShowInvestmentModal(false); 
                      }
                    }
                  }} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg disabled:opacity-50">
                    <Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setShowInvestmentModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Compra/Venta */}
          {showTransactionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">{transactionForm.type === 'buy' ? 'Registrar Compra' : 'Registrar Venta'}</h3>
                  <button onClick={() => setShowTransactionModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticker *</label>
                    <select value={transactionForm.investment_id} onChange={(e) => setTransactionForm({ ...transactionForm, investment_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                      <option value="">Seleccionar...</option>
                      {activeInvestments.map(inv => <option key={inv.id} value={inv.id}>{inv.ticker} - {inv.name}</option>)}
                    </select>
                    {transactionForm.investment_id && (() => {
                      const inv = investments.find(i => i.id === transactionForm.investment_id);
                      if (!inv) return null;
                      return (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                          <p>Cantidad actual: <strong>{inv.quantity.toFixed(4)}</strong></p>
                          <p>Precio actual: <strong>{inv.currency === 'EUR' ? '€' : '$'}{(inv.current_price || inv.avg_purchase_price).toFixed(2)}</strong></p>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Operación *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setTransactionForm({ ...transactionForm, type: 'buy' })} className={`px-4 py-3 rounded-xl font-medium ${transactionForm.type === 'buy' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>🟢 Compra</button>
                      <button type="button" onClick={() => setTransactionForm({ ...transactionForm, type: 'sell' })} className={`px-4 py-3 rounded-xl font-medium ${transactionForm.type === 'sell' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}>🔴 Venta</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input type="date" value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                      <input type="number" step="0.0001" placeholder="1.5" value={transactionForm.quantity} onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                      <input type="number" step="0.01" placeholder="650.00" value={transactionForm.price} onChange={(e) => setTransactionForm({ ...transactionForm, price: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comisión</label>
                    <input type="number" step="0.01" placeholder="1.00" value={transactionForm.commission} onChange={(e) => setTransactionForm({ ...transactionForm, commission: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <input type="text" placeholder="Opcional..." value={transactionForm.notes} onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                  </div>
                  {transactionForm.quantity && transactionForm.price && transactionForm.investment_id && (
                    <div className={`p-4 rounded-xl ${transactionForm.type === 'buy' ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-sm font-medium mb-2">{transactionForm.type === 'buy' ? 'Resumen de Compra' : 'Resumen de Venta'}</p>
                      <p className="text-sm">Total: <strong>€{((parseFloat(transactionForm.quantity) * parseFloat(transactionForm.price)) + parseFloat(transactionForm.commission || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></p>
                      {transactionForm.type === 'sell' && (() => {
                        const inv = investments.find(i => i.id === transactionForm.investment_id);
                        if (!inv) return null;
                        const sellTotal = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.price) - parseFloat(transactionForm.commission || 0);
                        const costBasis = parseFloat(transactionForm.quantity) * inv.avg_purchase_price;
                        const gain = sellTotal - costBasis;
                        const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0;
                        return (
                          <>
                            <p className="text-sm">Costo base: <strong>€{costBasis.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></p>
                            <p className={`text-sm font-bold ${gain >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              Ganancia/Pérdida: {gain >= 0 ? '+' : ''}€{gain.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ({gainPct.toFixed(1)}%)
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={async () => {
                    if (!transactionForm.investment_id || !transactionForm.quantity || !transactionForm.price) { 
                      alert('Completa todos los campos requeridos'); 
                      return; 
                    }
                    const inv = investments.find(i => i.id === transactionForm.investment_id);
                    if (transactionForm.type === 'sell' && parseFloat(transactionForm.quantity) > inv.quantity) {
                      alert(`No puedes vender más de ${inv.quantity} unidades`);
                      return;
                    }
                    
                    // Calcular ganancia realizada para ventas
                    let txData = { ...transactionForm };
                    if (transactionForm.type === 'sell' && inv) {
                      const sellTotal = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.price) - parseFloat(transactionForm.commission || 0);
                      const costBasis = parseFloat(transactionForm.quantity) * inv.avg_purchase_price;
                      txData.cost_basis = inv.avg_purchase_price;
                      txData.realized_gain = sellTotal - costBasis;
                    }
                    
                    const saved = await saveTransactionToDb(txData);
                    if (saved) { 
                      setInvestmentTransactions([saved, ...investmentTransactions]); 
                      // Recargar inversiones para ver los nuevos totales
                      const { data } = await supabase.from('investments').select('*').eq('group_id', groupId).eq('is_active', true);
                      if (data) setInvestments(data);
                      setShowTransactionModal(false); 
                    }
                  }} disabled={saving} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white hover:shadow-lg disabled:opacity-50 ${transactionForm.type === 'buy' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-pink-600'}`}>
                    <Save className="w-5 h-5" />{saving ? 'Guardando...' : transactionForm.type === 'buy' ? 'Registrar Compra' : 'Registrar Venta'}
                  </button>
                  <button onClick={() => setShowTransactionModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Categorías de Inversión */}
          {showInvestmentCategoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-800">Categorías de Inversión</h3>
                  <button onClick={() => setShowInvestmentCategoryModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Nueva categoría (ej: Tech, ETFs...)" value={newInvestmentCategory} onChange={(e) => setNewInvestmentCategory(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" />
                    <button onClick={async () => { 
                      if (newInvestmentCategory.trim()) { 
                        const saved = await saveInvestmentCategoryToDb(newInvestmentCategory); 
                        if (saved) { 
                          setInvestmentCategories([...investmentCategories, saved]); 
                          setNewInvestmentCategory(''); 
                        } 
                      } 
                    }} className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="border border-gray-200 rounded-xl max-h-60 overflow-y-auto">
                    {investmentCategories.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No hay categorías</p>
                    ) : investmentCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                          <span>{cat.name}</span>
                        </div>
                        <button onClick={async () => { 
                          if (confirm('¿Eliminar esta categoría?')) { 
                            const ok = await deleteInvestmentCategoryFromDb(cat.id); 
                            if (ok) setInvestmentCategories(investmentCategories.filter(c => c.id !== cat.id)); 
                          } 
                        }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowInvestmentCategoryModal(false)} className="flex-1 px-6 py-3 rounded-xl font-semibold bg-purple-600 text-white hover:bg-purple-700">Listo</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: GASTOS (Principal)
  // =====================================================
  const categoryData = getCategoryData();
  const personData = getPersonData();
  const monthlyData = getMonthlyData();
  const totalExpenses = getTotalExpenses();
  const filteredExpenses = getFilteredExpenses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-10">
        <header className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8 border border-purple-100">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Gastos de Nicolás & Connie 💑</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestión inteligente de finanzas familiares</p>
              <p className="text-xs text-gray-400 mt-1">{user.email}</p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              <button onClick={() => setCurrentPage('installments')} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-sm sm:text-base"><CreditCard className="w-4 h-4" />Cuotas</button>
              <button onClick={() => setCurrentPage('saldo')} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg font-semibold text-sm sm:text-base"><Wallet className="w-4 h-4" />Saldo</button>
              <button onClick={() => setCurrentPage('presupuesto')} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium text-sm sm:text-base"><Target className="w-4 h-4" /><span className="hidden sm:inline">Presupuesto</span><span className="sm:hidden">Presup.</span></button>
              <button onClick={() => setCurrentPage('investments')} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 font-medium text-sm sm:text-base"><TrendingUp className="w-4 h-4" /><span className="hidden sm:inline">Inversiones</span><span className="sm:hidden">Invers.</span></button>
              <button onClick={handleLogout} className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold text-sm sm:text-base"><LogOut className="w-4 h-4" />Salir</button>
            </div>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-6 items-stretch sm:items-center">
          <button onClick={openManualExpenseModal} disabled={saving || !isInitialized} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg font-semibold disabled:opacity-50 text-sm sm:text-base"><Plus className="w-4 h-4" />Agregar Gasto</button>
          <label className="relative cursor-pointer">
            <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} className="hidden" disabled={uploading || !isInitialized} />
            <div className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm sm:text-base ${uploading || !isInitialized ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'}`}><Upload className="w-4 h-4" />{uploading ? 'Procesando...' : 'Subir Extracto'}</div>
          </label>
          <button onClick={() => setShowCategoryManager(true)} className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium sm:ml-auto text-sm sm:text-base"><ListChecks className="w-4 h-4" />Gestionar Categorías</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-100">
            <div className="flex items-center justify-between"><div><p className="text-gray-600 text-xs sm:text-sm font-medium">Total Gastado</p><p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">€{totalExpenses.toFixed(2)}</p></div><div className="bg-purple-100 p-2 sm:p-3 rounded-xl"><DollarSign className="text-purple-600 w-6 h-6 sm:w-8 sm:h-8" /></div></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-pink-100">
            <div className="flex items-center justify-between"><div><p className="text-gray-600 text-xs sm:text-sm font-medium">Nicolás</p><p className="text-2xl sm:text-3xl font-bold text-pink-600 mt-1">€{(personData[0]?.value || 0).toFixed(2)}</p></div><div className="bg-pink-100 p-2 sm:p-3 rounded-xl"><User className="text-pink-600 w-6 h-6 sm:w-8 sm:h-8" /></div></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-blue-100">
            <div className="flex items-center justify-between"><div><p className="text-gray-600 text-xs sm:text-sm font-medium">Connie</p><p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">€{(personData[1]?.value || 0).toFixed(2)}</p></div><div className="bg-blue-100 p-2 sm:p-3 rounded-xl"><User className="text-blue-600 w-6 h-6 sm:w-8 sm:h-8" /></div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <h3 className="font-bold mb-4 text-gray-800">Top 5 Categorías</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} /><YAxis /><Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{categoryData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <h3 className="font-bold mb-4 text-gray-800">Gastos Mensuales</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} /><YAxis /><Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} /><Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <h3 className="font-bold mb-4 text-gray-800">Gastos por Persona</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie dataKey="value" data={personData} cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: €${value}`}>{personData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} /></PieChart></ResponsiveContainer></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-100">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800"><Filter className="w-5 h-5 text-purple-600" /> Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={filter.person} onChange={(e) => setFilter({ ...filter, person: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl"><option value="all">👥 Ambos</option><option value="Nicolás">👤 Nicolás</option><option value="Connie">👤 Connie</option></select>
            <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl"><option value="all">📂 Todas las categorías</option>{Object.keys(categories).sort().map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
            <select value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl"><option value="all">📅 Todos los meses</option>{getAvailableMonths().map((month) => { const [year, m] = month.split('-'); return <option key={month} value={month}>{new Date(year, parseInt(m) - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</option>; })}</select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          {expenses.length === 0 ? (
            <div className="text-center py-12"><Upload className="mx-auto text-gray-300 mb-4 w-16 h-16" /><p className="text-gray-500 text-lg">Sube tu extracto bancario o agrega un gasto manual</p></div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Lista de Gastos ({filteredExpenses.length})</h3>
                {selectedExpenses.length > 0 && <button onClick={deleteSelectedExpenses} className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"><Trash2 className="w-4 h-4" />Eliminar ({selectedExpenses.length})</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-purple-100">
                      <th className="p-3 text-left"><input type="checkbox" checked={selectedExpenses.length > 0 && selectedExpenses.length === filteredExpenses.length} onChange={(e) => setSelectedExpenses(e.target.checked ? filteredExpenses.map((exp) => exp.id) : [])} /></th>
                      <th className="p-3 text-left font-semibold text-gray-700">Fecha</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Concepto</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Categoría</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Persona</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Monto</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-gray-100 hover:bg-purple-50">
                        <td className="p-3"><input type="checkbox" checked={selectedExpenses.includes(expense.id)} onChange={() => toggleSelectExpense(expense.id)} /></td>
                        <td className="p-3 text-gray-600">{expense.date}</td>
                        <td className="p-3 text-gray-800 max-w-xs truncate">{expense.concept}</td>
                        <td className="p-3">
                          {editingId === expense.id ? (
                            <div className="flex items-center gap-1">
                              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="px-2 py-1 border border-purple-300 rounded text-xs">{Object.keys(categories).sort().map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
                              <button onClick={() => saveEdit(expense.id)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600"><Save className="w-3 h-3" /></button>
                              <button onClick={cancelEdit} className="p-1 text-gray-500 hover:text-gray-700"><X className="w-3 h-3" /></button>
                            </div>
                          ) : <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">{expense.category}</span>}
                        </td>
                        <td className="p-3"><span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${expense.person === 'Nicolás' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>{expense.person}</span></td>
                        <td className="p-3 text-right font-semibold text-gray-800">€{Number(expense.amount).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          {editingId !== expense.id && (
                            <div className="flex justify-center gap-1">
                              <button onClick={() => startEdit(expense)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteExpense(expense.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {showCategoryManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-gray-800">Administración de Categorías</h3>
                <button onClick={() => { setShowCategoryManager(false); setSelectedCategoryKeys([]); }} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm text-gray-700">Nueva Categoría</h4>
                <div className="flex gap-2">
                  <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nombre" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" />
                  <button onClick={addNewCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Agregar</button>
                </div>
              </div>
              <div className="mb-4 max-h-60 overflow-y-auto border rounded-lg">
                {Object.keys(categories).sort().map((cat) => (
                  <label key={cat} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                    <input type="checkbox" checked={selectedCategoryKeys.includes(cat)} onChange={() => toggleSelectCategoryKey(cat)} />
                    <span className="flex-1 font-medium">{cat}</span>
                    <span className="text-sm text-gray-500">{expenses.filter(e => e.category === cat).length} gastos</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={renameSelectedCategory} disabled={selectedCategoryKeys.length !== 1} className={`px-4 py-2 rounded-lg ${selectedCategoryKeys.length === 1 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Renombrar</button>
                <button onClick={deleteSelectedCategories} disabled={selectedCategoryKeys.length === 0} className={`px-4 py-2 rounded-lg ${selectedCategoryKeys.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {showManualExpenseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-gray-800">Nuevo Gasto Manual</h3>
                <button onClick={() => setShowManualExpenseModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label><input type="text" placeholder="DD/MM/YYYY" value={manualExpense.date} onChange={(e) => setManualExpense({ ...manualExpense, date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><input type="text" placeholder="Ej: Compra en supermercado" value={manualExpense.concept} onChange={(e) => setManualExpense({ ...manualExpense, concept: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto (€)</label><input type="number" step="0.01" placeholder="0.00" value={manualExpense.amount} onChange={(e) => setManualExpense({ ...manualExpense, amount: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label><select value={manualExpense.category} onChange={(e) => setManualExpense({ ...manualExpense, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl">{Object.keys(categories).sort().map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Persona</label><select value={manualExpense.person} onChange={(e) => setManualExpense({ ...manualExpense, person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl"><option value="Nicolás">Nicolás</option><option value="Connie">Connie</option></select></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={saveManualExpense} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Guardando...' : 'Guardar Gasto'}</button>
                <button onClick={() => setShowManualExpenseModal(false)} className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTrackerApp;
