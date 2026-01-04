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
} from 'recharts';
import { Upload, DollarSign, User, Filter, Edit2, Plus, Save, X, Trash2, ListChecks, LogOut } from 'lucide-react';
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
  'Muebles/Electrodomésticos/Cocina': ['ikea', 'leroy', 'media markt', 'worten', 'el corte ingles'],
  'Transporte público': ['tmb', 't mobilitat', 'renfe', 'metro', 'bus'],
  Bicing: ['bicing'],
  'Uber/taxi': ['uber', 'taxi', 'cabify', 'bolt', 'yego'],
  Supermercado: [
    'mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'caprabo', 'bonpreu', 
    'condis', 'supermercat', 'kachafruit', 'greensland', 'cash and carry',
  ],
  Suplementos: ['suplemento', 'proteina', 'vitamina', 'myprotein'],
  Salidas: ['restaurante', 'bar ', 'popis', 'fornet', 'canigo', 'bonastre', 'bravas', 'foix', 'pedreta', 'pren algo'],
  Ropa: ['zara', 'h&m', 'mango', 'pull&bear', 'bershka', 'stradivarius', 'oysho', 'massimo dutti', 'uniqlo'],
  Limpieza: ['limpieza', 'detergente', 'lejia'],
  'Peluquería/Barbería': ['peluqueria', 'barberia', 'salon', 'corte pelo'],
  Educación: ['universidad', 'curso', 'academia', 'escuela', 'nuclio', 'udemy', 'coursera'],
  'Plataformas (Netflix/Amazon/Adobe/Spotify/Microsoft)': [
    'netflix', 'amazon prime', 'spotify', 'adobe', 'microsoft', 'disney', 'hbo', 'apple',
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

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
const ExpenseTrackerApp = () => {
  // Estado de autenticación
  const [user, setUser] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Estado de datos
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtros
  const [filter, setFilter] = useState({ person: 'all', category: 'all', month: 'all' });

  // Edición
  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState('');

  // Gestión de categorías
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState([]);

  // Selección múltiple
  const [selectedExpenses, setSelectedExpenses] = useState([]);

  // Modal gasto manual
  const [showManualExpenseModal, setShowManualExpenseModal] = useState(false);
  const [manualExpense, setManualExpense] = useState({
    date: new Date().toLocaleDateString('es-ES'),
    concept: '',
    amount: '',
    category: 'Otro',
    person: 'Nicolás',
  });

  // =====================================================
  // AUTENTICACIÓN
  // =====================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setUser(session?.user ?? null);
      
      if (!session) {
        setExpenses([]);
        setGroupId(null);
        setIsInitialized(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // =====================================================
  // CARGAR GRUPO DEL USUARIO
  // =====================================================
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadUserGroup = async () => {
      try {
        console.log('🔍 Buscando grupo para usuario:', user.id);
        
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, name')
          .contains('user_ids', [user.id])
          .single();

        if (groupError && groupError.code !== 'PGRST116') {
          console.error('Error buscando grupo:', groupError);
          throw groupError;
        }

        if (groupData) {
          console.log('✅ Grupo encontrado:', groupData);
          setGroupId(groupData.id);
        } else {
          console.log('📝 Creando nuevo grupo...');
          const { data: newGroup, error: createError } = await supabase
            .from('groups')
            .insert({
              name: `Grupo de ${user.email?.split('@')[0] || 'Usuario'}`,
              user_ids: [user.id],
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Error creando grupo:', createError);
            throw createError;
          }

          console.log('✅ Grupo creado:', newGroup);
          setGroupId(newGroup.id);
        }
      } catch (error) {
        console.error('❌ Error en loadUserGroup:', error);
        alert('Error cargando tu grupo. Por favor recarga la página.');
      }
    };

    loadUserGroup();
  }, [user]);

  // =====================================================
  // CARGAR DATOS CUANDO groupId ESTÁ LISTO
  // =====================================================
  useEffect(() => {
    if (!user || groupId === null) return;

    const loadData = async () => {
      setLoading(true);
      
      try {
        console.log('📊 Cargando gastos para grupo:', groupId);
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('group_id', groupId)
          .order('date', { ascending: false });

        if (expensesError) {
          console.error('Error cargando gastos:', expensesError);
        } else {
          console.log('✅ Gastos cargados:', expensesData?.length || 0);
          setExpenses(expensesData || []);
        }

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('categories')
          .eq('group_id', groupId)
          .single();

        if (categoriesData?.categories) {
          setCategories({ ...DEFAULT_CATEGORIES, ...categoriesData.categories });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, groupId]);

  // =====================================================
  // FUNCIONES DE AUTENTICACIÓN
  // =====================================================
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin + window.location.pathname
      },
    });
    if (error) {
      console.error('Error en login:', error);
      alert('Error al iniciar sesión: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // =====================================================
  // FUNCIONES DE PERSISTENCIA
  // =====================================================
  const saveExpenseToDb = async (expense) => {
    if (!user || groupId === null) {
      console.error('❌ No hay usuario o grupo');
      alert('Error: Debes estar logueado y tener un grupo asignado');
      return null;
    }

    setSaving(true);
    
    try {
      const expenseData = {
        group_id: groupId,
        user_id: user.id,
        date: expense.date,
        concept: expense.concept,
        amount: parseFloat(expense.amount),
        category: expense.category,
        person: expense.person,
      };

      console.log('💾 Guardando gasto:', expenseData);

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error guardando:', error);
        alert(`Error guardando gasto: ${error.message}`);
        return null;
      }

      console.log('✅ Gasto guardado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      alert(`Error inesperado: ${error.message}`);
      return null;
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

      if (error) {
        console.error('❌ Error actualizando:', error);
        alert(`Error actualizando gasto: ${error.message}`);
        return null;
      }

      return data;
    } finally {
      setSaving(false);
    }
  };

  const deleteExpenseFromDb = async (id) => {
    if (!user || groupId === null) return false;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('group_id', groupId);

      if (error) {
        console.error('❌ Error eliminando:', error);
        alert(`Error eliminando gasto: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      return false;
    }
  };

  const saveCategoriestoDb = async (newCategories) => {
    if (!groupId) return;

    try {
      const { error } = await supabase
        .from('categories')
        .upsert([{ 
          group_id: groupId, 
          categories: newCategories 
        }], { 
          onConflict: 'group_id' 
        });

      if (error) {
        console.error('Error guardando categorías:', error);
        alert(`Error guardando categorías: ${error.message}`);
      } else {
        setCategories(newCategories);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
    }
  };

  // =====================================================
  // FUNCIONES DE CATEGORIZACIÓN
  // =====================================================
  const categorizeExpense = useCallback((concept) => {
    const conceptLower = concept.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (category === 'Otro') continue;
      for (const keyword of keywords) {
        if (conceptLower.includes(keyword)) return category;
      }
    }
    return 'Otro';
  }, [categories]);

  const detectPerson = (concept, titular) => {
    if (concept.toLowerCase().includes('connie')) return 'Connie';
    return titular || 'Nicolás';
  };

  // =====================================================
  // MANEJO DE ARCHIVOS EXCEL - SANTANDER Y BBVA
  // =====================================================
  const parseExcel = async (file) => {
    if (!user || groupId === null) {
      alert('Error: Debes estar logueado');
      return;
    }

    setUploading(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true, cellNF: true, cellStyles: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // =====================================================
      // DETECTAR TIPO DE BANCO
      // =====================================================
      let bankType = 'UNKNOWN';
      let headerRowIndex = -1;

      for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
        const row = jsonData[i];
        const rowStr = row.map(cell => String(cell).toUpperCase()).join(' ');
        
        // Detectar Santander: tiene "FECHA OPERACIÓN" o "IMPORTE EUR"
        if (rowStr.includes('FECHA OPERACIÓN') || rowStr.includes('IMPORTE EUR')) {
          bankType = 'SANTANDER';
          headerRowIndex = i;
          break;
        }
        
        // Detectar BBVA: tiene "F.VALOR" o ("CONCEPTO" y "MOVIMIENTO")
        if (rowStr.includes('F.VALOR') || rowStr.includes('F. VALOR') ||
            (rowStr.includes('CONCEPTO') && rowStr.includes('MOVIMIENTO'))) {
          bankType = 'BBVA';
          headerRowIndex = i;
          break;
        }
      }

      // Fallback: buscar cualquier fila con FECHA/CONCEPTO/IMPORTE
      if (headerRowIndex === -1) {
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.some(cell => 
            String(cell).toUpperCase().includes('FECHA') || 
            String(cell).toUpperCase().includes('CONCEPTO') ||
            String(cell).toUpperCase().includes('IMPORTE')
          )) {
            headerRowIndex = i;
            bankType = 'SANTANDER';
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        alert('No se pudo detectar el formato del extracto bancario.\nFormatos soportados: Santander, BBVA');
        setUploading(false);
        return;
      }

      console.log(`📊 Banco detectado: ${bankType}, Header en fila: ${headerRowIndex}`);

      // =====================================================
      // DETECTAR TITULAR
      // =====================================================
      let titular = 'Nicolás';
      for (let i = 0; i < headerRowIndex; i++) {
        const row = jsonData[i];
        const rowStr = row.join(' ').toUpperCase();
        if (rowStr.includes('CONNIE') || rowStr.includes('LAURA') || rowStr.includes('AGUSTINA')) {
          titular = 'Connie';
          break;
        }
      }

      // =====================================================
      // PROCESAR SEGÚN TIPO DE BANCO
      // =====================================================
      const newExpenses = [];

      if (bankType === 'SANTANDER') {
        // SANTANDER: Columnas = [FECHA OPERACIÓN, FECHA VALOR, CONCEPTO, IMPORTE EUR, SALDO]
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[0] || !row[2] || row[3] === undefined) continue;

          const amountRaw = parseFloat(String(row[3]).replace(',', '.'));
          if (isNaN(amountRaw) || amountRaw >= 0) continue;

          const amount = Math.abs(amountRaw);
          const concept = String(row[2]).trim();

          let dateStr = row[0];
          if (dateStr instanceof Date) {
            dateStr = dateStr.toLocaleDateString('es-ES');
          } else if (typeof dateStr === 'number') {
            const date = new Date((dateStr - 25569) * 86400 * 1000);
            dateStr = date.toLocaleDateString('es-ES');
          }

          newExpenses.push({
            date: dateStr,
            concept,
            amount,
            category: categorizeExpense(concept),
            person: detectPerson(concept, titular),
          });
        }

      } else if (bankType === 'BBVA') {
        // BBVA: Columnas = [F.Valor(0), Fecha(1), Concepto(2), Movimiento(3), Importe(4), Divisa(5), Observaciones(6)]
        // Nota: NO hay columna vacía al inicio en este formato
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // F.Valor está en columna 0, Fecha en columna 1
          const fValorCell = row[0];
          const fechaCell = row[1];
          const dateCell = fValorCell || fechaCell;
          
          // Concepto en columna 2, Movimiento en columna 3, Importe en columna 4
          const conceptoCell = String(row[2] || '').trim();
          const movimientoCell = String(row[3] || '').trim();
          let importeCell = row[4];
          
          if (!dateCell || !conceptoCell) continue;
          
          // Saltar mensajes informativos
          const skipKeywords = [
            'extracto', 'actualiza', 'términos', 'condiciones', 
            'plan 760', 'ya tienes tu', 'últimos movimientos'
          ];
          if (skipKeywords.some(kw => conceptoCell.toLowerCase().includes(kw))) {
            continue;
          }
          
          // Saltar transferencias enviadas (pero permitir "Transferencia realizada")
          if (conceptoCell.toLowerCase().includes('transferencia') && 
              conceptoCell.toLowerCase().includes('enviada')) {
            continue;
          }

          // Extraer monto de columna Importe (4)
          let amount = 0;
          if (importeCell !== undefined && importeCell !== null && importeCell !== '') {
            // Si XLSX ya lo parseó como número, usarlo directamente
            if (typeof importeCell === 'number') {
              amount = importeCell;
            } else {
              // Si es string, manejar formato español: -33,36 o 1.234,56
              let amountStr = String(importeCell).replace(/\s/g, '');
              // Solo quitar puntos si hay coma (formato español con miles)
              if (amountStr.includes(',')) {
                amountStr = amountStr.replace(/\./g, '').replace(',', '.');
              }
              amount = parseFloat(amountStr);
            }
          }
          
          if (isNaN(amount)) continue;
          
          // En BBVA los gastos vienen como negativos (-33,36)
          // Solo procesar si es negativo (gasto)
          if (amount >= 0) continue;
          
          amount = Math.abs(amount);
          if (amount <= 0) continue;

          let dateStr = dateCell;
          if (dateCell instanceof Date) {
            dateStr = dateCell.toLocaleDateString('es-ES');
          } else if (typeof dateCell === 'number') {
            const date = new Date((dateCell - 25569) * 86400 * 1000);
            dateStr = date.toLocaleDateString('es-ES');
          }

          // Limpiar concepto
          let concept = conceptoCell
            .replace(/(-?\d+[.,]?\d*)\s*€?\s*$/, '')
            .replace(/adeudo de/i, '')
            .trim();
          
          if (concept.length < 3) {
            concept = conceptoCell;
          }

          newExpenses.push({
            date: dateStr,
            concept,
            amount,
            category: categorizeExpense(concept),
            person: detectPerson(concept, titular),
          });
        }
      }

      // =====================================================
      // VALIDAR Y GUARDAR
      // =====================================================
      if (newExpenses.length === 0) {
        alert(`No se encontraron gastos en el archivo (${bankType}).\nVerifica que el extracto tenga movimientos.`);
        setUploading(false);
        return;
      }

      console.log(`✅ ${newExpenses.length} gastos encontrados de ${bankType}`);

      // Filtrar duplicados
      const existingKeys = new Set(
        expenses.map(e => `${e.date}-${e.concept}-${e.amount}`)
      );
      
      const uniqueNew = newExpenses.filter(
        e => !existingKeys.has(`${e.date}-${e.concept}-${e.amount}`)
      );

      if (uniqueNew.length === 0) {
        alert('Todos los gastos del archivo ya existen');
        setUploading(false);
        return;
      }

      // Insertar en lote
      console.log(`💾 Insertando ${uniqueNew.length} gastos nuevos...`);
      
      const expensesToInsert = uniqueNew.map(exp => ({
        group_id: groupId,
        user_id: user.id,
        date: exp.date,
        concept: exp.concept,
        amount: exp.amount,
        category: exp.category,
        person: exp.person,
      }));

      const { data: insertedData, error } = await supabase
        .from('expenses')
        .insert(expensesToInsert)
        .select();

      if (error) {
        console.error('Error insertando gastos:', error);
        alert(`Error guardando gastos: ${error.message}`);
        return;
      }

      // Actualizar estado local
      const updatedExpenses = [...insertedData, ...expenses].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return dateB.localeCompare(dateA);
      });

      setExpenses(updatedExpenses);
      alert(`✅ ${uniqueNew.length} nuevos gastos añadidos (${bankType})`);

    } catch (error) {
      console.error('Error procesando archivo:', error);
      alert('Error al procesar el archivo. Asegúrate de que sea un extracto válido.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcel(file);
      e.target.value = '';
    }
  };

  // =====================================================
  // MANEJO DE GASTOS MANUALES
  // =====================================================
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
    if (!manualExpense.concept.trim()) {
      alert('Ingresa una descripción');
      return;
    }
    if (!manualExpense.amount || parseFloat(manualExpense.amount) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    const savedExpense = await saveExpenseToDb(manualExpense);
    
    if (savedExpense) {
      const updatedExpenses = [savedExpense, ...expenses].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return dateB.localeCompare(dateA);
      });
      
      setExpenses(updatedExpenses);
      setShowManualExpenseModal(false);
      alert('✅ Gasto agregado correctamente');
    }
  };

  // =====================================================
  // EDICIÓN DE GASTOS
  // =====================================================
  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditCategory(expense.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCategory('');
  };

  const saveEdit = async (expenseId) => {
    const updated = await updateExpenseInDb(expenseId, { category: editCategory });
    
    if (updated) {
      setExpenses(expenses.map(exp => 
        exp.id === expenseId ? { ...exp, category: editCategory } : exp
      ));
    }
    
    setEditingId(null);
    setEditCategory('');
  };

  // =====================================================
  // ELIMINACIÓN DE GASTOS
  // =====================================================
  const deleteExpense = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;

    const success = await deleteExpenseFromDb(id);
    if (success) {
      setExpenses(expenses.filter(exp => exp.id !== id));
    }
  };

  const deleteSelectedExpenses = async () => {
    if (selectedExpenses.length === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedExpenses.length} gasto(s)?`)) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', selectedExpenses)
        .eq('group_id', groupId);

      if (error) {
        console.error('Error eliminando gastos:', error);
        alert(`Error: ${error.message}`);
        return;
      }

      setExpenses(expenses.filter(exp => !selectedExpenses.includes(exp.id)));
      setSelectedExpenses([]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleSelectExpense = (id) => {
    setSelectedExpenses(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  // =====================================================
  // GESTIÓN DE CATEGORÍAS
  // =====================================================
  const toggleSelectCategoryKey = (key) => {
    setSelectedCategoryKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const addNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert('Escribe un nombre válido');
      return;
    }
    if (categories[name]) {
      alert('Ya existe esa categoría');
      return;
    }

    const updated = { ...categories, [name]: [] };
    await saveCategoriestoDb(updated);
    setNewCategoryName('');
  };

  const renameSelectedCategory = async () => {
    if (selectedCategoryKeys.length !== 1) {
      alert('Selecciona exactamente 1 categoría para renombrar');
      return;
    }

    const oldName = selectedCategoryKeys[0];
    const newName = window.prompt('Nuevo nombre para la categoría', oldName);
    
    if (!newName || newName.trim() === '' || newName === oldName) return;

    const updatedCategories = { ...categories };
    updatedCategories[newName] = updatedCategories[oldName] || [];
    delete updatedCategories[oldName];

    const updatedExpenses = expenses.map(exp =>
      exp.category === oldName ? { ...exp, category: newName } : exp
    );

    const expensesToUpdate = expenses.filter(exp => exp.category === oldName);
    if (expensesToUpdate.length > 0) {
      await supabase
        .from('expenses')
        .update({ category: newName })
        .in('id', expensesToUpdate.map(e => e.id));
    }

    await saveCategoriestoDb(updatedCategories);
    setExpenses(updatedExpenses);
    setSelectedCategoryKeys([]);
    setShowCategoryManager(false);
  };

  const deleteSelectedCategories = async () => {
    if (selectedCategoryKeys.length === 0) {
      alert('Selecciona al menos una categoría para eliminar');
      return;
    }
    
    if (!window.confirm(`¿Eliminar ${selectedCategoryKeys.length} categoría(s)? Los gastos pasarán a "Otro".`)) {
      return;
    }

    const updatedCategories = { ...categories };
    selectedCategoryKeys.forEach(k => delete updatedCategories[k]);

    const expensesToUpdate = expenses.filter(exp => selectedCategoryKeys.includes(exp.category));
    if (expensesToUpdate.length > 0) {
      await supabase
        .from('expenses')
        .update({ category: 'Otro' })
        .in('id', expensesToUpdate.map(e => e.id));
    }

    const updatedExpenses = expenses.map(exp =>
      selectedCategoryKeys.includes(exp.category) ? { ...exp, category: 'Otro' } : exp
    );

    await saveCategoriestoDb(updatedCategories);
    setExpenses(updatedExpenses);
    setSelectedCategoryKeys([]);
    setShowCategoryManager(false);
  };

  // =====================================================
  // FILTROS Y DATOS PARA GRÁFICOS
  // =====================================================
  const getFilteredExpenses = useCallback(() => {
    return expenses.filter(exp => {
      if (filter.person !== 'all' && exp.person !== filter.person) return false;
      if (filter.category !== 'all' && exp.category !== filter.category) return false;
      if (filter.month !== 'all') {
        const parts = exp.date.split('/');
        if (parts.length === 3) {
          const expMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;
          if (expMonth !== filter.month) return false;
        }
      }
      return true;
    });
  }, [expenses, filter]);

  const getCategoryData = () => {
    const filtered = getFilteredExpenses();
    const categoryTotals = {};
    filtered.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + Number(exp.amount);
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
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

    return Object.entries(monthlyTotals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => {
        const [year, m] = month.split('-');
        const monthName = new Date(year, parseInt(m) - 1).toLocaleDateString('es-ES', { month: 'short' });
        return { month: `${monthName} ${year}`, total: parseFloat(total.toFixed(2)) };
      });
  };

  const getPersonData = () => {
    const filtered = getFilteredExpenses();
    const personTotals = { 'Nicolás': 0, 'Connie': 0 };
    filtered.forEach(exp => {
      if (personTotals.hasOwnProperty(exp.person)) {
        personTotals[exp.person] += Number(exp.amount);
      }
    });
    return [
      { name: 'Nicolás', value: parseFloat(personTotals['Nicolás'].toFixed(2)) },
      { name: 'Connie', value: parseFloat(personTotals['Connie'].toFixed(2)) },
    ];
  };

  const getTotalExpenses = () => {
    return getFilteredExpenses().reduce((sum, e) => sum + Number(e.amount), 0);
  };

  const getAvailableMonths = () => {
    const months = new Set();
    expenses.forEach(exp => {
      const parts = exp.date.split('/');
      if (parts.length === 3) {
        months.add(`${parts[2]}-${parts[1].padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  };

  // =====================================================
  // RENDER: PANTALLA DE CARGA
  // =====================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando gastos...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: PANTALLA DE LOGIN
  // =====================================================
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border border-purple-100">
          <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Gastos Compartidos 💑
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            Inicia sesión para gestionar tus gastos
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg"
          >
            <User className="w-5 h-5" /> 
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: APLICACIÓN PRINCIPAL
  // =====================================================
  const categoryData = getCategoryData();
  const personData = getPersonData();
  const monthlyData = getMonthlyData();
  const totalExpenses = getTotalExpenses();
  const filteredExpenses = getFilteredExpenses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        
        {/* Header */}
        <header className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-purple-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Gastos de Nicolás & Connie 💑
              </h1>
              <p className="text-gray-600 mt-1">
                Gestión inteligente de gastos compartidos
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Acciones */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <button
            onClick={openManualExpenseModal}
            disabled={saving || !isInitialized}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg transition-all font-semibold disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Agregar Gasto
          </button>

          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || !isInitialized}
            />
            <div className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              uploading || !isInitialized
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
            }`}>
              <Upload className="w-4 h-4" />
              {uploading ? 'Procesando...' : 'Subir Extracto'}
            </div>
          </label>

          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-all font-medium ml-auto"
          >
            <ListChecks className="w-4 h-4" />
            Gestionar Categorías
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Gastado</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">€{totalExpenses.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <DollarSign className="text-purple-600 w-8 h-8" />
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
                <User className="text-pink-600 w-8 h-8" />
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
                <User className="text-blue-600 w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <h3 className="font-bold mb-4 text-gray-800">Top 5 Categorías</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <h3 className="font-bold mb-4 text-gray-800">Gastos Mensuales</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, '']} />
                  <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <h3 className="font-bold mb-4 text-gray-800">Gastos por Persona</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={personData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: €${value}`}
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
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-100">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
            <Filter className="w-5 h-5 text-purple-600" /> Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filter.person}
              onChange={(e) => setFilter({ ...filter, person: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">👥 Ambos</option>
              <option value="Nicolás">👤 Nicolás</option>
              <option value="Connie">👤 Connie</option>
            </select>

            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">📂 Todas las categorías</option>
              {Object.keys(categories).sort().map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filter.month}
              onChange={(e) => setFilter({ ...filter, month: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">📅 Todos los meses</option>
              {getAvailableMonths().map((month) => {
                const [year, m] = month.split('-');
                const monthName = new Date(year, parseInt(m) - 1).toLocaleDateString('es-ES', {
                  month: 'long',
                  year: 'numeric',
                });
                return (
                  <option key={month} value={month}>{monthName}</option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Lista de Gastos */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="mx-auto text-gray-300 mb-4 w-16 h-16" />
              <p className="text-gray-500 text-lg">
                Sube tu extracto bancario o agrega un gasto manual para comenzar
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">
                  Lista de Gastos ({filteredExpenses.length})
                </h3>
                {selectedExpenses.length > 0 && (
                  <button
                    onClick={deleteSelectedExpenses}
                    className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar ({selectedExpenses.length})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-purple-100">
                      <th className="p-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.length > 0 && selectedExpenses.length === filteredExpenses.length}
                          onChange={(e) => setSelectedExpenses(
                            e.target.checked ? filteredExpenses.map((exp) => exp.id) : []
                          )}
                        />
                      </th>
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
                      <tr key={expense.id} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={() => toggleSelectExpense(expense.id)}
                          />
                        </td>
                        <td className="p-3 text-gray-600">{expense.date}</td>
                        <td className="p-3 text-gray-800 max-w-xs truncate">{expense.concept}</td>
                        <td className="p-3">
                          {editingId === expense.id ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="px-2 py-1 border border-purple-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                              >
                                {Object.keys(categories).sort().map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => saveEdit(expense.id)}
                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
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
                            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                              {expense.category}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                            expense.person === 'Nicolás' 
                              ? 'bg-pink-100 text-pink-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {expense.person}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-800">
                          €{Number(expense.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {editingId !== expense.id && (
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => startEdit(expense)}
                                className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteExpense(expense.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

        {/* Modal: Gestión de Categorías */}
        {showCategoryManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-gray-800">Administración de Categorías</h3>
                <button
                  onClick={() => {
                    setShowCategoryManager(false);
                    setSelectedCategoryKeys([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Nueva categoría */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm text-gray-700">Nueva Categoría</h4>
                <div className="flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de nueva categoría"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={addNewCategory}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Lista de categorías */}
              <div className="mb-4 max-h-60 overflow-y-auto border rounded-lg">
                {Object.keys(categories).sort().map((cat) => (
                  <label key={cat} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedCategoryKeys.includes(cat)}
                      onChange={() => toggleSelectCategoryKey(cat)}
                    />
                    <span className="flex-1 font-medium">{cat}</span>
                    <span className="text-sm text-gray-500">
                      {expenses.filter(e => e.category === cat).length} gastos
                    </span>
                  </label>
                ))}
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={renameSelectedCategory}
                  disabled={selectedCategoryKeys.length !== 1}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategoryKeys.length === 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Renombrar
                </button>
                <button
                  onClick={deleteSelectedCategories}
                  disabled={selectedCategoryKeys.length === 0}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategoryKeys.length > 0
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Gasto Manual */}
        {showManualExpenseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-gray-800">Nuevo Gasto Manual</h3>
                <button
                  onClick={() => setShowManualExpenseModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={manualExpense.date}
                    onChange={(e) => setManualExpense({ ...manualExpense, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej: Compra en supermercado"
                    value={manualExpense.concept}
                    onChange={(e) => setManualExpense({ ...manualExpense, concept: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={manualExpense.category}
                    onChange={(e) => setManualExpense({ ...manualExpense, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    {Object.keys(categories).sort().map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
                  <select
                    value={manualExpense.person}
                    onChange={(e) => setManualExpense({ ...manualExpense, person: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Nicolás">Nicolás</option>
                    <option value="Connie">Connie</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveManualExpense}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Guardando...' : 'Guardar Gasto'}
                </button>
                <button
                  onClick={() => setShowManualExpenseModal(false)}
                  className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
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

export default ExpenseTrackerApp;