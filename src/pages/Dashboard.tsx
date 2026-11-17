
import './Dashboard.css'
import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Users,
  FileCheck,
  BarChart3,
  LogOut,
  FileBarChart
} from 'lucide-react'

import { supabase } from '../services/supabase'
import Formularios from './Formularios'
import EditarFormulario from './EditarFormulario'
import ResponderFormulario from './ResponderFormulario'
import Respostas from './Respostas'
import Relatorios from './Relatorios'
import Usuarios from './Usuarios'

type DashboardProps = {
  nome: string
  onLogout: () => void
}

type Pagina =
  | 'inicio'
  | 'formularios'
  | 'respostas'
  | 'relatorios'
  | 'usuarios'
  | 'editar'
  | 'responder'

function obterPagina(): Pagina {
  const hash = window.location.hash

  if (hash.startsWith('#responder-formulario/')) {
    return 'responder'
  }

  if (hash.startsWith('#editar-formulario/')) {
    return 'editar'
  }

  if (hash === '#formularios') {
    return 'formularios'
  }

  if (hash === '#respostas') {
    return 'respostas'
  }

  if (hash === '#relatorios') {
    return 'relatorios'
  }

  if (hash === '#usuarios') {
    return 'usuarios'
  }

  return 'inicio'
}

export default function Dashboard({
  nome,
  onLogout
}: DashboardProps) {
  const [pagina, setPagina] = useState<Pagina>(obterPagina)

  const [formularios, setFormularios] = useState(0)
  const [respostas, setRespostas] = useState(0)
  const [usuarios, setUsuarios] = useState(0)

  const [erro, setErro] = useState('')

  useEffect(() => {
    function atualizarPagina() {
      setPagina(obterPagina())
    }

    window.addEventListener('hashchange', atualizarPagina)

    return () => {
      window.removeEventListener('hashchange', atualizarPagina)
    }
  }, [])

  useEffect(() => {
    if (pagina !== 'inicio') return

    let ativo = true

    async function carregarDados() {
      const resultados = await Promise.all([
        supabase
          .from('forms')
          .select('*', {
            count: 'exact',
            head: true
          }),

        supabase
          .from('form_responses')
          .select('*', {
            count: 'exact',
            head: true
          }),

        supabase
          .from('profiles')
          .select('*', {
            count: 'exact',
            head: true
          })
      ])

      if (!ativo) return

      const [forms, responses, profiles] = resultados

      if (resultados.some((resultado) => resultado.error)) {
        setErro(
          'Não foi possível carregar todos os indicadores.'
        )
      } else {
        setErro('')
      }

      setFormularios(forms.count ?? 0)
      setRespostas(responses.count ?? 0)
      setUsuarios(profiles.count ?? 0)
    }

    void carregarDados()

    return () => {
      ativo = false
    }
  }, [pagina])

  const hash = window.location.hash

  const formularioId = hash.startsWith('#editar-formulario/')
    ? hash.replace('#editar-formulario/', '')
    : hash.startsWith('#responder-formulario/')
      ? hash.replace('#responder-formulario/', '')
      : ''

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>FormGestor</h2>

        <nav>
          <a href="#inicio">
            <BarChart3 size={20} />
            Visão geral
          </a>

          <a href="#formularios">
            <ClipboardList size={20} />
            Formulários
          </a>

          <a href="#respostas">
            <FileCheck size={20} />
            Respostas
          </a>

          <a href="#relatorios">
            <FileBarChart size={20} />
            Relatórios
          </a>

          <a href="#usuarios">
            <Users size={20} />
            Usuários
          </a>
        </nav>

        <button type="button" onClick={onLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <main className="dashboard-conteudo">
        {pagina === 'inicio' && (
          <>
            <h1>Painel Administrativo</h1>

            <p>Bem-vinda, {nome}!</p>

            {erro && (
              <p role="alert">{erro}</p>
            )}

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
          </>
        )}

        {pagina === 'formularios' && (
          <Formularios />
        )}

        {pagina === 'respostas' && (
          <Respostas />
        )}

        {pagina === 'relatorios' && (
          <Relatorios />
        )}

        {pagina === 'usuarios' && (
          <Usuarios />
        )}

        {pagina === 'editar' && formularioId && (
          <EditarFormulario formularioId={formularioId} />
        )}

        {pagina === 'responder' && formularioId && (
          <ResponderFormulario formularioId={formularioId} />
        )}
      </main>
    </div>
  )
}
