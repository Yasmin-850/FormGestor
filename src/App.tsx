
import { useState, type FormEvent } from 'react'
import { ClipboardList, Lock, Mail, User } from 'lucide-react'
import { supabase } from './services/supabase'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [cadastro, setCadastro] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')

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

        setMensagem('Login realizado com sucesso!')
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
              <label htmlFor="nome">Nome completo</label>
              <div className="campo">
                <User size={19} />
                <input
                  id="nome"
                  type="text"
                  placeholder="Digite seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <label htmlFor="email">E-mail</label>
          <div className="campo">
            <Mail size={19} />
            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label htmlFor="senha">Senha</label>
          <div className="campo">
            <Lock size={19} />
            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
            <p role="status" className="mensagem-auth">
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

        <p className="rodape">FormGestor © 2026</p>
      </section>
    </main>
  )
}

export default App
