import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - reemplaza con tus credenciales
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'tu-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utilidades para parsear extractos bancarios
const parseBankStatement = {
  // Parser para extractos de Santander (CSV típico)
  santander: (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const transactions = [];
    
    // Santander típicamente tiene: Fecha, Concepto, Importe, Saldo
    // Saltamos las primeras líneas de cabecera
    let dataStarted = false;
    
    for (const line of lines) {
      // Detectar inicio de datos (buscar patrón de fecha)
      if (/^\d{2}[/-]\d{2}[/-]\d{4}/.test(line.trim())) {
        dataStarted = true;
      }
      
      if (!dataStarted) continue;
      
      // Parsear línea CSV considerando campos con comas dentro de comillas
      const fields = parseCSVLine(line);
      
      if (fields.length >= 3) {
        const dateStr = fields[0]?.trim();
        const concept = fields[1]?.trim();
        const amountStr = fields[2]?.trim();
        
        const date = parseSpanishDate(dateStr);
        const amount = parseSpanishAmount(amountStr);
        
        if (date && !isNaN(amount)) {
          transactions.push({
            date,
            concept,
            amount,
            bank: 'Santander',
            raw: line
          });
        }
      }
    }
    
    return transactions;
  },

  // Parser para extractos de BBVA
  // Columnas: [vacía, F.Valor, Fecha, Concepto, Movimiento, Importe, Divisa, Observaciones]
  bbva: (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const transactions = [];
    
    let headerFound = false;
    
    for (const line of lines) {
      const fields = parseCSVLine(line);
      
      // Detectar cabecera
      if (!headerFound) {
        const lineUpper = line.toUpperCase();
        if (lineUpper.includes('F.VALOR') || lineUpper.includes('CONCEPTO') || lineUpper.includes('IMPORTE')) {
          headerFound = true;
          continue;
        }
      }
      
      // Si no hemos encontrado cabecera, buscar patrón de fecha
      if (!headerFound && /\d{2}[/-]\d{2}[/-]\d{4}/.test(line)) {
        headerFound = true;
      }
      
      if (!headerFound) continue;
      
      // BBVA: [0:vacía, 1:F.Valor, 2:Fecha, 3:Concepto, 4:Movimiento, 5:Importe, 6:Divisa, 7:Observaciones]
      if (fields.length >= 6) {
        const fValor = fields[1]?.trim();
        const fecha = fields[2]?.trim();
        const concepto = fields[3]?.trim();
        const movimiento = fields[4]?.trim();
        const importeStr = fields[5]?.trim();
        const divisa = fields[6]?.trim() || 'EUR';
        const observaciones = fields[7]?.trim() || '';
        
        // Usar F.Valor o Fecha
        const dateStr = fValor || fecha;
        const date = parseSpanishDate(dateStr);
        const amount = parseSpanishAmount(importeStr);
        
        if (date && !isNaN(amount)) {
          transactions.push({
            date,
            concept: concepto,
            movement_type: movimiento,
            amount,
            currency: divisa,
            observations: observaciones,
            bank: 'BBVA',
            raw: line
          });
        }
      }
    }
    
    return transactions;
  },

  // Detección automática de banco
  detect: (csvText) => {
    const upperText = csvText.toUpperCase();
    
    if (upperText.includes('BBVA') || upperText.includes('F.VALOR')) {
      return 'bbva';
    }
    if (upperText.includes('SANTANDER') || upperText.includes('BANCO SANTANDER')) {
      return 'santander';
    }
    
    // Intentar detectar por estructura de columnas
    const firstLines = csvText.split('\n').slice(0, 10).join('\n').toUpperCase();
    if (firstLines.includes('DIVISA') && firstLines.includes('OBSERVACIONES')) {
      return 'bbva';
    }
    
    // Por defecto intentar Santander
    return 'santander';
  }
};

// Funciones auxiliares de parseo
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result.map(field => field.replace(/^"|"$/g, '').trim());
}

function parseSpanishDate(dateStr) {
  if (!dateStr) return null;
  
  // Formatos: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
  const patterns = [
    /(\d{2})[/-](\d{2})[/-](\d{4})/,
    /(\d{2})[/-](\d{2})[/-](\d{2})/
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      let [, day, month, year] = match;
      if (year.length === 2) {
        year = parseInt(year) > 50 ? '19' + year : '20' + year;
      }
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return null;
}

function parseSpanishAmount(amountStr) {
  if (!amountStr) return NaN;
  
  // Limpiar y convertir formato español (1.234,56) a número
  let cleaned = amountStr
    .replace(/[€$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(cleaned);
}

// Componente principal
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('expenses'); // expenses, import, summary, groups
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [notification, setNotification] = useState(null);

  // Estado para nuevo gasto
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paid_by: '',
    split_between: [],
    category: 'general',
    date: new Date().toISOString().split('T')[0]
  });

  // Estado para importación
  const [importData, setImportData] = useState({
    bank: 'auto',
    csvContent: '',
    parsedTransactions: [],
    selectedTransactions: []
  });

  // Autenticación
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar datos cuando hay usuario
  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      loadExpenses();
      loadMembers();
    }
  }, [selectedGroup]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Funciones de carga de datos
  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members!inner(user_id)')
        .eq('group_members.user_id', user.id);

      if (error) throw error;
      setGroups(data || []);
      
      if (data?.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    } catch (error) {
      console.error('Error cargando grupos:', error);
      showNotification('Error al cargar grupos', 'error');
    }
  };

  const loadExpenses = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_splits (
            user_id,
            amount,
            users (email, name)
          ),
          users:paid_by (email, name)
        `)
        .eq('group_id', selectedGroup.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error cargando gastos:', error);
      showNotification('Error al cargar gastos', 'error');
    }
  };

  const loadMembers = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, users (id, email, name)')
        .eq('group_id', selectedGroup.id);

      if (error) throw error;
      setMembers(data?.map(m => m.users) || []);
    } catch (error) {
      console.error('Error cargando miembros:', error);
    }
  };

  // Funciones de autenticación
  const handleLogin = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showNotification('Sesión iniciada', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleSignUp = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { name }
        }
      });
      if (error) throw error;
      
      // Crear perfil de usuario
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email,
          name
        });
      }
      
      showNotification('Cuenta creada. Revisa tu email para confirmar.', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSelectedGroup(null);
    setExpenses([]);
    setGroups([]);
  };

  // Funciones de gastos
  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    if (!selectedGroup || !newExpense.description || !newExpense.amount || !newExpense.paid_by) {
      showNotification('Completa todos los campos requeridos', 'error');
      return;
    }

    try {
      const amount = parseFloat(newExpense.amount);
      const splitMembers = newExpense.split_between.length > 0 
        ? newExpense.split_between 
        : members.map(m => m.id);
      
      const splitAmount = amount / splitMembers.length;

      // Insertar gasto
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: selectedGroup.id,
          description: newExpense.description,
          amount,
          paid_by: newExpense.paid_by,
          category: newExpense.category,
          date: newExpense.date
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Insertar splits
      const splits = splitMembers.map(userId => ({
        expense_id: expense.id,
        user_id: userId,
        amount: splitAmount
      }));

      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(splits);

      if (splitError) throw splitError;

      showNotification('Gasto añadido correctamente', 'success');
      setNewExpense({
        description: '',
        amount: '',
        paid_by: '',
        split_between: [],
        category: 'general',
        date: new Date().toISOString().split('T')[0]
      });
      loadExpenses();
    } catch (error) {
      console.error('Error añadiendo gasto:', error);
      showNotification('Error al añadir gasto', 'error');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      showNotification('Gasto eliminado', 'success');
      loadExpenses();
    } catch (error) {
      showNotification('Error al eliminar gasto', 'error');
    }
  };

  // Funciones de importación
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setImportData(prev => ({ ...prev, csvContent: content }));
      parseImportedFile(content);
    };
    reader.readAsText(file, 'ISO-8859-1'); // Encoding común en bancos españoles
  };

  const parseImportedFile = (content) => {
    const bank = importData.bank === 'auto' 
      ? parseBankStatement.detect(content) 
      : importData.bank;
    
    const parser = parseBankStatement[bank];
    if (!parser) {
      showNotification('Banco no soportado', 'error');
      return;
    }

    const transactions = parser(content);
    setImportData(prev => ({
      ...prev,
      parsedTransactions: transactions,
      selectedTransactions: transactions.map((_, i) => i)
    }));

    showNotification(`${transactions.length} transacciones encontradas`, 'success');
  };

  const handleImportSelected = async () => {
    if (!selectedGroup || importData.selectedTransactions.length === 0) {
      showNotification('Selecciona transacciones para importar', 'error');
      return;
    }

    try {
      const toImport = importData.selectedTransactions.map(index => {
        const tx = importData.parsedTransactions[index];
        return {
          group_id: selectedGroup.id,
          description: tx.concept,
          amount: Math.abs(tx.amount),
          paid_by: user.id,
          category: 'imported',
          date: tx.date,
          metadata: {
            bank: tx.bank,
            original_amount: tx.amount,
            movement_type: tx.movement_type,
            observations: tx.observations
          }
        };
      });

      const { error } = await supabase
        .from('expenses')
        .insert(toImport);

      if (error) throw error;

      showNotification(`${toImport.length} gastos importados`, 'success');
      setImportData({
        bank: 'auto',
        csvContent: '',
        parsedTransactions: [],
        selectedTransactions: []
      });
      setView('expenses');
      loadExpenses();
    } catch (error) {
      console.error('Error importando:', error);
      showNotification('Error al importar gastos', 'error');
    }
  };

  const toggleTransactionSelection = (index) => {
    setImportData(prev => {
      const selected = prev.selectedTransactions.includes(index)
        ? prev.selectedTransactions.filter(i => i !== index)
        : [...prev.selectedTransactions, index];
      return { ...prev, selectedTransactions: selected };
    });
  };

  // Calcular balances
  const calculateBalances = useCallback(() => {
    const balances = {};
    
    members.forEach(member => {
      balances[member.id] = { paid: 0, owes: 0, name: member.name || member.email };
    });

    expenses.forEach(expense => {
      if (balances[expense.paid_by]) {
        balances[expense.paid_by].paid += expense.amount;
      }
      
      expense.expense_splits?.forEach(split => {
        if (balances[split.user_id]) {
          balances[split.user_id].owes += split.amount;
        }
      });
    });

    return Object.entries(balances).map(([id, data]) => ({
      id,
      name: data.name,
      paid: data.paid,
      owes: data.owes,
      balance: data.paid - data.owes
    }));
  }, [expenses, members]);

  // Calcular deudas simplificadas
  const calculateDebts = useCallback(() => {
    const balances = calculateBalances();
    const debts = [];
    
    const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b, amount: -b.balance }));
    const creditors = balances.filter(b => b.balance > 0).map(b => ({ ...b, amount: b.balance }));
    
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    
    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);
      
      if (amount > 0.01) {
        debts.push({
          from: debtor.name,
          fromId: debtor.id,
          to: creditor.name,
          toId: creditor.id,
          amount: Math.round(amount * 100) / 100
        });
      }
      
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    
    return debts;
  }, [calculateBalances]);

  // Funciones de grupos
  const handleCreateGroup = async (name) => {
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' });

      if (memberError) throw memberError;

      showNotification('Grupo creado', 'success');
      loadGroups();
      setSelectedGroup(group);
    } catch (error) {
      showNotification('Error al crear grupo', 'error');
    }
  };

  const handleInviteMember = async (email) => {
    if (!selectedGroup) return;
    
    try {
      // Buscar usuario por email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        showNotification('Usuario no encontrado', 'error');
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: selectedGroup.id, user_id: userData.id, role: 'member' });

      if (error) {
        if (error.code === '23505') {
          showNotification('El usuario ya es miembro', 'error');
        } else {
          throw error;
        }
        return;
      }

      showNotification('Miembro añadido', 'success');
      loadMembers();
    } catch (error) {
      showNotification('Error al añadir miembro', 'error');
    }
  };

  // Componentes de UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} onSignUp={handleSignUp} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${
          notification.type === 'error' ? 'bg-red-500' :
          notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">💰 Gastos Compartidos</h1>
            
            {groups.length > 0 && (
              <select
                value={selectedGroup?.id || ''}
                onChange={(e) => {
                  const group = groups.find(g => g.id === e.target.value);
                  setSelectedGroup(group);
                }}
                className="border rounded-lg px-3 py-1 text-sm"
              >
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navegación */}
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'expenses', label: '📋 Gastos' },
              { id: 'import', label: '📥 Importar' },
              { id: 'summary', label: '📊 Resumen' },
              { id: 'groups', label: '👥 Grupos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  view === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {!selectedGroup && view !== 'groups' ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tienes ningún grupo seleccionado</p>
            <button
              onClick={() => setView('groups')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Crear o unirse a un grupo
            </button>
          </div>
        ) : (
          <>
            {view === 'expenses' && (
              <ExpensesView
                expenses={expenses}
                members={members}
                newExpense={newExpense}
                setNewExpense={setNewExpense}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                currentUserId={user.id}
              />
            )}
            
            {view === 'import' && (
              <ImportView
                importData={importData}
                setImportData={setImportData}
                onFileUpload={handleFileUpload}
                onParseFile={() => parseImportedFile(importData.csvContent)}
                onToggleTransaction={toggleTransactionSelection}
                onImport={handleImportSelected}
              />
            )}
            
            {view === 'summary' && (
              <SummaryView
                balances={calculateBalances()}
                debts={calculateDebts()}
                expenses={expenses}
              />
            )}
            
            {view === 'groups' && (
              <GroupsView
                groups={groups}
                selectedGroup={selectedGroup}
                members={members}
                onCreateGroup={handleCreateGroup}
                onSelectGroup={setSelectedGroup}
                onInviteMember={handleInviteMember}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Componente de autenticación
function AuthScreen({ onLogin, onSignUp }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(email, password);
    } else {
      onSignUp(email, password, name);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">💰 Gastos Compartidos</h1>
        <p className="text-gray-500 text-center mb-6">
          {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
            minLength={6}
          />
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>
        
        <p className="text-center mt-4 text-sm text-gray-600">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-medium hover:underline"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}

// Vista de gastos
function ExpensesView({ expenses, members, newExpense, setNewExpense, onAddExpense, onDeleteExpense, currentUserId }) {
  const categories = [
    { id: 'general', label: '📦 General' },
    { id: 'food', label: '🍕 Comida' },
    { id: 'transport', label: '🚗 Transporte' },
    { id: 'housing', label: '🏠 Vivienda' },
    { id: 'entertainment', label: '🎬 Ocio' },
    { id: 'utilities', label: '💡 Servicios' },
    { id: 'imported', label: '📥 Importado' }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Formulario nuevo gasto */}
      <div className="md:col-span-1">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-4">Añadir gasto</h2>
          
          <form onSubmit={onAddExpense} className="space-y-4">
            <input
              type="text"
              placeholder="Descripción"
              value={newExpense.description}
              onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            
            <input
              type="number"
              placeholder="Importe"
              step="0.01"
              value={newExpense.amount}
              onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            
            <select
              value={newExpense.paid_by}
              onChange={(e) => setNewExpense(prev => ({ ...prev, paid_by: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">¿Quién pagó?</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
            
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Dividir entre:</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {members.map(member => (
                  <label key={member.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newExpense.split_between.length === 0 || newExpense.split_between.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (newExpense.split_between.length === members.length - 1) {
                            setNewExpense(prev => ({ ...prev, split_between: [] }));
                          } else {
                            setNewExpense(prev => ({
                              ...prev,
                              split_between: [...prev.split_between, member.id]
                            }));
                          }
                        } else {
                          const newSplit = newExpense.split_between.length === 0
                            ? members.filter(m => m.id !== member.id).map(m => m.id)
                            : newExpense.split_between.filter(id => id !== member.id);
                          setNewExpense(prev => ({ ...prev, split_between: newSplit }));
                        }
                      }}
                      className="rounded"
                    />
                    {member.name || member.email}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {newExpense.split_between.length === 0 
                  ? 'Todos los miembros' 
                  : `${newExpense.split_between.length} seleccionados`}
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Añadir gasto
            </button>
          </form>
        </div>
      </div>
      
      {/* Lista de gastos */}
      <div className="md:col-span-2">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Historial de gastos</h2>
          </div>
          
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay gastos registrados
            </div>
          ) : (
            <div className="divide-y">
              {expenses.map(expense => (
                <div key={expense.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{expense.description}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                          {categories.find(c => c.id === expense.category)?.label || expense.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Pagado por {expense.users?.name || expense.users?.email || 'Desconocido'}
                        {expense.expense_splits?.length > 0 && (
                          <> · Dividido entre {expense.expense_splits.length}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(expense.date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {expense.amount.toFixed(2)} €
                      </p>
                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Vista de importación
function ImportView({ importData, setImportData, onFileUpload, onToggleTransaction, onImport }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">Importar extracto bancario</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={importData.bank}
              onChange={(e) => setImportData(prev => ({ ...prev, bank: e.target.value }))}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="auto">🔍 Detectar automáticamente</option>
              <option value="santander">🏦 Santander</option>
              <option value="bbva">🏦 BBVA</option>
            </select>
            
            <label className="flex-1">
              <input
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                onChange={onFileUpload}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <p className="text-gray-600">
                  📁 Haz clic para seleccionar archivo CSV
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Soporta extractos de Santander y BBVA
                </p>
              </div>
            </label>
          </div>
          
          {/* Transacciones parseadas */}
          {importData.parsedTransactions.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">
                  Transacciones encontradas ({importData.parsedTransactions.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportData(prev => ({
                      ...prev,
                      selectedTransactions: prev.parsedTransactions.map((_, i) => i)
                    }))}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Seleccionar todo
                  </button>
                  <button
                    onClick={() => setImportData(prev => ({
                      ...prev,
                      selectedTransactions: []
                    }))}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Deseleccionar todo
                  </button>
                </div>
              </div>
              
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {importData.parsedTransactions.map((tx, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                      importData.selectedTransactions.includes(index) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={importData.selectedTransactions.includes(index)}
                      onChange={() => onToggleTransaction(index)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tx.concept}</p>
                      <p className="text-xs text-gray-500">
                        {tx.date} · {tx.bank}
                        {tx.movement_type && ` · ${tx.movement_type}`}
                      </p>
                    </div>
                    <span className={`font-semibold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.amount.toFixed(2)} €
                    </span>
                  </label>
                ))}
              </div>
              
              <button
                onClick={onImport}
                disabled={importData.selectedTransactions.length === 0}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Importar {importData.selectedTransactions.length} transacciones
              </button>
            </div>
          )}
          
          {/* Información sobre formato BBVA */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">📋 Formato esperado BBVA:</h4>
            <p className="text-xs text-gray-600 font-mono">
              [vacía], F.Valor, Fecha, Concepto, Movimiento, Importe, Divisa, Observaciones
            </p>
            <h4 className="font-medium text-sm mt-3 mb-2">📋 Formato esperado Santander:</h4>
            <p className="text-xs text-gray-600 font-mono">
              Fecha, Concepto, Importe, Saldo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vista de resumen
function SummaryView({ balances, debts, expenses }) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Balances */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">💰 Balances</h2>
        
        <div className="space-y-3">
          {balances.map(balance => (
            <div key={balance.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{balance.name}</p>
                <p className="text-xs text-gray-500">
                  Pagado: {balance.paid.toFixed(2)} € · Debe: {balance.owes.toFixed(2)} €
                </p>
              </div>
              <span className={`font-semibold text-lg ${
                balance.balance > 0 ? 'text-green-600' : balance.balance < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {balance.balance > 0 ? '+' : ''}{balance.balance.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total gastos del grupo:</span>
            <span className="font-semibold">{totalExpenses.toFixed(2)} €</span>
          </div>
        </div>
      </div>
      
      {/* Deudas simplificadas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">🔄 Cómo saldar cuentas</h2>
        
        {debts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">✅</p>
            <p>¡Todas las cuentas están saldadas!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {debts.map((debt, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-800">{debt.from}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-blue-800">{debt.to}</span>
                </div>
                <span className="font-bold text-blue-600">
                  {debt.amount.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Estadísticas por categoría */}
      <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">📊 Gastos por categoría</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(
            expenses.reduce((acc, e) => {
              acc[e.category] = (acc[e.category] || 0) + e.amount;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
            <div key={category} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 capitalize">{category}</p>
              <p className="font-semibold text-lg">{amount.toFixed(2)} €</p>
              <p className="text-xs text-gray-400">
                {((amount / totalExpenses) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Vista de grupos
function GroupsView({ groups, selectedGroup, members, onCreateGroup, onSelectGroup, onInviteMember }) {
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Crear grupo */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">➕ Crear nuevo grupo</h2>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          if (newGroupName.trim()) {
            onCreateGroup(newGroupName.trim());
            setNewGroupName('');
          }
        }}>
          <input
            type="text"
            placeholder="Nombre del grupo"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-3"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Crear grupo
          </button>
        </form>
      </div>
      
      {/* Mis grupos */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">👥 Mis grupos</h2>
        
        {groups.length === 0 ? (
          <p className="text-gray-500">No perteneces a ningún grupo</p>
        ) : (
          <div className="space-y-2">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedGroup?.id === group.id
                    ? 'bg-blue-100 border-blue-500 border'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="font-medium">{group.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Miembros del grupo seleccionado */}
      {selectedGroup && (
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-4">
            Miembros de "{selectedGroup.name}"
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Miembros actuales</h3>
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                      {(member.name || member.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Invitar miembro</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (inviteEmail.trim()) {
                  onInviteMember(inviteEmail.trim());
                  setInviteEmail('');
                }
              }}>
                <input
                  type="email"
                  placeholder="Email del usuario"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-2"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700"
                >
                  Enviar invitación
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-2">
                El usuario debe estar registrado en la aplicación
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}