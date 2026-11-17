
import { useEffect, useState, type FormEvent } from 'react'
import {
  ClipboardList,
  Plus,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react'
import { supabase } from '../services/supabase'

type Formulario = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
}

function Formularios() {
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregarFormularios() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('forms')
      .select('id, title, description, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setErro(error.message)
    } else {
      setFormularios(data ?? [])
    }

    setCarregando(false)
  }

  useEffect(() => {
    void carregarFormularios()
  }, [])

  async function criarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSalvando(true)
    setErro('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error('Você precisa estar autenticada.')
      }

      const tituloLimpo = titulo.trim()

      if (!tituloLimpo) {
        throw new Error('Digite um título para o formulário.')
      }

      const { error } = await supabase.from('forms').insert({
        title: tituloLimpo,
        description: descricao.trim() || null,
        status: 'rascunho',
        created_by: authData.user.id
      })

      if (error) throw error

      setTitulo('')
      setDescricao('')
      setCriando(false)

      await carregarFormularios()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar o formulário.'
      )
    } finally {
      setSalvando(false)
    }
  }

  function editarFormulario(id: string) {
    window.location.hash = `editar-formulario/${id}`
  }

  return (
    <section style={{ padding: '32px', width: '100%' }}>
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
          <h1>Formulários</h1>
          <p>Crie e gerencie os formulários do sistema.</p>
        </div>

        <button
          type="button"
          onClick={() => setCriando(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <Plus size={18} />
          Novo formulário
        </button>
      </header>

      {erro && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {erro}
        </p>
      )}

      {criando && (
        <form
          onSubmit={criarFormulario}
          style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            marginTop: '24px',
            display: 'grid',
            gap: '12px'
          }}
        >
          <h2>Criar formulário</h2>

          <label htmlFor="titulo-formulario">Título</label>
          <input
            id="titulo-formulario"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ex.: Checklist de higienização"
            required
            style={{
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px'
            }}
          />

          <label htmlFor="descricao-formulario">Descrição</label>
          <textarea
            id="descricao-formulario"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Descreva a finalidade do formulário"
            rows={3}
            style={{
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px'
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: '10px 16px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar formulário'}
            </button>

            <button
              type="button"
              onClick={() => setCriando(false)}
              disabled={salvando}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: '28px' }}>
        {carregando ? (
          <p>Carregando formulários...</p>
        ) : formularios.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px'
            }}
          >
            <ClipboardList size={42} />
            <h2>Nenhum formulário cadastrado</h2>
            <p>Clique em Novo formulário para começar.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '16px'
            }}
          >
            {formularios.map((formulario) => (
              <article
                key={formulario.id}
                style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: '12px'
                }}
              >
                <h2>{formulario.title}</h2>

                <p>
                  {formulario.description || 'Sem descrição'}
                </p>

                <p>
                  Status: <strong>{formulario.status}</strong>
                </p>

                <button
                  type="button"
                  onClick={() => editarFormulario(formulario.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '12px',
                    padding: '10px 16px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <FileSpreadsheet size={18} />
                  Editar / Importar Excel
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void carregarFormularios()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '24px',
          padding: '10px 16px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        <RefreshCw size={16} />
        Atualizar lista
      </button>
    </section>
  )
}

export default Formularios
