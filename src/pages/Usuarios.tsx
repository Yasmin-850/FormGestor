
import { useEffect, useState } from 'react'
import {
  Users,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Pencil,
  Save,
  X
} from 'lucide-react'
import { supabase } from '../services/supabase'

type Funcao = 'administrador' | 'lider' | 'funcionario'

type Usuario = {
  id: string
  full_name: string | null
  role: string
  active: boolean
}

function nomeFuncao(role: string): string {
  switch (role) {
    case 'administrador':
      return 'Administrador'
    case 'lider':
      return 'Líder'
    case 'funcionario':
      return 'Funcionário'
    default:
      return role
  }
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [pesquisa, setPesquisa] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(null)
  const [usuarioEditando, setUsuarioEditando] = useState<string | null>(null)
  const [funcaoEditada, setFuncaoEditada] = useState<Funcao>('funcionario')

  async function carregarUsuarios() {
    setCarregando(true)
    setErro('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError

      setUsuarioAtualId(authData.user?.id ?? null)

      const todos: Usuario[] = []
      const tamanhoPagina = 500

      for (let inicio = 0; ; inicio += tamanhoPagina) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, active')
          .order('id', { ascending: true })
          .range(inicio, inicio + tamanhoPagina - 1)

        if (error) throw error

        const pagina = (data ?? []) as Usuario[]
        todos.push(...pagina)

        if (pagina.length < tamanhoPagina) break
      }

      setUsuarios(todos)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os usuários.'
      )
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregarUsuarios()
  }, [])

  function iniciarEdicao(usuario: Usuario) {
    if (usuario.id === usuarioAtualId) {
      setErro('Você não pode alterar sua própria função nesta tela.')
      return
    }

    setErro('')
    setSucesso('')
    setUsuarioEditando(usuario.id)
    setFuncaoEditada(usuario.role as Funcao)
  }

  function cancelarEdicao() {
    setUsuarioEditando(null)
  }

  async function salvarFuncao(usuario: Usuario) {
    if (salvando || usuario.id === usuarioAtualId) return

    if (usuario.role === funcaoEditada) {
      cancelarEdicao()
      return
    }

    const confirmado = window.confirm(
      `Deseja alterar a função de ${usuario.full_name || 'este usuário'} para ${nomeFuncao(funcaoEditada)}?`
    )

    if (!confirmado) return

    setSalvando(true)
    setErro('')
    setSucesso('')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: funcaoEditada })
        .eq('id', usuario.id)
        .select('id, role')
        .single()

      if (error) throw error

      if (!data || data.role !== funcaoEditada) {
        throw new Error('A alteração não foi confirmada pelo banco de dados.')
      }

      setUsuarioEditando(null)
      await carregarUsuarios()
      setSucesso('Função atualizada com sucesso!')
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a função.'
      )
    } finally {
      setSalvando(false)
    }
  }

  async function alterarSituacao(usuario: Usuario) {
    if (salvando || usuario.id === usuarioAtualId) return

    const novaSituacao = !usuario.active

    const confirmado = window.confirm(
      `Deseja ${novaSituacao ? 'ativar' : 'desativar'} a conta de ${usuario.full_name || 'este usuário'}?`
    )

    if (!confirmado) return

    setSalvando(true)
    setErro('')
    setSucesso('')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ active: novaSituacao })
        .eq('id', usuario.id)
        .select('id, active')
        .single()

      if (error) throw error

      if (!data || data.active !== novaSituacao) {
        throw new Error('A alteração não foi confirmada pelo banco de dados.')
      }

      await carregarUsuarios()
      setSucesso(
        novaSituacao
          ? 'Usuário ativado com sucesso!'
          : 'Usuário desativado com sucesso!'
      )
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar a situação do usuário.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = `${usuario.full_name ?? ''} ${nomeFuncao(usuario.role)}`
      .toLowerCase()

    return texto.includes(pesquisa.trim().toLowerCase())
  })

  const ativos = usuarios.filter((usuario) => usuario.active).length

  const administradores = usuarios.filter(
    (usuario) => usuario.role === 'administrador'
  ).length

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px'
  }

  const botaoStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    cursor: 'pointer'
  }

  return (
    <section style={{ padding: '24px', width: '100%' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h1>Gerenciamento de Usuários</h1>
          <p>Consulte e gerencie os usuários cadastrados no FormGestor.</p>
        </div>

        <button
          type="button"
          onClick={() => void carregarUsuarios()}
          disabled={carregando || salvando}
          style={botaoStyle}
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </header>

      {erro && (
        <p role="alert" style={{ color: '#b91c1c', marginTop: '16px' }}>
          {erro}
        </p>
      )}

      {sucesso && (
        <p role="status" style={{ color: '#15803d', marginTop: '16px' }}>
          {sucesso}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '16px',
          marginTop: '24px'
        }}
      >
        <div style={cardStyle}>
          <Users size={26} color="#2563eb" />
          <h3>Total de usuários</h3>
          <strong style={{ fontSize: '30px' }}>{usuarios.length}</strong>
        </div>

        <div style={cardStyle}>
          <UserCheck size={26} color="#15803d" />
          <h3>Usuários ativos</h3>
          <strong style={{ fontSize: '30px' }}>{ativos}</strong>
        </div>

        <div style={cardStyle}>
          <UserX size={26} color="#dc2626" />
          <h3>Usuários inativos</h3>
          <strong style={{ fontSize: '30px' }}>
            {usuarios.length - ativos}
          </strong>
        </div>

        <div style={cardStyle}>
          <ShieldCheck size={26} color="#7c3aed" />
          <h3>Administradores</h3>
          <strong style={{ fontSize: '30px' }}>{administradores}</strong>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '24px' }}>
        <h2>Usuários cadastrados</h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 12px',
            maxWidth: '420px',
            marginBottom: '20px'
          }}
        >
          <Search size={18} />

          <input
            type="search"
            placeholder="Pesquisar por nome ou função..."
            aria-label="Pesquisar usuários"
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>

        {carregando ? (
          <p>Carregando usuários...</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p>Nenhum usuário encontrado.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px' }}>Nome</th>
                  <th style={{ padding: '14px' }}>Função</th>
                  <th style={{ padding: '14px' }}>Situação</th>
                  <th style={{ padding: '14px' }}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map((usuario) => {
                  const proprioUsuario = usuario.id === usuarioAtualId
                  const editando = usuarioEditando === usuario.id

                  return (
                    <tr
                      key={usuario.id}
                      style={{ borderBottom: '1px solid #e2e8f0' }}
                    >
                      <td style={{ padding: '14px' }}>
                        {usuario.full_name || 'Nome não informado'}
                        {proprioUsuario && (
                          <span style={{ color: '#64748b', marginLeft: '8px' }}>
                            (Você)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px' }}>
                        {editando ? (
                          <select
                            value={funcaoEditada}
                            onChange={(event) =>
                              setFuncaoEditada(event.target.value as Funcao)
                            }
                            disabled={salvando}
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            <option value="administrador">Administrador</option>
                            <option value="lider">Líder</option>
                            <option value="funcionario">Funcionário</option>
                          </select>
                        ) : (
                          nomeFuncao(usuario.role)
                        )}
                      </td>

                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '5px 10px',
                            borderRadius: '20px',
                            background: usuario.active
                              ? '#dcfce7'
                              : '#fee2e2',
                            color: usuario.active
                              ? '#166534'
                              : '#991b1b',
                            fontWeight: 600,
                            fontSize: '13px'
                          }}
                        >
                          {usuario.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td style={{ padding: '14px' }}>
                        {proprioUsuario ? (
                          <span style={{ color: '#64748b', fontSize: '13px' }}>
                            Conta atual
                          </span>
                        ) : editando ? (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => void salvarFuncao(usuario)}
                              disabled={salvando}
                              style={botaoStyle}
                            >
                              <Save size={16} />
                              Salvar
                            </button>

                            <button
                              type="button"
                              onClick={cancelarEdicao}
                              disabled={salvando}
                              style={botaoStyle}
                            >
                              <X size={16} />
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => iniciarEdicao(usuario)}
                              disabled={salvando || usuarioEditando !== null}
                              style={botaoStyle}
                            >
                              <Pencil size={16} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => void alterarSituacao(usuario)}
                              disabled={salvando || usuarioEditando !== null}
                              style={{
                                ...botaoStyle,
                                color: usuario.active ? '#b91c1c' : '#15803d'
                              }}
                            >
                              {usuario.active ? (
                                <UserX size={16} />
                              ) : (
                                <UserCheck size={16} />
                              )}
                              {usuario.active ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
