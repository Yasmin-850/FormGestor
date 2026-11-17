
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ClipboardList, Lock, Mail, User } from 'lucide-react'
import { supabase } from './services/supabase'
import Dashboard from './pages/Dashboard'
import PainelUsuario from './pages/PainelUsuario'
import './App.css'

type Perfil = {
  full_name: string | null
  role: string
  active: boolean
}

function App() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [cadastro, setCadastro] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const [verificandoSessao, setVerificandoSessao] = useState(true)
  const [verificandoPerfil, setVerificandoPerfil] = useState(false)

  const [mensagem, setMensagem] = useState('')
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [erroPerfil, setErroPerfil] = useState('')

  useEffect(() => {
    let ativo = true

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      if (!ativo) return

      setSessao(novaSessao)
      setVerificandoSessao(false)
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!ativo) return

        if (error) {
          setMensagem(error.message)
        } else {
          setSessao(data.session)
        }

        setVerificandoSessao(false)
      })
      .catch(() => {
        if (!ativo) return

        setMensagem('Não foi possível verificar sua sessão.')
        setVerificandoSessao(false)
      })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  const usuarioId = sessao?.user.id

  const buscarPerfil = useCallback(
    async (mostrarCarregamento = false) => {
      if (!usuarioId) return

      if (mostrarCarregamento) {
        setVerificandoPerfil(true)
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role, active')
          .eq('id', usuarioId)
          .single()

        if (error) {
          setErroPerfil(
            'Não foi possível verificar seu perfil: ' +
              error.message
          )
          return
        }

        setPerfil(data as Perfil)
        setErroPerfil('')
      } catch {
        setErroPerfil(
          'Não foi possível verificar seu perfil. Tente novamente.'
        )
      } finally {
        if (mostrarCarregamento) {
          setVerificandoPerfil(false)
        }
      }
    },
    [usuarioId]
  )

  useEffect(() => {
    if (!usuarioId) {
      setPerfil(null)
      setErroPerfil('')
      setVerificandoPerfil(false)
      return
    }

    setPerfil(null)
    void buscarPerfil(true)
  }, [usuarioId, buscarPerfil])

  useEffect(() => {
    if (!usuarioId) return

    function verificarAoRetornar() {
      if (document.visibilityState === 'visible') {
        void buscarPerfil()
      }
    }

    function verificarAoFocar() {
      void buscarPerfil()
    }

    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void buscarPerfil()
      }
    }, 30000)

    document.addEventListener(
      'visibilitychange',
      verificarAoRetornar
    )

    window.addEventListener('focus', verificarAoFocar)

    return () => {
      window.clearInterval(intervalo)

      document.removeEventListener(
        'visibilitychange',
        verificarAoRetornar
      )

      window.removeEventListener('focus', verificarAoFocar)
    }
  }, [usuarioId, buscarPerfil])

  async function autenticar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCarregando(true)
    setMensagem('')

    try {
      if (cadastro) {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              full_name: nome
            }
          }
        })

        if (error) throw error

        setMensagem(
          'Cadastro solicitado! Verifique seu e-mail para confirmar sua conta, se necessário.'
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha
        })

        if (error) throw error

        setSenha('')
      }
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro. Tente novamente.'
      )
    } finally {
      setCarregando(false)
    }
  }

  async function sair() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Não foi possível sair: ' + error.message)
      return
    }

    setPerfil(null)
    setSenha('')
    setMensagem('')
  }

  if (verificandoSessao || (sessao && verificandoPerfil)) {
    return (
      <main className="pagina-login">
        <p>Carregando FormGestor...</p>
      </main>
    )
  }

  if (sessao) {
    if (erroPerfil || !perfil) {
      return (
        <main className="pagina-login">
          <section className="login-card">
            <h1>FormGestor</h1>

            <p role="alert">
              {erroPerfil || 'Perfil não encontrado.'}
            </p>

            <button
              type="button"
              className="botao-entrar"
              onClick={() => void buscarPerfil(true)}
            >
              Tentar novamente
            </button>

            <button
              type="button"
              className="alternar-auth"
              onClick={() => void sair()}
            >
              Sair da conta
            </button>
          </section>
        </main>
      )
    }

    if (!perfil.active) {
      return (
        <main className="pagina-login">
          <section className="login-card">
            <div className="logo">
              <Lock size={32} />
            </div>

            <h1>Conta desativada</h1>

            <p role="alert">
              Sua conta foi desativada.
              Entre em contato com o administrador.
            </p>

            <button
              type="button"
              className="botao-entrar"
              onClick={() => void sair()}
            >
              Sair da conta
            </button>
          </section>
        </main>
      )
    }

    if (perfil.role === 'administrador') {
      return (
        <Dashboard
          nome={
            perfil.full_name ||
            sessao.user.email ||
            'Administrador'
          }
          onLogout={sair}
        />
      )
    }

    if (
      perfil.role === 'lider' ||
      perfil.role === 'funcionario'
    ) {
      return (
        <PainelUsuario
          nome={
            perfil.full_name ||
            sessao.user.email ||
            'Usuário'
          }
          role={perfil.role}
          onLogout={sair}
        />
      )
    }

    return (
      <main className="pagina-login">
        <section className="login-card">
          <h1>Acesso não autorizado</h1>

          <p>
            Seu perfil não possui uma função válida.
          </p>

          <button
            type="button"
            className="botao-entrar"
            onClick={() => void sair()}
          >
            Sair da conta
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="pagina-login">
      <section className="login-card">
        <div className="logo">
          <ClipboardList size={32} />
        </div>

        <h1>FormGestor</h1>

        <p className="subtitulo">
          Sistema de Gestão de Formulários
        </p>

        <form onSubmit={autenticar}>
          {cadastro && (
            <>
              <label htmlFor="nome">
                Nome completo
              </label>

              <div className="campo">
                <User size={19} />

                <input
                  id="nome"
                  type="text"
                  placeholder="Digite seu nome"
                  value={nome}
                  onChange={(event) =>
                    setNome(event.target.value)
                  }
                  required
                />
              </div>
            </>
          )}

          <label htmlFor="email">
            E-mail
          </label>

          <div className="campo">
            <Mail size={19} />

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <label htmlFor="senha">
            Senha
          </label>

          <div className="campo">
            <Lock size={19} />

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) =>
                setSenha(event.target.value)
              }
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="botao-entrar"
            disabled={carregando}
          >
            {carregando
              ? 'Aguarde...'
              : cadastro
                ? 'Criar conta'
                : 'Entrar no sistema'}
          </button>

          {mensagem && (
            <p
              role="status"
              className="mensagem-auth"
            >
              {mensagem}
            </p>
          )}
        </form>

        <button
          type="button"
          className="alternar-auth"
          onClick={() => {
            setCadastro(!cadastro)
            setMensagem('')
          }}
        >
          {cadastro
            ? 'Já possui uma conta? Entrar'
            : 'Não possui uma conta? Cadastre-se'}
        </button>

        <p className="rodape">
          FormGestor © 2026
        </p>
      </section>
    </main>
  )
}

export default App
