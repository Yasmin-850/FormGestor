
import { useEffect, useState } from 'react'
import { FileCheck, RefreshCw } from 'lucide-react'
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

export default function Respostas() {
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('')
  const [respostaAberta, setRespostaAberta] = useState<string | null>(null)

  async function carregarDados() {
    setCarregando(true)
    setErro('')

    try {
      const [resultadoRespostas, resultadoFormularios, resultadoPerguntas] =
        await Promise.all([
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

      setRespostas((resultadoRespostas.data ?? []) as Resposta[])
      setFormularios(resultadoFormularios.data ?? [])
      setPerguntas(resultadoPerguntas.data ?? [])
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
    return formularios.find((formulario) => formulario.id === id)?.title
      ?? 'Formulário não encontrado'
  }

  function tituloPergunta(id: string) {
    return perguntas.find((pergunta) => pergunta.id === id)?.title
      ?? `Pergunta ${id}`
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
          <p>Consulte os formulários preenchidos e enviados.</p>
        </div>

        <button type="button" onClick={() => void carregarDados()}>
          <RefreshCw size={18} />
          Atualizar
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

              <p>
                <strong>Status:</strong> {resposta.status}
              </p>

              <p>
                <strong>Enviado em:</strong>{' '}
                {resposta.submitted_at
                  ? new Date(resposta.submitted_at).toLocaleString('pt-BR')
                  : 'Data não informada'}
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
                  {Object.entries(resposta.answers ?? {}).map(
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
