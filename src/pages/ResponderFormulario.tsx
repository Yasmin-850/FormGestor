
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../services/supabase'

type Pergunta = {
  id: string
  title: string
  description: string | null
  question_type: string
  required: boolean
  options: unknown
  position: number
}

type Formulario = {
  title: string
  description: string | null
  status: string
}

type Props = {
  formularioId: string
  onVoltar?: () => void
}

function obterOpcoes(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.map(String)
  }

  return []
}

export default function ResponderFormulario({
  formularioId,
  onVoltar
}: Props) {
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [respostas, setRespostas] = useState<Record<string, unknown>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  function voltarAosFormularios() {
    if (onVoltar) {
      onVoltar()
    } else {
      window.location.hash = '#formularios'
    }
  }

  useEffect(() => {
    let ativo = true

    async function carregarFormulario() {
      setCarregando(true)
      setErro('')
      setSucesso(false)
      setRespostas({})
      setFormulario(null)
      setPerguntas([])

      const [resultadoFormulario, resultadoPerguntas] =
        await Promise.all([
          supabase
            .from('forms')
            .select('title, description, status')
            .eq('id', formularioId)
            .single(),

          supabase
            .from('form_questions')
            .select(
              'id, title, description, question_type, required, options, position'
            )
            .eq('form_id', formularioId)
            .order('position', { ascending: true })
        ])

      if (!ativo) return

      if (resultadoFormulario.error) {
        setErro(resultadoFormulario.error.message)
      } else if (resultadoPerguntas.error) {
        setErro(resultadoPerguntas.error.message)
      } else {
        setFormulario(resultadoFormulario.data)
        setPerguntas(resultadoPerguntas.data ?? [])
      }

      setCarregando(false)
    }

    void carregarFormulario()

    return () => {
      ativo = false
    }
  }, [formularioId])

  function atualizarResposta(id: string, valor: unknown) {
    setRespostas((anteriores) => ({
      ...anteriores,
      [id]: valor
    }))
  }

  function renderizarCampo(pergunta: Pergunta) {
    const valor = respostas[pergunta.id]
    const opcoes = obterOpcoes(pergunta.options)

    const estilo = {
      width: '100%',
      padding: '12px',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      boxSizing: 'border-box' as const,
      fontSize: '14px',
      background: '#fff'
    }

    switch (pergunta.question_type) {
      case 'data':
        return (
          <input
            type="date"
            style={estilo}
            value={String(valor ?? '')}
            required={pergunta.required}
            onChange={(event) =>
              atualizarResposta(pergunta.id, event.target.value)
            }
          />
        )

      case 'numero':
        return (
          <input
            type="number"
            style={estilo}
            value={String(valor ?? '')}
            required={pergunta.required}
            onChange={(event) =>
              atualizarResposta(pergunta.id, event.target.value)
            }
          />
        )

      case 'selecao':
        return (
          <select
            style={estilo}
            value={String(valor ?? '')}
            required={pergunta.required}
            onChange={(event) =>
              atualizarResposta(pergunta.id, event.target.value)
            }
          >
            <option value="">Selecione uma opção</option>

            {opcoes.map((opcao, indice) => (
              <option key={indice} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        )

      case 'multipla_escolha':
      case 'checkbox': {
        const selecionadas = Array.isArray(valor)
          ? (valor as string[])
          : []

        return (
          <div style={{ display: 'grid', gap: '12px' }}>
            {opcoes.map((opcao, indice) => (
              <label
                key={indice}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(opcao)}
                  onChange={(event) => {
                    const novas = event.target.checked
                      ? [...selecionadas, opcao]
                      : selecionadas.filter(
                          (item) => item !== opcao
                        )

                    atualizarResposta(pergunta.id, novas)
                  }}
                />

                {opcao}
              </label>
            ))}
          </div>
        )
      }

      case 'texto_longo':
        return (
          <textarea
            style={estilo}
            rows={4}
            placeholder="Digite sua resposta..."
            value={String(valor ?? '')}
            required={pergunta.required}
            onChange={(event) =>
              atualizarResposta(pergunta.id, event.target.value)
            }
          />
        )

      default:
        return (
          <input
            type={
              pergunta.question_type === 'email'
                ? 'email'
                : 'text'
            }
            style={estilo}
            placeholder="Digite sua resposta..."
            value={String(valor ?? '')}
            required={pergunta.required}
            onChange={(event) =>
              atualizarResposta(pergunta.id, event.target.value)
            }
          />
        )
    }
  }

  async function enviarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')

    if (!formulario || formulario.status !== 'publicado') {
      setErro('Este formulário não está disponível para respostas.')
      return
    }

    if (perguntas.length === 0) {
      setErro('Este formulário não possui perguntas.')
      return
    }

    for (const pergunta of perguntas) {
      if (!pergunta.required) continue

      const resposta = respostas[pergunta.id]

      if (
        resposta === undefined ||
        resposta === null ||
        (typeof resposta === 'string' &&
          resposta.trim() === '') ||
        (Array.isArray(resposta) &&
          resposta.length === 0)
      ) {
        setErro(`Responda à pergunta: ${pergunta.title}`)
        return
      }
    }

    setSalvando(true)

    try {
      const { data, error: erroUsuario } =
        await supabase.auth.getUser()

      if (erroUsuario || !data.user) {
        throw new Error(
          'Você precisa estar autenticada para responder.'
        )
      }

      const { error } = await supabase
        .from('form_responses')
        .insert({
          form_id: formularioId,
          user_id: data.user.id,
          answers: respostas,
          status: 'enviado',
          submitted_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(
          `Erro do Supabase: ${error.message}`
        )
      }

      setSucesso(true)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar suas respostas.'
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <section style={{ padding: '32px' }}>
        <p>Carregando formulário...</p>
      </section>
    )
  }

  return (
    <section
      style={{
        padding: '32px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <button
        type="button"
        onClick={voltarAosFormularios}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          padding: '10px 16px',
          cursor: 'pointer'
        }}
      >
        <ArrowLeft size={18} />
        Voltar aos formulários
      </button>

      {erro && (
        <p
          role="alert"
          style={{
            color: '#b91c1c',
            background: '#fef2f2',
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}
        >
          {erro}
        </p>
      )}

      {sucesso ? (
        <div
          style={{
            background: '#fff',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center'
          }}
        >
          <CheckCircle2
            size={52}
            color="#15803d"
          />

          <h1>Formulário enviado com sucesso!</h1>

          <p>
            Suas respostas foram registradas no FormGestor.
          </p>

          <button
            type="button"
            onClick={voltarAosFormularios}
            style={{
              marginTop: '16px',
              padding: '12px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Voltar aos formulários
          </button>
        </div>
      ) : formulario ? (
        <>
          <h1 style={{ marginBottom: '8px' }}>
            {formulario.title}
          </h1>

          <p style={{ marginBottom: '28px' }}>
            {formulario.description ||
              'Preencha os campos abaixo.'}
          </p>

          {formulario.status !== 'publicado' ? (
            <p style={{ color: '#92400e' }}>
              Este formulário ainda não está publicado.
            </p>
          ) : perguntas.length === 0 ? (
            <p>
              Este formulário ainda não possui perguntas.
            </p>
          ) : (
            <form
              onSubmit={(event) =>
                void enviarFormulario(event)
              }
            >
              {perguntas.map((pergunta, indice) => (
                <article
                  key={pergunta.id}
                  style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      marginTop: 0,
                      marginBottom: '14px'
                    }}
                  >
                    {indice + 1}. {pergunta.title}

                    {pergunta.required && (
                      <span style={{ color: '#dc2626' }}>
                        {' '}*
                      </span>
                    )}
                  </h3>

                  {pergunta.description && (
                    <p>{pergunta.description}</p>
                  )}

                  {renderizarCampo(pergunta)}
                </article>
              ))}

              <button
                type="submit"
                disabled={salvando}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 24px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: salvando
                    ? 'wait'
                    : 'pointer'
                }}
              >
                <Send size={18} />

                {salvando
                  ? 'Enviando respostas...'
                  : 'Enviar respostas'}
              </button>
            </form>
          )}
        </>
      ) : (
        <p>Formulário não encontrado.</p>
      )}
    </section>
  )
}
