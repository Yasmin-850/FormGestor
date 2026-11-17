
import { useEffect, useState } from 'react'
import {
  ClipboardList,
  FileText,
  LogOut,
  RefreshCw,
  History,
  CalendarDays,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '../services/supabase'
import ResponderFormulario from './ResponderFormulario'

type Formulario = {
  id: string
  title: string
  description: string | null
  status: string
}

type Resposta = {
  id: string
  form_id: string
  user_id: string
  answers: Record<string, unknown> | null
  status: string
  submitted_at: string | null
}

type Pergunta = {
  id: string
  form_id: string
  title: string
  position: number
}

type Props = {
  nome: string
  role: string
  onLogout: () => void | Promise<void>
}

type Aba = 'formularios' | 'minhas-respostas'

function formatarData(data: string | null) {
  if (!data) return 'Data não informada'

  const valor = new Date(data)

  if (Number.isNaN(valor.getTime())) {
    return 'Data não informada'
  }

  return valor.toLocaleString('pt-BR')
}

function formatarResposta(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') {
    return 'Não respondido'
  }

  if (Array.isArray(valor)) {
    return valor.length
      ? valor.map(String).join(', ')
      : 'Não respondido'
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não'
  }

  if (typeof valor === 'object') {
    return JSON.stringify(valor)
  }

  return String(valor)
}

export default function PainelUsuario({
  nome,
  role,
  onLogout
}: Props) {
  const [aba, setAba] = useState<Aba>('formularios')
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])

  const [formularioSelecionado, setFormularioSelecionado] =
    useState<string | null>(null)

  const [respostaSelecionada, setRespostaSelecionada] =
    useState<string | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const nomeFuncao =
    role === 'lider' ? 'Líder' : 'Funcionário'

  async function carregarFormularios() {
    setCarregando(true)
    setErro('')

    try {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title, description, status')
        .eq('status', 'publicado')
        .order('title', { ascending: true })

      if (error) throw error

      setFormularios(data ?? [])
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os formulários.'
      )
    } finally {
      setCarregando(false)
    }
  }

  async function carregarRespostas() {
    setCarregando(true)
    setErro('')

    try {
      const { data: usuario, error: erroUsuario } =
        await supabase.auth.getUser()

      if (erroUsuario || !usuario.user) {
        throw new Error('Sua sessão não está disponível.')
      }

      const { data, error } = await supabase
        .from('form_responses')
        .select(
          'id, form_id, user_id, answers, status, submitted_at'
        )
        .eq('user_id', usuario.user.id)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      setRespostas((data ?? []) as Resposta[])

      const idsFormularios = [
        ...new Set((data ?? []).map((item) => item.form_id))
      ]

      if (idsFormularios.length === 0) {
        setPerguntas([])
        return
      }

      const { data: dadosPerguntas, error: erroPerguntas } =
        await supabase
          .from('form_questions')
          .select('id, form_id, title, position')
          .in('form_id', idsFormularios)
          .order('position', { ascending: true })

      if (erroPerguntas) throw erroPerguntas

      setPerguntas(dadosPerguntas ?? [])
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar suas respostas.'
      )
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregarFormularios()
  }, [])

  function mudarAba(novaAba: Aba) {
    setAba(novaAba)
    setFormularioSelecionado(null)
    setRespostaSelecionada(null)

    if (novaAba === 'formularios') {
      void carregarFormularios()
    } else {
      void carregarRespostas()
    }
  }

  function nomeFormulario(id: string) {
    return (
      formularios.find((item) => item.id === id)?.title ||
      'Formulário'
    )
  }

  const respostaAtual = respostas.find(
    (item) => item.id === respostaSelecionada
  )

  const perguntasDaResposta = respostaAtual
    ? perguntas.filter(
        (pergunta) => pergunta.form_id === respostaAtual.form_id
      )
    : []

  const botaoAba = (selecionada: boolean) => ({
    padding: '12px 18px',
    border: 'none',
    borderRadius: '8px',
    background: selecionada ? '#2563eb' : '#e2e8f0',
    color: selecionada ? '#fff' : '#334155',
    fontWeight: 600 as const,
    cursor: 'pointer' as const,
    display: 'flex',
    alignItems: 'center' as const,
    gap: '8px'
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <header
        style={{
          background: '#0f172a',
          color: '#fff',
          padding: '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>FormGestor</h2>
          <small>Painel do {nomeFuncao}</small>
        </div>

        <button
          type="button"
          onClick={() => void onLogout()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            cursor: 'pointer'
          }}
        >
          <LogOut size={18} />
          Sair
        </button>
      </header>

      <main
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '32px 20px'
        }}
      >
        <h1>Olá, {nome}!</h1>
        <p>
          Consulte os formulários disponíveis e acompanhe
          suas respostas enviadas.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
            marginBottom: '28px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            style={botaoAba(aba === 'formularios')}
            onClick={() => mudarAba('formularios')}
          >
            <ClipboardList size={18} />
            Formulários disponíveis
          </button>

          <button
            type="button"
            style={botaoAba(aba === 'minhas-respostas')}
            onClick={() => mudarAba('minhas-respostas')}
          >
            <History size={18} />
            Minhas respostas
          </button>
        </div>

        {formularioSelecionado ? (
          <ResponderFormulario
            formularioId={formularioSelecionado}
            onVoltar={() => {
              setFormularioSelecionado(null)
              void carregarFormularios()
            }}
          />
        ) : aba === 'formularios' ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px'
              }}
            >
              <h2 style={{ margin: 0 }}>
                Formulários disponíveis
              </h2>

              <button
                type="button"
                onClick={() => void carregarFormularios()}
                disabled={carregando}
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>

            {erro && (
              <p role="alert" style={{ color: '#b91c1c' }}>
                {erro}
              </p>
            )}

            {carregando ? (
              <p>Carregando formulários...</p>
            ) : formularios.length === 0 ? (
              <p>Nenhum formulário publicado no momento.</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '16px'
                }}
              >
                {formularios.map((formulario) => (
                  <article
                    key={formulario.id}
                    style={{
                      background: '#fff',
                      padding: '24px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <FileText size={28} color="#2563eb" />

                    <h3>{formulario.title}</h3>

                    <p>
                      {formulario.description ||
                        'Formulário disponível para preenchimento.'}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setFormularioSelecionado(formulario.id)
                      }
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 18px',
                        cursor: 'pointer'
                      }}
                    >
                      Responder formulário
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : respostaAtual ? (
          <section
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px'
            }}
          >
            <button
              type="button"
              onClick={() => setRespostaSelecionada(null)}
            >
              Voltar às minhas respostas
            </button>

            <h2>{nomeFormulario(respostaAtual.form_id)}</h2>

            <p>
              <CalendarDays size={16} />
              {' '}
              Enviado em {formatarData(respostaAtual.submitted_at)}
            </p>

            <p>
              <CheckCircle2 size={16} color="#15803d" />
              {' '}
              Status: {respostaAtual.status}
            </p>

            <h3>Respostas registradas</h3>

            {Object.entries(respostaAtual.answers ?? {}).map(
              ([perguntaId, valor]) => {
                const pergunta = perguntasDaResposta.find(
                  (item) => item.id === perguntaId
                )

                return (
                  <article
                    key={perguntaId}
                    style={{
                      padding: '14px 0',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <strong>
                      {pergunta?.title ||
                        `Pergunta ${perguntaId}`}
                    </strong>

                    <p>{formatarResposta(valor)}</p>
                  </article>
                )
              }
            )}
          </section>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px'
              }}
            >
              <h2 style={{ margin: 0 }}>
                Minhas respostas
              </h2>

              <button
                type="button"
                onClick={() => void carregarRespostas()}
                disabled={carregando}
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>

            {erro && (
              <p role="alert" style={{ color: '#b91c1c' }}>
                {erro}
              </p>
            )}

            {carregando ? (
              <p>Carregando suas respostas...</p>
            ) : respostas.length === 0 ? (
              <div
                style={{
                  background: '#fff',
                  padding: '28px',
                  borderRadius: '12px'
                }}
              >
                <p>
                  Você ainda não enviou nenhuma resposta.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {respostas.map((resposta) => (
                  <article
                    key={resposta.id}
                    style={{
                      background: '#fff',
                      padding: '22px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <h3>
                      {nomeFormulario(resposta.form_id)}
                    </h3>

                    <p>
                      Enviado em{' '}
                      {formatarData(resposta.submitted_at)}
                    </p>

                    <p>Status: {resposta.status}</p>

                    <button
                      type="button"
                      onClick={() =>
                        setRespostaSelecionada(resposta.id)
                      }
                      style={{
                        padding: '10px 16px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Visualizar respostas
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
