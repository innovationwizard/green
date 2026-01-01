'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw, 
  XCircle, 
  CheckCircle,
  X,
  Key,
  Filter
} from 'lucide-react'

type UserRow = Database['public']['Tables']['users']['Row']
type UserRole = Database['public']['Tables']['users']['Row']['role']

interface UserFormData {
  email: string
  full_name: string
  role: UserRole
  password: string
  must_change_password: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    role: 'installer',
    password: '',
    must_change_password: true,
  })
  const [formLoading, setFormLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const supabase = createClient()

  const loadUsers = useCallback(async () => {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setUsers(data || [])
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar usuarios'
      console.error('Error loading users:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadUsers()
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadUsers, 120000)
    return () => clearInterval(interval)
  }, [loadUsers])

  // Filter users based on search term, role, and active status
  useEffect(() => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(term) ||
          user.full_name?.toLowerCase().includes(term) ||
          user.id.toLowerCase().includes(term)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter((user) => user.active)
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter((user) => !user.active)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter, activeFilter])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario')
      }

      // Success - reload users and close modal
      setShowCreateModal(false)
      setFormData({
        email: '',
        full_name: '',
        role: 'installer',
        password: '',
        must_change_password: true,
      })
      await loadUsers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear usuario'
      console.error('Error creating user:', err)
      setError(errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setFormLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          must_change_password: formData.must_change_password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar usuario')
      }

      // Success - reload users and close modal
      setEditingUser(null)
      setFormData({
        email: '',
        full_name: '',
        role: 'installer',
        password: '',
        must_change_password: true,
      })
      await loadUsers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar usuario'
      console.error('Error updating user:', err)
      setError(errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (user: UserRow) => {
    if (!confirm(`¿Estás seguro de que deseas ${user.active ? 'desactivar' : 'activar'} a ${user.email}?`)) {
      return
    }

    try {
      const response = await fetch('/api/users/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          active: !user.active,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar estado')
      }

      await loadUsers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar estado'
      console.error('Error toggling user active status:', err)
      setError(errorMessage)
    }
  }

  const handleResetPassword = async (user: UserRow) => {
    if (!confirm(`¿Estás seguro de que deseas requerir cambio de contraseña para ${user.email}?`)) {
      return
    }

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al requerir cambio de contraseña')
      }

      await loadUsers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al requerir cambio de contraseña'
      console.error('Error resetting password:', err)
      setError(errorMessage)
    }
  }

  const openEditModal = (user: UserRow) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      role: user.role,
      password: '', // Don't pre-fill password
      must_change_password: user.must_change_password,
    })
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingUser(null)
    setFormData({
      email: '',
      full_name: '',
      role: 'installer',
      password: '',
      must_change_password: true,
    })
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'manager':
        return 'bg-purple-100 text-purple-800'
      case 'developer':
        return 'bg-green-100 text-green-800'
      case 'installer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    developer: 'Desarrollador',
    installer: 'Instalador',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Gestión de Usuarios
          </h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización: {lastUpdated.toLocaleString('es-GT')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadUsers} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Crear Usuario
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Email, nombre o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Rol</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">Todos</option>
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="developer">Desarrollador</option>
                <option value="installer">Instalador</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Usuarios ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios con los filtros aplicados'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Rol</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Cambio Contraseña</th>
                    <th className="text-left p-3 font-medium">Creado</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">{user.full_name || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="p-3">
                        {user.active ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {user.must_change_password ? (
                          <span className="text-orange-600 text-sm">Requerido</span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('es-GT')}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(user)}
                            title="Requerir cambio de contraseña"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                            title={user.active ? 'Desactivar' : 'Activar'}
                            className={user.active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          >
                            {user.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Nombre Completo</label>
                  <Input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Rol *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    required
                    disabled={formLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="installer">Instalador</option>
                    <option value="admin">Administrador</option>
                    <option value="manager">Gerente</option>
                    <option value="developer">Desarrollador</option>
                  </select>
                </div>
                {!editingUser && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Contraseña *</label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      disabled={formLoading}
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo 6 caracteres
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="must_change_password"
                    checked={formData.must_change_password}
                    onChange={(e) => setFormData({ ...formData, must_change_password: e.target.checked })}
                    disabled={formLoading}
                    className="w-4 h-4"
                  />
                  <label htmlFor="must_change_password" className="text-sm">
                    Requerir cambio de contraseña al iniciar sesión
                  </label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={formLoading} className="flex-1">
                    {formLoading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModal} disabled={formLoading}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

