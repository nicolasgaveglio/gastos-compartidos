import React, { useEffect, useState } from 'react';
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
} from 'recharts';
import { Upload, DollarSign, User, Filter, Edit2, Plus, Save, X, Trash2, ListChecks } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEFAULT_CATEGORIES = {
  Alquiler: ['alquiler', 'rent'],
  Electricidad: ['electricidad', 'electric', 'endesa', 'iberdrola'],
  Gas: ['gas natural', 'gas'],
  Agua: ['agua', 'aguas', 'aigues'],
  Celular: ['telefonica moviles', 'movistar', 'vodafone', 'orange', 'yoigo', 'celular'],
  Internet: ['telefonica de espana', 'fijo', 'internet', 'fibra'],
  'Muebles/Electrodomésticos/Cocina': ['ikea', 'leroy', 'media markt', 'worten', 'el corte ingles'],
  'Transporte público': ['tmb', 't mobilitat', 'renfe', 'metro', 'bus'],
  Bicing: ['bicing'],
  'Uber/taxi': ['uber', 'taxi', 'cabify', 'bolt', 'yego'],
  Supermercado: [
    'mercadona',
    'carrefour',
    'lidl',
    'aldi',
    'dia',
    'caprabo',
    'bonpreu',
    'condis',
    'supermercat',
    'kachafruit',
    'greensland',
    'cash and carry',
  ],
  Suplementos: ['suplemento', 'proteina', 'vitamina', 'myprotein'],
  Salidas: ['restaurante', 'bar ', 'popis', 'fornet', 'canigo', 'bonastre', 'bravas', 'foix', 'pedreta', 'pren algo'],
  Ropa: ['zara', 'h&m', 'mango', 'pull&bear', 'bershka', 'stradivarius', 'oysho', 'massimo dutti', 'uniqlo'],
  Limpieza: ['limpieza', 'detergente', 'lejia'],
  'Peluquería/Barbería': ['peluqueria', 'barberia', 'salon', 'corte pelo'],
  Educación: ['universidad', 'curso', 'academia', 'escuela', 'nuclio', 'udemy', 'coursera'],
  'Plataformas (Netflix/Amazon/Adobe/Spotify/Microsoft)': [
    'netflix',
    'amazon prime',
    'spotify',
    'adobe',
    'microsoft',
    'disney',
    'hbo',
    'apple',
  ],
  'Conciertos/Obras de teatro': ['concierto', 'teatro', 'entradas', 'ticketmaster'],
  Deportes: ['decathlon', 'sprinter', 'gimnasio', 'deporte'],
  'Recreación al aire libre': ['parque', 'excursion', 'montana'],
  'Seguro médico': ['seguro medico', 'axa', 'sanitas', 'mapfre', 'planeta seguros'],
  Gimnasio: ['gimnasio', 'gym', 'fitness', 'crossfit'],
  'Consultas de médicos/odontólogos': ['medico', 'doctor', 'clinica', 'dentista', 'odontologo'],
  'Farmacia/Medicamentos': ['farmacia', 'medicamento', 'parafarmacia'],
  Pasajes: ['vueling', 'ryanair', 'iberia', 'renfe', 'bus', 'avion', 'tren'],
  Alojamiento: ['booking', 'airbnb', 'hotel', 'hostal'],
  Comidas: ['comida', 'meal', 'food'],
  Recuerdos: ['souvenir', 'recuerdo', 'regalo'],
  'Alquiler de coches': ['rent a car', 'alquiler coche', 'hertz', 'avis', 'europcar'],
  Psicóloga: ['psicologa', 'psicologo', 'terapia', 'psicoterapia'],
  Otro: [],
};

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6', '#f97316'];

const ExpenseTrackerApp = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [groupId, setGroupId] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [filter, setFilter] = useState({ person: 'all', category: 'all', month: 'all' });

  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState('');

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState([]);

  const [selectedExpenses, setSelectedExpenses] = useState([]);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showManualExpenseModal, setShowManualExpenseModal] = useState(false);
  const [manualExpense, setManualExpense] = useState({
    date: new Date().toLocaleDateString('es-ES'),
    concept: '',
    amount: '',
    category: 'Otro',
    person: 'Nicolás',
  });

  // ---------- AUTH ----------

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) {
        setExpenses([]);
        setGroupId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setExpenses([]);
    setGroupId(null);
  };

  // ---------- GROUP LOADING ----------

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadGroupId = async () => {
      try {
        const { data } = await supabase
          .from('groups')
          .select('id')
          .contains('user_ids', [user.id])
          .single();

        if (data) {
          setGroupId(data.id); // int4
        } else {
          const { data: newGroup, error } = await supabase
            .from('groups')
            .insert({
              name: `Grupo ${user.email?.split('@')[0] || 'Compartido'}`,
              user_ids: [user.id],
            })
            .select('id')
            .single();

          if (newGroup && !error) {
            setGroupId(newGroup.id);
          } else {
            console.error('Error creando grupo:', error);
          }
        }
      } catch (error) {
        console.error('Error cargando grupo:', error);
      }
    };

    loadGroupId();
  }, [user]);

  // ---------- DATA LOADING WHEN groupId READY ----------

  useEffect(() => {
    if (!groupId) {
      if (user) setLoading(true);
      return;
    }

    const loadExpenses = async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading expenses:', error);
      } else {
        setExpenses(data || []);
      }
    };

    const loadCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('categories')
          .eq('group_id', groupId)
          .single();

        if (data && data.categories) {
          setCategories({ ...DEFAULT_CATEGORIES, ...data.categories });
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadExpenses(), loadCategories()]);
      setLoading(false);
    };

    loadAll();
  }, [groupId, user]);

  // ---------- HELPERS: SAVE ----------

  const persistExpenses = async (newExpenses) => {
    if (!user || groupId == null) {
      console.error('No user or groupId available', { user, groupId });
      alert('Error: No hay grupo configurado todavía. Reintenta en unos segundos.');
      return;
    }

    const parsedGroupId = Number(groupId); // group_id int4

    const expensesToUpsert = newExpenses.map((exp) => {
      const safeId =
        exp.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return {
        id: safeId,
        group_id: parsedGroupId,
        user_id: user.id,
        date: exp.date,
        concept: exp.concept,
        amount: Number(exp.amount),
        category: exp.category,
        person: exp.person,
        updated_at: new Date().toISOString(),
      };
    });

    const { data, error, status, statusText } = await supabase
      .from('expenses')
      .upsert(expensesToUpsert, { onConflict: 'id' });

    console.log('DEBUG upsert response:', { data, error, status, statusText });

    if (error) {
      console.error('Error saving expenses:', error);
      alert(`Error guardando: ${error.message || 'sin mensaje'}`);
      return;
    }

    setHasUnsavedChanges(false);

    const { data: reload } = await supabase
      .from('expenses')
      .select('*')
      .eq('group_id', parsedGroupId)
      .order('date', { ascending: false });

    setExpenses(reload || []);
  };

  const persistCategories = async (updatedCategories) => {
    if (!groupId) {
      alert('Todavía no hay grupo cargado. Intenta de nuevo en unos segundos.');
      return;
    }

    const parsedGroupId = Number(groupId); // int4

    const { error } = await supabase
      .from('categories')
      .upsert([{ group_id: parsedGroupId, categories: updatedCategories }], {
        onConflict: 'group_id',
      });

    if (error) {
      console.error('Error saving categories:', error);
    } else {
      setCategories(updatedCategories);
      setHasUnsavedChanges(false);
    }
  };

  // ---------- LOGIC: CATEGORIZACIÓN, PARSEO, FILTROS ----------

  const categorizeExpense = (concept) => {
    const conceptLower = concept.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (category === 'Otro') continue;
      for (const keyword of keywords) {
        if (conceptLower.includes(keyword)) return category;
      }
    }
    return 'Otro';
  };

  const detectPerson = (concept, titular) => {
    if (concept.toLowerCase().includes('connie')) return 'Connie';
    return titular || 'Nicolás';
  };

  const parseExcel = async (file) => {
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true, cellNF: true, cellStyles: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i].includes('FECHA OPERACIÓN') || jsonData[i].includes('CONCEPTO')) {
          headerRowIndex = i;
          break;
        }
      }
      if (headerRowIndex === -1) {
        alert('No se pudo encontrar el formato correcto del extracto de Santander');
        return;
      }

      let titular = 'Nicolás';
      for (let i = 0; i < headerRowIndex; i++) {
        const row = jsonData[i];
        if (row.includes('Titular') && i + 1 < jsonData.length) {
          const nextRow = jsonData[i + 1];
          if (nextRow[2]) titular = nextRow[2].includes('CONNIE') ? 'Connie' : 'Nicolás';
        }
      }

      const newExpenses = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row[0] || !row[2] || !row[3]) continue;

        const amount = Math.abs(parseFloat(row[3]));
        if (amount === 0 || isNaN(amount)) continue;

        const concept = String(row[2]);
        if (parseFloat(row[3]) >= 0) continue;

        newExpenses.push({
          id: `${Date.now()}-${i}`,
          date: row[0],
          concept,
          amount,
          category: categorizeExpense(concept),
          person: detectPerson(concept, titular),
        });
      }

      const existingIds = new Set(expenses.map((e) => `${e.date}-${e.concept}-${e.amount}`));
      const filteredNew = newExpenses.filter(
        (e) => !existingIds.has(`${e.date}-${e.concept}-${e.amount}`),
      );

      const updated = [...expenses, ...filteredNew].sort(
        (a, b) =>
          new Date(b.date.split('/').reverse().join('-')) -
          new Date(a.date.split('/').reverse().join('-')),
      );

      await persistExpenses(updated);
      alert(`✅ ${filteredNew.length} nuevos gastos añadidos`);
    } catch (error) {
      console.error('Error procesando archivo:', error);
      alert('Error al procesar el archivo. Asegúrate de que sea un extracto válido de Santander.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) parseExcel(file);
  };

  // edición de gasto
  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditCategory(expense.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCategory('');
  };

  const saveEdit = async (expenseId) => {
    const updated = expenses.map((exp) =>
      exp.id === expenseId ? { ...exp, category: editCategory } : exp,
    );
    await persistExpenses(updated);
    setEditingId(null);
    setEditCategory('');
  };

  const toggleSelectExpense = (id) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id],
    );
  };

  const deleteSelectedExpenses = async () => {
    if (selectedExpenses.length === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedExpenses.length} gasto(s)?`)) return;

    const updated = expenses.filter((exp) => !selectedExpenses.includes(exp.id));
    await persistExpenses(updated);
    setSelectedExpenses([]);
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    const updated = expenses.filter((exp) => exp.id !== id);
    await persistExpenses(updated);
  };

  // gasto manual
  const openManualExpenseModal = () => {
    setManualExpense({
      date: new Date().toLocaleDateString('es-ES'),
      concept: '',
      amount: '',
      category: 'Otro',
      person: 'Nicolás',
    });
    setShowManualExpenseModal(true);
  };

  const saveManualExpense = async () => {
    if (!manualExpense.concept.trim()) return alert('Ingresa una descripción');
    if (!manualExpense.amount || parseFloat(manualExpense.amount) <= 0)
      return alert('Ingresa un monto válido');

    const newExpense = {
      id: `manual-${Date.now()}`,
      date: manualExpense.date,
      concept: manualExpense.concept,
      amount: parseFloat(manualExpense.amount),
      category: manualExpense.category,
      person: manualExpense.person,
    };

    const updated = [newExpense, ...expenses].sort(
      (a, b) =>
        new Date(b.date.split('/').reverse().join('-')) -
        new Date(a.date.split('/').reverse().join('-')),
    );

    await persistExpenses(updated);
    setShowManualExpenseModal(false);
    alert('✅ Gasto agregado correctamente');
  };

  // filtros y datos para gráficos
  const getFilteredExpenses = () =>
    expenses.filter((exp) => {
      if (filter.person !== 'all' && exp.person !== filter.person) return false;
      if (filter.category !== 'all' && exp.category !== filter.category) return false;
      if (filter.month !== 'all') {
        const expDate = new Date(exp.date.split('/').reverse().join('-'));
        const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(
          2,
          '0',
        )}`;
        if (expMonth !== filter.month) return false;
      }
      return true;
    });

  const getCategoryData = () => {
    const filtered = getFilteredExpenses();
    const categoryTotals = {};
    filtered.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const getMonthlyData = () => {
    const monthlyTotals = {};
    expenses.forEach((exp) => {
      if (filter.person !== 'all' && exp.person !== filter.person) return;
      if (filter.category !== 'all' && exp.category !== filter.category) return;

      const date = new Date(exp.date.split('/').reverse().join('-'));
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + exp.amount;
    });

    return Object.entries(monthlyTotals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => {
        const [year, m] = month.split('-');
        const monthName = new Date(year, m - 1).toLocaleDateString('es-ES', { month: 'short' });
        return { month: `${monthName} ${year}`, total: parseFloat(total.toFixed(2)) };
      });
  };

  const getPersonData = () => {
    const filtered = getFilteredExpenses();
    const personTotals = { Nicolás: 0, Connie: 0 };
    filtered.forEach((exp) => {
      personTotals[exp.person] = (personTotals[exp.person] || 0) + exp.amount;
    });
    return [
      { name: 'Nicolás', value: parseFloat((personTotals['Nicolás'] || 0).toFixed(2)) },
      { name: 'Connie', value: parseFloat((personTotals['Connie'] || 0).toFixed(2)) },
    ];
  };

  const getTotalExpenses = () =>
    getFilteredExpenses().reduce((sum, e) => sum + e.amount, 0);

  const getAvailableMonths = () => {
    const months = new Set();
    expenses.forEach((exp) => {
      const date = new Date(exp.date.split('/').reverse().join('-'));
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  };

  // categorías
  const toggleSelectCategoryKey = (key) => {
    setSelectedCategoryKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const deleteSelectedCategories = async () => {
    if (selectedCategoryKeys.length === 0)
      return alert('Selecciona al menos una categoría para eliminar.');
    if (
      !window.confirm(
        `Eliminar ${selectedCategoryKeys.length} categoría(s)? Los gastos pasarán a "Otro".`,
      )
    )
      return;

    const updatedCategories = { ...categories };
    selectedCategoryKeys.forEach((k) => delete updatedCategories[k]);

    const updatedExpenses = expenses.map((exp) =>
      selectedCategoryKeys.includes(exp.category) ? { ...exp, category: 'Otro' } : exp,
    );

    await persistExpenses(updatedExpenses);
    await persistCategories(updatedCategories);
    setSelectedCategoryKeys([]);
    setShowCategoryManager(false);
  };

  const reassignSelectedCategories = async (targetCategory) => {
    if (selectedCategoryKeys.length === 0)
      return alert('Selecciona al menos una categoría para reasignar.');
    if (!targetCategory || !categories[targetCategory])
      return alert('Selecciona una categoría destino válida.');

    const updatedExpenses = expenses.map((exp) =>
      selectedCategoryKeys.includes(exp.category) ? { ...exp, category: targetCategory } : exp,
    );

    const updatedCategories = { ...categories };
    selectedCategoryKeys.forEach((k) => delete updatedCategories[k]);

    await persistExpenses(updatedExpenses);
    await persistCategories(updatedCategories);
    setSelectedCategoryKeys([]);
    setShowCategoryManager(false);
  };

  const renameSelectedCategory = async () => {
    if (selectedCategoryKeys.length !== 1)
      return alert('Selecciona exactamente 1 categoría para renombrar.');

    const oldName = selectedCategoryKeys[0];
    const newName = window.prompt('Nuevo nombre para la categoría', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;

    const updatedCategories = { ...categories };
    updatedCategories[newName] = updatedCategories[oldName] || [];
    delete updatedCategories[oldName];

    const updatedExpenses = expenses.map((exp) =>
      exp.category === oldName ? { ...exp, category: newName } : exp,
    );

    await persistCategories(updatedCategories);
    await persistExpenses(updatedExpenses);
    setSelectedCategoryKeys([]);
    setShowCategoryManager(false);
  };

  const addNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return alert('Escribe un nombre válido.');
    if (categories[name]) return alert('Ya existe esa categoría.');

    const updated = { ...categories, [name]: [] };
    await persistCategories(updated);
    setNewCategoryName('');
  };

  // ---------- RENDER ----------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-600 text-lg">Cargando gastos...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
          Gastos Compartidos 💑
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          Inicia sesión para gestionar tus gastos
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold text-lg"
        >
          <User className="w-5 h-5" /> Login with Google
        </button>
      </div>
    );
  }

  const categoryData = getCategoryData();
  const personData = getPersonData();
  const monthlyData = getMonthlyData();
  const totalExpenses = getTotalExpenses();
  const filteredExpenses = getFilteredExpenses();

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Gastos de Nicolás & Connie 💑
            </h1>
            <p className="text-gray-600">
              Gestión inteligente de gastos compartidos
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold"
          >
            <X className="w-4 h-4" />
            Logout {user.email?.split('@')[0]}
          </button>
        </header>

        {/* Acciones */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <button
            onClick={openManualExpenseModal}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all font-semibold"
          >
            <Plus className="w-4 h-4" />
            Agregar Gasto
          </button>

          <label className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all font-semibold cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Procesando...' : 'Subir Extracto'}
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {hasUnsavedChanges && (
            <button
              onClick={async () => {
                await persistExpenses(expenses);
                await persistCategories(categories);
                alert('✅ Cambios guardados correctamente');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          )}

          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 ml-auto"
          >
            <ListChecks className="w-4 h-4" />
            Gestionar Categorías
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Gastado</p>
              <p className="text-2xl font-bold">€{totalExpenses.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Nicolás</p>
              <p className="text-xl font-bold">
                €{(personData[0]?.value || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-3 rounded-full bg-pink-100 text-pink-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Connie</p>
              <p className="text-xl font-bold">
                €{(personData[1]?.value || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-2">Top 5 Categorías</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} />
                  <Bar dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-2">Gastos Anuales (mensual)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-2">Gastos por Persona</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={personData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {personData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </h3>
          <div className="flex flex-wrap gap-3">
            <select
              value={filter.person}
              onChange={(e) => setFilter({ ...filter, person: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">👥 Ambos</option>
              <option value="Nicolás">👤 Nicolás</option>
              <option value="Connie">👤 Connie</option>
            </select>

            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">📂 Todas las categorías</option>
              {Object.keys(categories)
                .sort()
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>

            <select
              value={filter.month}
              onChange={(e) => setFilter({ ...filter, month: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">📅 Todos los meses</option>
              {getAvailableMonths().map((month) => {
                const [year, monthNum] = month.split('-');
                const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-ES', {
                  month: 'long',
                  year: 'numeric',
                });
                return (
                  <option key={month} value={month}>
                    {monthName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Lista de gastos */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
          {expenses.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              Subí tu extracto de Santander para comenzar
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  Lista de Gastos ({filteredExpenses.length})
                </h3>
                {selectedExpenses.length > 0 && (
                  <button
                    onClick={deleteSelectedExpenses}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar seleccionados
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-2 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectedExpenses.length > 0 &&
                            selectedExpenses.length === filteredExpenses.length
                          }
                          onChange={(e) =>
                            setSelectedExpenses(
                              e.target.checked ? filteredExpenses.map((exp) => exp.id) : [],
                            )
                          }
                        />
                      </th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Concepto</th>
                      <th className="p-2 text-left">Categoría</th>
                      <th className="p-2 text-left">Persona</th>
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={() => toggleSelectExpense(expense.id)}
                          />
                        </td>
                        <td className="p-2">{expense.date}</td>
                        <td className="p-2">{expense.concept}</td>
                        <td className="p-2">
                          {editingId === expense.id ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="px-2 py-1 border border-purple-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                              >
                                {Object.keys(categories)
                                  .sort()
                                  .map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => saveEdit(expense.id)}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-gray-500 hover:text-gray-700"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(expense)}
                              className="inline-flex items-center gap-1 text-purple-600 hover:underline text-xs"
                            >
                              <Edit2 className="w-3 h-3" />
                              {expense.category}
                            </button>
                          )}
                        </td>
                        <td className="p-2">{expense.person}</td>
                        <td className="p-2 text-right">€{expense.amount.toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Gestión categorías */}
        {showCategoryManager && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Administración de Categorías</h3>
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm">Nueva Categoría</h4>
                <div className="flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de nueva categoría"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={addNewCategory}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div className="mb-3 max-h-52 overflow-y-auto border rounded-lg p-2">
                {Object.keys(categories)
                  .sort()
                  .map((cat) => (
                    <label key={cat} className="flex items-center gap-2 text-sm py-1">
                      <input
                        type="checkbox"
                        checked={selectedCategoryKeys.includes(cat)}
                        onChange={() => toggleSelectCategoryKey(cat)}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={renameSelectedCategory}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Renombrar
                </button>
                <button
                  onClick={() => {
                    const target = window.prompt(
                      'Nombre de categoría destino para reasignar:',
                    );
                    if (target) reassignSelectedCategories(target);
                  }}
                  className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
                >
                  Reasignar
                </button>
                <button
                  onClick={deleteSelectedCategories}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal gasto manual */}
        {showManualExpenseModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Nuevo Gasto Manual</h3>
                <button
                  onClick={() => setShowManualExpenseModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <input
                  type="date"
                  value={manualExpense.date.split('/').reverse().join('-')}
                  onChange={(e) =>
                    setManualExpense({
                      ...manualExpense,
                      date: e.target.value.split('-').reverse().join('/'),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="Concepto"
                  value={manualExpense.concept}
                  onChange={(e) =>
                    setManualExpense({ ...manualExpense, concept: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="number"
                  placeholder="Monto"
                  value={manualExpense.amount}
                  onChange={(e) =>
                    setManualExpense({ ...manualExpense, amount: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
                <select
                  value={manualExpense.category}
                  onChange={(e) =>
                    setManualExpense({ ...manualExpense, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  {Object.keys(categories)
                    .sort()
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
                <select
                  value={manualExpense.person}
                  onChange={(e) =>
                    setManualExpense({ ...manualExpense, person: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Nicolás">Nicolás</option>
                  <option value="Connie">Connie</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowManualExpenseModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveManualExpense}
                  className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTrackerApp;
