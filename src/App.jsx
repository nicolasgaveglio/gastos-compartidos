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
    return () => { if (realtimeSubRef.current) realtimeSubRef.current.unsubscribe() }
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
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
    } catch (err) { console.error('Error fetching expenses', err) }
    finally { setLoading(false) }
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
    } catch (err) { console.warn('Realtime may not be available', err) }
  }

  const categorizeExpense = (concept) => {
    const conceptLower = (concept || '').toLowerCase()
    for (const [category, keywords] of Object.entries(categories)) {
      if (category === 'Otro') continue
      for (const keyword of keywords) if (conceptLower.includes(keyword)) return category
    }
    return 'Otro'
  }

  const detectPerson = (concept, titular) => (concept || '').toLowerCase().includes('connie') ? 'Connie' : titular || 'Nicolás'

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
      if (headerRowIndex === -1) { alert('No se pudo encontrar el formato correcto del extracto de Santander'); setUploading(false); return }

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

      if (newExpenses.length === 0) { alert('No se detectaron nuevos gastos en el archivo'); setUploading(false); return }

      const { error } = await supabase.from('expenses').insert(newExpenses)
      if (error) { console.error('Error inserting to supabase', error); alert('Error al guardar en la base de datos') }
      else alert(`✅ ${newExpenses.length} gastos subidos correctamente`)
    } catch (err) { console.error('Error procesando archivo:', err); alert('Error al procesar el archivo. Asegúrate de que sea un extracto válido de Santander.') }
    finally { setUploading(false) }
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

  const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) parseExcel(file) }

  const startEdit = (expense) => { setEditingId(expense.id); setEditCategory(expense.category) }
  const cancelEdit = () => { setEditingId(null); setEditCategory('') }
  const saveEdit = async (expenseId) => {
    try {
      const updated = expenses.map(exp => exp.id === expenseId ? { ...exp, category: editCategory } : exp)
      setExpenses(updated); setEditingId(null); setEditCategory(''); setHasUnsavedChanges(true)
      const { error } = await supabase.from('expenses').update({ category: editCategory }).eq('id', expenseId)
      if (error) throw error
      setHasUnsavedChanges(false); alert('✅ Categoría actualizada')
    } catch (err) { console.error(err); alert('Error al actualizar categoría') }
  }

  const addNewCategory = () => {
    if (newCategoryName.trim() && !categories[newCategoryName.trim()]) {
      const updated = { ...categories, [newCategoryName.trim()]: [] }
      setCategories(updated); setNewCategoryName(''); setShowNewCategory(false); setHasUnsavedChanges(true)
    }
  }

  const getFilteredExpenses = () => expenses.filter(exp => {
    if (filter.person !== 'all' && exp.person !== filter.person) return false
    if (filter.category !== 'all' && exp.category !== filter.category) return false
    if (filter.month !== 'all') {
      const expDate = new Date(exp.date.split('/').reverse().join('-'))
      const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
      if (expMonth !== filter.month) return false
    }
    return true
  })

  const getCategoryData = () => {
    const filtered = getFilteredExpenses()
    const categoryTotals = {}
    filtered.forEach(exp => { categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount })
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
      {/* Tu JSX aquí... */}
      {/* Todo tu código de renderización que compartiste se mantiene igual */}
    </div>
  )
}
