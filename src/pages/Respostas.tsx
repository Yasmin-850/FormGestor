
import { useEffect, useState } from 'react'
import { FileCheck, RefreshCw, UserRound } from 'lucide-react'
import { supabase } from '../services/supabase'

type Resposta = {
  id: string
  form_id: string
  user_id: string
  status: string
  submitted_at: string | null
  answers: Record<string, unknown>
}

type Formulario = {
  id: string
  title: string
}

type Pergunta = {
  id: string
  form_id: string
  title: string
  position: number
}

type Perfil = {
  id: string
  full_name: string | null
}

export default function Respostas() {
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('')
  const [respostaAberta, setRespostaAberta] = useState<string | null>(null)

  async function carregarDados() {
    setCarregando(true)
    setErro('')

    try {
      const [
        resultadoRespostas,
        resultadoFormularios,
        resultadoPerguntas
      ] = await Promise.all([
        supabase
          .from('form_responses')
          .select('id, form_id, user_id, status, submitted_at, answers')
          .order('submitted_at', { ascending: false }),

        supabase
          .from('forms')
          .select('id, title'),

        supabase
          .from('form_questions')
          .select('id, form_id, title, position')
          .order('position', { ascending: true })
      ])

      if (resultadoRespostas.error) throw resultadoRespostas.error
      if (resultadoFormularios.error) throw resultadoFormularios.error
      if (resultadoPerguntas.error) throw resultadoPerguntas.error

      const listaRespostas = (resultadoRespostas.data ?? []) as Resposta[]

      setRespostas(listaRespostas)
      setFormularios((resultadoFormularios.data ?? []) as Formulario[])
      setPerguntas((resultadoPerguntas.data ?? []) as Pergunta[])

      const idsUsuarios = [
        ...new Set(
          listaRespostas
            .map((resposta) => resposta.user_id)
            .filter(Boolean)
        )
      ]

      if (idsUsuarios.length > 0) {
        const resultadoPerfis = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', idsUsuarios)

        if (resultadoPerfis.error) {
          setPerfis([])
          setErro(
            'As respostas foram carregadas, mas não foi possível ' +
            'consultar os nomes dos usuários: ' +
            resultadoPerfis.error.message
          )
        } else {
          setPerfis((resultadoPerfis.data ?? []) as Perfil[])
        }
      } else {
        setPerfis([])
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as respostas.'
      )
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregarDados()
  }, [])

  function nomeFormulario(id: string) {
    return (
      formularios.find((formulario) => formulario.id === id)?.title ??
      'Formulário não encontrado'
    )
  }

  function nomeUsuario(id: string) {
    const perfil = perfis.find((usuario) => usuario.id === id)

    return perfil?.full_name?.trim() || 'Usuário não identificado'
  }

  function tituloPergunta(id: string) {
    return (
      perguntas.find((pergunta) => pergunta.id === id)?.title ??
      `Pergunta ${id}`
    )
  }

  function formatarValor(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') {
      return 'Não respondido'
    }

    if (Array.isArray(valor)) {
      return valor.map(formatarValor).join(', ')
    }

    if (typeof valor === 'object') {
      return JSON.stringify(valor)
    }

    return String(valor)
  }

  function formatarData(data: string | null) {
    if (!data) return 'Data não informada'

    const dataConvertida = new Date(data)

    if (Number.isNaN(dataConvertida.getTime())) {
      return 'Data inválida'
    }

    return dataConvertida.toLocaleString('pt-BR')
  }

  const respostasFiltradas = filtro
    ? respostas.filter((resposta) => resposta.form_id === filtro)
    : respostas

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
          <h1>Respostas dos formulários</h1>
          <p>
            Consulte quem respondeu, quando enviou e as respostas registradas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void carregarDados()}
          disabled={carregando}
        >
          <RefreshCw size={18} />
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </header>

      {erro && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {erro}
        </p>
      )}

      <div style={{ marginTop: '24px', marginBottom: '24px' }}>
        <label htmlFor="filtro-formulario">
          <strong>Filtrar por formulário</strong>
        </label>

        <select
          id="filtro-formulario"
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
          style={{
            display: 'block',
            marginTop: '8px',
            padding: '12px',
            width: '100%',
            maxWidth: '420px'
          }}
        >
          <option value="">Todos os formulários</option>

          {formularios.map((formulario) => (
            <option key={formulario.id} value={formulario.id}>
              {formulario.title}
            </option>
          ))}
        </select>
      </div>

      {!carregando && (
        <p style={{ marginBottom: '16px', color: '#475569' }}>
          <strong>Total de respostas:</strong> {respostasFiltradas.length}
        </p>
      )}

      {carregando ? (
        <p>Carregando respostas...</p>
      ) : respostasFiltradas.length === 0 ? (
        <div
          style={{
            padding: '40px',
            background: '#fff',
            borderRadius: '12px',
            textAlign: 'center'
          }}
        >
          <FileCheck size={40} />
          <h2>Nenhuma resposta encontrada</h2>
          <p>As respostas enviadas aparecerão aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {respostasFiltradas.map((resposta) => (
            <article
              key={resposta.id}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e2e8f0'
              }}
            >
              <h2>{nomeFormulario(resposta.form_id)}</h2>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '16px',
                  marginBottom: '16px',
                  padding: '14px',
                  background: '#eff6ff',
                  borderRadius: '8px'
                }}
              >
                <UserRound size={22} color="#2563eb" />

                <div>
                  <strong>Enviado por:</strong>
                  <div style={{ marginTop: '4px' }}>
                    {nomeUsuario(resposta.user_id)}
                  </div>
                </div>
              </div>

              <p>
                <strong>Status:</strong> {resposta.status}
              </p>

              <p>
                <strong>Enviado em:</strong>{' '}
                {formatarData(resposta.submitted_at)}
              </p>

              <button
                type="button"
                onClick={() =>
                  setRespostaAberta(
                    respostaAberta === resposta.id ? null : resposta.id
                  )
                }
              >
                {respostaAberta === resposta.id
                  ? 'Ocultar respostas'
                  : 'Visualizar respostas'}
              </button>

              {respostaAberta === resposta.id && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    Respostas de {nomeUsuario(resposta.user_id)}
                  </h3>

                  {Object.entries(resposta.answers ?? {}).length === 0 ? (
                    <p>Nenhuma resposta registrada.</p>
                  ) : (
                    Object.entries(resposta.answers ?? {}).map(
                      ([perguntaId, valor]) => (
                        <div
                          key={perguntaId}
                          style={{
                            padding: '12px 0',
                            borderBottom: '1px solid #e2e8f0'
                          }}
                        >
                          <strong>{tituloPergunta(perguntaId)}</strong>
                          <p>{formatarValor(valor)}</p>
                        </div>
                      )
                    )
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
