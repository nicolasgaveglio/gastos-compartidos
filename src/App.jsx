\
import React, { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import * as XLSX from 'xlsx'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { Upload, DollarSign, User, Filter, Edit2, Plus, Save, X } from 'lucide-react'

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
  'Salir a almorzar/cenar': ['restaurante', 'bar ', 'popis', 'fornet', 'canigo', 'bonastre', 'bravas', 'foix', 'pedreta', 'pren algo'],
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
}

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316']

export default function ExpenseTrackerApp() {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState({ person: 'all', category: 'all', month: 'all' })
  const [editingId, setEditingId] = useState(null)
  const [editCategory, setEditCategory] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [selectedChartCategory, setSelectedChartCategory] = useState('all')
  const realtimeSubRef = useRef(null)

  useEffect(() => {
    fetchExpenses()
    subscribeRealtime()
    return () => {
      if (realtimeSubRef.current) realtimeSubRef.current.unsubscribe()
    }
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      const normalized = data.map(d => ({
        ...d,
        id: d.id,
        date: d.date ? new Date(d.date).toLocaleDateString('es-ES') : '',
        concept: d.concept,
        amount: parseFloat(d.amount),
        category: d.category || 'Otro',
        person: d.person || 'Nicolás'
      }))
      setExpenses(normalized)
    } catch (err) {
      console.error('Error fetching expenses', err)
    } finally {
      setLoading(false)
    }
  }

  const subscribeRealtime = () => {
    try {
      const sub = supabase
        .channel('public:expenses')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses' }, payload => {
          const d = payload.new
          const item = {
            id: d.id,
            date: d.date ? new Date(d.date).toLocaleDateString('es-ES') : '',
            concept: d.concept,
            amount: parseFloat(d.amount),
            category: d.category || 'Otro',
            person: d.person || 'Nicolás'
          }
          setExpenses(prev => [item, ...prev])
        })
        .subscribe()

      realtimeSubRef.current = sub
    } catch (err) {
      console.warn('Realtime may not be available', err)
    }
  }

  const categorizeExpense = (concept) => {
    const conceptLower = (concept || '').toLowerCase()
    for (const [category, keywords] of Object.entries(categories)) {
      if (category === 'Otro') continue
      for (const keyword of keywords) {
        if (conceptLower.includes(keyword)) return category
      }
    }
    return 'Otro'
  }

  const detectPerson = (concept, titular) => {
    if ((concept || '').toLowerCase().includes('connie')) return 'Connie'
    return titular || 'Nicolás'
  }

  const parseExcel = async (file) => {
    setUploading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      let headerRowIndex = -1
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i].includes('FECHA OPERACIÓN') || jsonData[i].includes('CONCEPTO')) {
          headerRowIndex = i
          break
        }
      }

      if (headerRowIndex === -1) {
        alert('No se pudo encontrar el formato correcto del extracto de Santander')
        setUploading(false)
        return
      }

      let titular = 'Nicolás'
      for (let i = 0; i < headerRowIndex; i++) {
        const row = jsonData[i]
        if (row.includes('Titular') && i + 1 < jsonData.length) {
          const nextRow = jsonData[i + 1]
          if (nextRow[2]) titular = nextRow[2].includes('CONNIE') ? 'Connie' : 'Nicolás'
        }
      }

      const newExpenses = []
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row[0] || !row[2] || !row[3]) continue
        const amount = Math.abs(parseFloat(row[3]))
        if (amount === 0 || isNaN(amount)) continue
        const concept = String(row[2])
        if (parseFloat(row[3]) >= 0) continue
        const expense = {
          date: formatDateForDB(row[0]),
          concept: concept,
          amount: amount,
          category: categorizeExpense(concept),
          person: detectPerson(concept, titular)
        }
        newExpenses.push(expense)
      }

      if (newExpenses.length === 0) {
        alert('No se detectaron nuevos gastos en el archivo')
        setUploading(false)
        return
      }

      const { error } = await supabase
        .from('expenses')
        .insert(newExpenses)

      if (error) {
        console.error('Error inserting to supabase', error)
        alert('Error al guardar en la base de datos')
      } else {
        alert(`✅ ${newExpenses.length} gastos subidos correctamente`)
      }
    } catch (err) {
      console.error('Error procesando archivo:', err)
      alert('Error al procesar el archivo. Asegúrate de que sea un extracto válido de Santander.')
    } finally {
      setUploading(false)
    }
  }

  const formatDateForDB = (input) => {
    if (!input) return null
    if (input instanceof Date) return input.toISOString().split('T')[0]
    const s = String(input).trim()
    if (s.includes('/')) {
      const [d, m, y] = s.split('/')
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const d = new Date(s)
    return isNaN(d) ? null : d.toISOString().split('T')[0]
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) parseExcel(file)
  }

  const startEdit = (expense) => {
    setEditingId(expense.id)
    setEditCategory(expense.category)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCategory('')
  }

  const saveEdit = async (expenseId) => {
    try {
      const updated = expenses.map(exp => exp.id === expenseId ? { ...exp, category: editCategory } : exp)
      setExpenses(updated)
      setEditingId(null)
      setEditCategory('')
      setHasUnsavedChanges(true)

      const { error } = await supabase
        .from('expenses')
        .update({ category: editCategory })
        .eq('id', expenseId)

      if (error) throw error
      setHasUnsavedChanges(false)
      alert('✅ Categoría actualizada')
    } catch (err) {
      console.error(err)
      alert('Error al actualizar categoría')
    }
  }

  const addNewCategory = () => {
    if (newCategoryName.trim() && !categories[newCategoryName.trim()]) {
      const updated = { ...categories, [newCategoryName.trim()]: [] }
      setCategories(updated)
      setNewCategoryName('')
      setShowNewCategory(false)
      setHasUnsavedChanges(true)
    }
  }

  const getFilteredExpenses = () => {
    return expenses.filter(exp => {
      if (filter.person !== 'all' && exp.person !== filter.person) return false
      if (filter.category !== 'all' && exp.category !== filter.category) return false
      if (filter.month !== 'all') {
        const expDate = new Date(exp.date.split('/').reverse().join('-'))
        const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
        if (expMonth !== filter.month) return false
      }
      return true
    })
  }

  const getCategoryData = () => {
    const filtered = getFilteredExpenses()
    const categoryTotals = {}
    filtered.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount
    })
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) })).sort((a,b)=>b.value-a.value)
  }

  const getMonthlyData = () => {
    const monthlyTotals = {}
    expenses.forEach(exp => {
      if (filter.person !== 'all' && exp.person !== filter.person) return
      if (selectedChartCategory !== 'all' && exp.category !== selectedChartCategory) return
      const date = new Date(exp.date.split('/').reverse().join('-'))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + exp.amount
    })
    return Object.entries(monthlyTotals).sort((a,b)=>a[0].localeCompare(b[0])).map(([month,total])=>{
      const [year,monthNum] = month.split('-')
      const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-ES', { month: 'short' })
      return { month: `${monthName} ${year}`, total: parseFloat(total.toFixed(2)) }
    })
  }

  const getPersonData = () => {
    const filtered = getFilteredExpenses()
    const personTotals = { 'Nicolás': 0, 'Connie': 0 }
    filtered.forEach(exp => { personTotals[exp.person] = (personTotals[exp.person] || 0) + exp.amount })
    return [ { name: 'Nicolás', value: parseFloat(personTotals['Nicolás'].toFixed(2)) }, { name: 'Connie', value: parseFloat(personTotals['Connie'].toFixed(2)) } ]
  }

  const getTotalExpenses = () => getFilteredExpenses().reduce((sum, exp) => sum + exp.amount, 0)

  const getAvailableMonths = () => {
    const months = new Set()
    expenses.forEach(exp => {
      const date = new Date(exp.date.split('/').reverse().join('-'))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.add(monthKey)
    })
    return Array.from(months).sort().reverse()
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Cargando gastos...</p>
      </div>
    </div>
  )

  const categoryData = getCategoryData()
  const personData = getPersonData()
  const totalExpenses = getTotalExpenses()
  const filteredExpenses = getFilteredExpenses()
  const monthlyData = getMonthlyData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-purple-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Gastos de Nicolás & Connie 💑</h1>
              <p className="text-gray-600 mt-2">Gestión inteligente de gastos compartidos</p>
            </div>
            <div className="flex gap-3">
              {hasUnsavedChanges && (
                <button onClick={() => {}} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-all hover:shadow-lg">
                  <Save size={20} />
                  Guardar Cambios
                </button>
              )}
              <label className="relative">
                <input type="file" accept=".xls,.xlsx,.csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                <div className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all ${uploading ? 'bg-gray-300 text-gray-500' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105'}`}>
                  <Upload size={20} />
                  {uploading ? 'Procesando...' : 'Subir Extracto'}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Gastado</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">€{totalExpenses.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl"><DollarSign className="text-purple-600" size={32} /></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Nicolás</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">€{personData[0].value.toFixed(2)}</p>
              </div>
              <div className="bg-pink-100 p-3 rounded-xl"><User className="text-pink-600" size={32} /></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Connie</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">€{personData[1].value.toFixed(2)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl"><User className="text-blue-600" size={32} /></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Gestionar Categorías</h3>
            <button onClick={() => setShowNewCategory(!showNewCategory)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium"><Plus size={16} /> Nueva Categoría</button>
          </div>

          {showNewCategory && (
            <div className="flex gap-2 mb-4">
              <input type="text" value={newCategoryName} onChange={(e)=>setNewCategoryName(e.target.value)} placeholder="Nombre de la nueva categoría..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              <button onClick={addNewCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all">Añadir</button>
              <button onClick={()=>{setShowNewCategory(false); setNewCategoryName('')}} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"><X size={20} /></button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.keys(categories).sort().map(cat => (
              <div key={cat} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium text-center">{cat}</div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-100">
          <div className="flex items-center gap-2 mb-4"><Filter size={20} className="text-purple-600" /><h3 className="text-lg font-bold text-gray-800">Filtros</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={filter.person} onChange={(e)=>setFilter({...filter, person: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="all">👥 Ambos</option>
              <option value="Nicolás">👤 Nicolás</option>
              <option value="Connie">👤 Connie</option>
            </select>

            <select value={filter.category} onChange={(e)=>setFilter({...filter, category: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="all">📂 Todas las categorías</option>
              {Object.keys(categories).sort().map(cat => (<option key={cat} value={cat}>{cat}</option>))}
            </select>

            <select value={filter.month} onChange={(e)=>setFilter({...filter, month: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="all">📅 Todos los meses</option>
              {getAvailableMonths().map(month => {
                const [year, monthNum] = month.split('-')
                const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                return <option key={month} value={month}>{monthName}</option>
              })}
            </select>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-purple-100">
            <Upload className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">¡Empezá a cargar gastos!</h3>
            <p className="text-gray-600">Subí tu extracto de Santander para comenzar a visualizar vuestros gastos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Evolución Mensual</h3>
                  <select value={selectedChartCategory} onChange={(e)=>setSelectedChartCategory(e.target.value)} className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"><option value="all">📊 Todos los gastos</option>{Object.keys(categories).sort().map(cat=>(<option key={cat} value={cat}>{cat}</option>))}</select>
                </div>
                <ResponsiveContainer width="100%" height={280}><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" angle={-45} textAnchor="end" height={80} /><YAxis /><Tooltip formatter={(value)=>`€${value.toFixed(2)}`} /><Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 5 }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Top Categorías</h3>
                <ResponsiveContainer width="100%" height={300}><BarChart data={categoryData.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} /><YAxis /><Tooltip formatter={(value)=>`€${value.toFixed(2)}`} /><Bar dataKey="value" fill="#8b5cf6" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Lista de Gastos ({filteredExpenses.length})</h3>
              <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b-2 border-purple-100"><th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Concepto</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Categoría</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Persona</th><th className="text-right py-3 px-4 font-semibold text-gray-700">Monto</th><th className="text-center py-3 px-4 font-semibold text-gray-700">Acción</th></tr></thead><tbody>{filteredExpenses.map((expense)=>(<tr key={expense.id} className="border-b border-gray-100 hover:bg-purple-50 transition-colors"><td className="py-3 px-4 text-sm text-gray-600">{expense.date}</td><td className="py-3 px-4 text-sm text-gray-800 max-w-md truncate">{expense.concept}</td><td className="py-3 px-4">{editingId===expense.id?(<select value={editCategory} onChange={(e)=>setEditCategory(e.target.value)} className="px-2 py-1 border border-purple-300 rounded text-xs focus:ring-2 focus:ring-purple-500">{Object.keys(categories).sort().map(cat=>(<option key={cat} value={cat}>{cat}</option>))}</select>):(<span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">{expense.category}</span>)}</td><td className="py-3 px-4"><span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${expense.person==='Nicolás'?'bg-pink-100 text-pink-700':'bg-blue-100 text-blue-700'}`}>{expense.person}</span></td><td className="py-3 px-4 text-right font-semibold text-gray-800">€{expense.amount.toFixed(2)}</td><td className="py-3 px-4 text-center">{editingId===expense.id?(<div className="flex gap-2 justify-center"><button onClick={()=>saveEdit(expense.id)} className="p-1 bg-green-600 text-white rounded hover:bg-green-700"><Save size={16} /></button><button onClick={cancelEdit} className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"><X size={16} /></button></div>):(<button onClick={()=>startEdit(expense)} className="p-1 text-purple-600 hover:bg-purple-100 rounded"><Edit2 size={16} /></button>)}</td></tr>))}</tbody></table></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
