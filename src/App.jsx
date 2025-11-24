import React, { useEffect, useState } from 'react';
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
  Pie
} from 'recharts';
import { Upload, DollarSign, User, Filter, Edit2, Plus, Save, X, Trash2, ListChecks } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEFAULT_CATEGORIES = {
  'Alquiler': ['alquiler', 'rent'],
  'Electricidad': ['electricidad', 'electric', 'endesa', 'iberdrola'],
  'Gas': ['gas natural', 'gas'],
  'Agua': ['agua', 'aguas', 'aigues'],
  'Celular': ['telefonica moviles', 'movistar', 'vodafone', 'orange', 'yoigo', 'celular'],
  'Internet': ['telefonica de espana', 'fijo', 'internet', 'fibra'],
  'Muebles/Electrodomésticos/Cocina': ['ikea', 'leroy', 'media markt', 'worten', 'el corte ingles'],
  'Transporte público': ['tmb', 't mobilitat', 'renfe', 'metro', 'bus'],
  'Bicing': ['bicing'],
  'Uber/taxi': ['uber', 'taxi', 'cabify', 'bolt', 'yego'],
  'Supermercado': ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'caprabo', 'bonpreu', 'condis', 'supermercat', 'kachafruit', 'greensland', 'cash and carry'],
  'Suplementos': ['suplemento', 'proteina', 'vitamina', 'myprotein'],
  'Salidas': ['restaurante', 'bar ', 'popis', 'fornet', 'canigo', 'bonastre', 'bravas', 'foix', 'pedreta', 'pren algo'],
  'Ropa': ['zara', 'h&m', 'mango', 'pull&bear', 'bershka', 'stradivarius', 'oysho', 'massimo dutti', 'uniqlo'],
  'Limpieza': ['limpieza', 'detergente', 'lejia'],
  'Peluquería/Barbería': ['peluqueria', 'barberia', 'salon', 'corte pelo'],
  'Educación': ['universidad', 'curso', 'academia', 'escuela', 'nuclio', 'udemy', 'coursera'],
  'Plataformas (Netflix/Amazon/Adobe/Spotify/Microsoft)': ['netflix', 'amazon prime', 'spotify', 'adobe', 'microsoft', 'disney', 'hbo', 'apple'],
  'Conciertos/Obras de teatro': ['concierto', 'teatro', 'entradas', 'ticketmaster'],
  'Deportes': ['decathlon', 'sprinter', 'gimnasio', 'deporte'],
  'Recreación al aire libre': ['parque', 'excursion', 'montana'],
  'Seguro médico': ['seguro medico', 'axa', 'sanitas', 'mapfre', 'planeta seguros'],
  'Gimnasio': ['gimnasio', 'gym', 'fitness', 'crossfit'],
  'Consultas de médicos/odontólogos': ['medico', 'doctor', 'clinica', 'dentista', 'odontologo'],
  'Farmacia/Medicamentos': ['farmacia', 'medicamento', 'parafarmacia'],
  'Pasajes': ['vueling', 'ryanair', 'iberia', 'renfe', 'bus', 'avion', 'tren'],
  'Alojamiento': ['booking', 'airbnb', 'hotel', 'hostal'],
  'Comidas': ['comida', 'meal', 'food'],
  'Recuerdos': ['souvenir', 'recuerdo', 'regalo'],
  'Alquiler de coches': ['rent a car', 'alquiler coche', 'hertz', 'avis', 'europcar'],
  'Psicóloga': ['psicologa', 'psicologo', 'terapia', 'psicoterapia'],
  'Otro': []
};

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6', '#f97316'];

const ExpenseTrackerApp = () => {
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
    person: 'Nicolás'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const expensesResult = await window.storage.get('shared-expenses', true);
      if (expensesResult && expensesResult.value) {
        setExpenses(JSON.parse(expensesResult.value));
      }
      const categoriesResult = await window.storage.get('custom-categories', true);
      if (categoriesResult && categoriesResult.value) {
        const saved = JSON.parse(categoriesResult.value);
        setCategories({ ...DEFAULT_CATEGORIES, ...saved });
      }
    } catch (error) {
      console.log('Comenzando desde cero');
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  const persistExpenses = async (newExpenses) => {
    setExpenses(newExpenses);
    try {
      await window.storage.set('shared-expenses', JSON.stringify(newExpenses), true);
    } catch (e) {
      console.error('Error guardando gastos', e);
    }
  };

  const persistCategories = async (newCategories) => {
    setCategories(newCategories);
    try {
      await window.storage.set('custom-categories', JSON.stringify(newCategories), true);
    } catch (e) {
      console.error('Error guardando categorias', e);
    }
  };

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
        setUploading(false);
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
          person: detectPerson(concept, titular)
        });
      }

      const existingIds = new Set(expenses.map(e => `${e.date}-${e.concept}-${e.amount}`));
      const filteredNew = newExpenses.filter(e => !existingIds.has(`${e.date}-${e.concept}-${e.amount}`));
      const updated = [...expenses, ...filteredNew].sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-')));
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

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditCategory(expense.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCategory('');
  };

  const saveEdit = async (expenseId) => {
    const updated = expenses.map(exp => exp.id === expenseId ? { ...exp, category: editCategory } : exp);
    await persistExpenses(updated);
    setEditingId(null);
    setEditCategory('');
  };

  const toggleSelectExpense = (id) => {
    setSelectedExpenses(prev => prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]);
  };

  const deleteSelectedExpenses = async () => {
    if (selectedExpenses.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedExpenses.length} gasto(s)?`)) return;
    const updated = expenses.filter(exp => !selectedExpenses.includes(exp.id));
    await persistExpenses(updated);
    setSelectedExpenses([]);
  };

  const deleteExpense = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    const updated = expenses.filter(exp => exp.id !== id);
    await persistExpenses(updated);
  };

  const openManualExpenseModal = () => {
    setManualExpense({
      date: new Date().toLocaleDateString('es-ES'),
      concept: '',
      amount: '',
      category: 'Otro',
      person: 'Nicolás'
    });
    setShowManualExpenseModal(true);
  };

  const saveManualExpense = async () => {
    if (!manualExpense.concept.trim()) return alert('Ingresa una descripción');
    if (!manualExpense.amount || parseFloat(manualExpense.amount) <= 0) return alert('Ingresa un monto válido');
    
    const newExpense = {
      id: `manual-${Date.now()}`,
      date: manualExpense.date,
      concept: manualExpense.concept,
      amount: parseFloat(manualExpense.amount),
      category: manualExpense.category,
      person: manualExpense.person
    };

    const updated = [newExpense, ...expenses].sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-')));
    await persistExpenses(updated);
    setShowManualExpenseModal(false);
    alert('✅ Gasto agregado correctamente');
  };

  const getFilteredExpenses = () => {
    return expenses.filter(exp => {
      if (filter.person !== 'all' && exp.person !== filter.person) return false;
      if (filter.category !== 'all' && exp.category !== filter.category) return false;
      if (filter.month !== 'all') {
        const expDate = new Date(exp.date.split('/').reverse().join('-'));
        const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        if (expMonth !== filter.month) return false;
      }
      return true;
    });
  };

  const getCategoryData = () => {
    const filtered = getFilteredExpenses();
    const categoryTotals = {};
    filtered.forEach(exp => categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount);
    const arr = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    return arr.sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const getMonthlyData = () => {
    const monthlyTotals = {};
    expenses.forEach(exp => {
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
    const personTotals = { 'Nicolás': 0, 'Connie': 0 };
    filtered.forEach(exp => personTotals[exp.person] = (personTotals[exp.person] || 0) + exp.amount);
    return [
      { name: 'Nicolás', value: parseFloat((personTotals['Nicolás'] || 0).toFixed(2)) },
      { name: 'Connie', value: parseFloat((personTotals['Connie'] || 0).toFixed(2)) }
    ];
  };

  const getTotalExpenses = () => getFilteredExpenses().reduce((sum, e) => sum + e.amount, 0);

  const getAvailableMonths = () => {
    const months = new Set();
    expenses.forEach(exp => {
      const date = new Date(exp.date.split('/').reverse().join('-'));
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  };

  const toggleSelectCategoryKey = (key) => {
    setSelectedCategoryKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const deleteSelectedCategories = async () => {
    if (selectedCategoryKeys.length === 0) return alert('Selecciona al menos una categoría para eliminar.');
    if (!confirm(`Eliminar ${selectedCategoryKeys.length} categoría(s)? Los gastos pasarán a "Otro".`)) return;
    const updatedCategories = { ...categories };
    selectedCategoryKeys.forEach(k => delete updatedCategories[k]);
    const updatedExpenses = expenses.map(exp => selectedCategoryKeys.includes(exp.category) ? { ...exp, category: 'Otro' } : exp);
    await persistExpenses(updatedExpenses);
    await persistCategories(updatedCategories);
    setSelectedCategoryKeys([]);
    setShowCategoryManager(false);
  };

  const reassignSelectedCategories = async (targetCategory) => {
    if (selectedCategoryKeys.length === 0) return alert('Selecciona al menos una categoría para reasignar.');
    if (!targetCategory || !categories[targetCategory]) return alert('Selecciona una categoría destino válida.');
    const updatedExpenses = expenses.map(exp => selectedCategoryKeys.includes(exp.category) ? { ...exp, category: targetCategory } : exp);
    const updatedCategories = { ...categories };
    selectedCategoryKeys.forEach(k => delete updatedCategories[k]);
    await persistExpenses(updatedExpenses);
    await persistCategories(updatedCategories);
    setSelectedCategoryKeys([]);
    setShowCategoryManager(false);
  };

  const renameSelectedCategory = async () => {
    if (selectedCategoryKeys.length !== 1) return alert('Selecciona exactamente 1 categoría para renombrar.');
    const oldName = selectedCategoryKeys[0];
    const newName = prompt('Nuevo nombre para la categoría', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    const updatedCategories = { ...categories };
    updatedCategories[newName] = updatedCategories[oldName] || [];
    delete updatedCategories[oldName];
    const updatedExpenses = expenses.map(exp => exp.category === oldName ? { ...exp, category: newName } : exp);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Cargando gastos...</p>
        </div>
      </div>
    );
  }

  const categoryData = getCategoryData();
  const personData = getPersonData();
  const monthlyData = getMonthlyData();
  const totalExpenses = getTotalExpenses();
  const filteredExpenses = getFilteredExpenses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-purple-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Gastos de Nicolás & Connie 💑
            </h1>
            <p className="text-gray-600 mt-2">Gestión inteligente de gastos compartidos</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {hasUnsavedChanges && (
              <button
                onClick={async () => {
                  await persistExpenses(expenses);
                  await persistCategories(categories);
                  setHasUnsavedChanges(false);
                  alert('✅ Cambios guardados correctamente');
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-all hover:shadow-lg"
              >
                <Save size={20} />
                Guardar Cambios
              </button>
            )}

            <button
              onClick={openManualExpenseModal}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:scale-105 transition-all"
            >
              <Plus size={20} />
              Agregar Gasto
            </button>

            <label className="relative">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all ${
                uploading
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105'
              }`}>
                <Upload size={20} />
                {uploading ? 'Procesando...' : 'Subir Extracto'}
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Gastado</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">€{totalExpenses.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <DollarSign className="text-purple-600" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Nicolás</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">€{(personData[0]?.value || 0).toFixed(2)}</p>
              </div>
              <div className="bg-pink-100 p-3 rounded-xl">
                <User className="text-pink-600" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Connie</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">€{(personData[1]?.value || 0).toFixed(2)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <User className="text-blue-600" size={32} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 gap-4">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <ListChecks size={18} />
            Gestionar Categorías
          </button>

          <p className="text-sm text-gray-600">Las categorías están disponibles en filtros — gestionalas desde aquí.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <h3 className="text-lg font-bold mb-4">Top 5 Categorías</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <h3 className="text-lg font-bold mb-4">Gastos Anuales (mensual)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <h3 className="text-lg font-bold mb-4">Gastos por Persona</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={personData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {personData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-purple-600" />
            <h3 className="text-lg font-bold text-gray-800">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {Object.keys(categories).sort().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filter.month}
              onChange={(e) => setFilter({ ...filter, month: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">📅 Todos los meses</option>
              {getAvailableMonths().map(month => {
                const [year, monthNum] = month.split('-');
                const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                return <option key={month} value={month}>{monthName}</option>;
              })}
            </select>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-purple-100">
            <Upload className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-600">Subí tu extracto de Santander para comenzar</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Lista de Gastos ({filteredExpenses.length})</h3>
                {selectedExpenses.length > 0 && (
                  <button
                    onClick={deleteSelectedExpenses}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                  >
                    <Trash2 size={16} />
                    Eliminar seleccionados
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-purple-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                          onChange={(e) => setSelectedExpenses(e.target.checked ? filteredExpenses.map(exp => exp.id) : [])}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Concepto</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoría</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Persona</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Monto</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={() => toggleSelectExpense(expense.id)}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{expense.date}</td>
                        <td className="py-3 px-4 text-sm text-gray-800 max-w-md truncate">{expense.concept}</td>
                        <td className="py-3 px-4">
                          {editingId === expense.id ? (
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="px-2 py-1 border border-purple-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                            >
                              {Object.keys(categories).sort().map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">{expense.category}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${expense.person === 'Nicolás' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>{expense.person}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-800">€{expense.amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          {editingId === expense.id ? (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => saveEdit(expense.id)} className="p-1 bg-green-600 text-white rounded hover:bg-green-700"><Save size={16} /></button>
                              <button onClick={cancelEdit} className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"><X size={16} /></button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => startEdit(expense)} className="p-1 text-purple-600 hover:bg-purple-100 rounded"><Edit2 size={16} /></button>
                              <button onClick={() => deleteExpense(expense.id)} className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {showCategoryManager && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowCategoryManager(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-3xl w-full z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Administración de Categorías</h3>
                <button onClick={() => setShowCategoryManager(false)} className="text-gray-500"><X size={18} /></button>
              </div>

              <p className="text-sm text-gray-600 mb-3">Selecciona categorías para acciones en bloque.</p>

              <div className="max-h-64 overflow-auto mb-4">
                <ul className="space-y-2">
                  {Object.keys(categories).sort().map(cat => (
                    <li key={cat} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedCategoryKeys.includes(cat)} onChange={() => toggleSelectCategoryKey(cat)} />
                        <span className="font-medium">{cat}</span>
                      </div>
                      <div className="text-sm text-gray-500">Gastos: {(expenses.filter(e => e.category === cat).length)}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Nueva categoría"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button onClick={addNewCategory} className="px-4 py-2 bg-green-600 text-white rounded">Añadir</button>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={renameSelectedCategory}
                  className={`px-3 py-2 rounded ${selectedCategoryKeys.length === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}
                  disabled={selectedCategoryKeys.length !== 1}
                >
                  Renombrar (1)
                </button>

                <ReassignControl
                  categories={categories}
                  selectedKeys={selectedCategoryKeys}
                  onReassign={reassignSelectedCategories}
                />

                <button onClick={deleteSelectedCategories} className="px-3 py-2 rounded bg-red-600 text-white">Eliminar seleccionadas</button>

                <button onClick={() => { setSelectedCategoryKeys([]); setShowCategoryManager(false); }} className="px-3 py-2 rounded bg-gray-300">Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {showManualExpenseModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowManualExpenseModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Agregar Gasto Manual</h3>
                <button onClick={() => setShowManualExpenseModal(false)} className="text-gray-500"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={manualExpense.date}
                    onChange={(e) => setManualExpense({ ...manualExpense, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej: Compra en supermercado"
                    value={manualExpense.concept}
                    onChange={(e) => setManualExpense({ ...manualExpense, concept: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={manualExpense.amount}
                    onChange={(e) => setManualExpense({ ...manualExpense, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={manualExpense.category}
                    onChange={(e) => setManualExpense({ ...manualExpense, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.keys(categories).sort().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
                  <select
                    value={manualExpense.person}
                    onChange={(e) => setManualExpense({ ...manualExpense, person: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="Nicolás">Nicolás</option>
                    <option value="Connie">Connie</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveManualExpense}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition-all"
                >
                  <Save size={20} />
                  Guardar Gasto
                </button>
                <button
                  onClick={() => setShowManualExpenseModal(false)}
                  className="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function ReassignControl({ categories, selectedKeys, onReassign }) {
  const [target, setTarget] = React.useState('');
  
  React.useEffect(() => {
    setTarget('');
  }, [selectedKeys]);

  const available = Object.keys(categories).filter(k => !selectedKeys.includes(k));
  
  return (
    <div className="flex items-center gap-2">
      <select value={target} onChange={(e) => setTarget(e.target.value)} className="px-3 py-2 border rounded">
        <option value="">Reasignar a...</option>
        {available.map(k => <option key={k} value={k}>{k}</option>)}
      </select>
      <button
        onClick={() => {
          if (!target) return alert('Selecciona una categoría destino.');
          if (selectedKeys.length === 0) return alert('Selecciona al menos una categoría origen.');
          if (!confirm(`¿Reasignar ${selectedKeys.length} categoría(s) a "${target}"?`)) return;
          onReassign(target);
        }}
        className="px-3 py-2 rounded bg-yellow-500 text-white"
      >
        Reasignar
      </button>
    </div>
  );
}

export default ExpenseTrackerApp; 