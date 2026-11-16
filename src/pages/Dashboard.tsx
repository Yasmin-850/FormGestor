import './Dashboard.css'
import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Users,
  FileCheck,
  BarChart3,
  LogOut
} from 'lucide-react'
import { supabase } from '../services/supabase'

type DashboardProps = {
  nome: string
  onLogout: () => void
}

export default function Dashboard({
  nome,
  onLogout
}: DashboardProps) {
  const [formularios, setFormularios] = useState(0)
  const [respostas, setRespostas] = useState(0)
  const [usuarios, setUsuarios] = useState(0)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarDados() {
      const resultados = await Promise.all([
        supabase.from('forms').select('*', {
          count: 'exact',
          head: true
        }),
        supabase.from('form_responses').select('*', {
          count: 'exact',
          head: true
        }),
        supabase.from('profiles').select('*', {
          count: 'exact',
          head: true
        })
      ])

      const [forms, responses, profiles] = resultados

      if (resultados.some((r) => r.error)) {
        setErro('Não foi possível carregar todos os indicadores.')
      }

      setFormularios(forms.count ?? 0)
      setRespostas(responses.count ?? 0)
      setUsuarios(profiles.count ?? 0)
    }

    void carregarDados()
  }, [])

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>FormGestor</h2>

        <nav>
          <a href="#inicio">
            <BarChart3 size={20} /> Visão geral
          </a>
          <a href="#formularios">
            <ClipboardList size={20} /> Formulários
          </a>
          <a href="#usuarios">
            <Users size={20} /> Usuários
          </a>
        </nav>

        <button onClick={onLogout}>
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <main className="dashboard-conteudo" id="inicio">
        <h1>Painel Administrativo</h1>
        <p>Bem-vinda, {nome}!</p>

        {erro && <p role="alert">{erro}</p>}

        <div className="dashboard-cards">
          <div className="dashboard-card">
            <ClipboardList />
            <h3>Formulários</h3>
            <strong>{formularios}</strong>
          </div>

          <div className="dashboard-card">
            <FileCheck />
            <h3>Respostas</h3>
            <strong>{respostas}</strong>
          </div>

          <div className="dashboard-card">
            <Users />
            <h3>Usuários</h3>
            <strong>{usuarios}</strong>
          </div>
        </div>
      </main>
    </div>
  )
}
