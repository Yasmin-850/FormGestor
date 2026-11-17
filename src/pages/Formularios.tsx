
import { useEffect, useState, type FormEvent } from 'react'
import {
  ClipboardList,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Archive,
  ArchiveRestore,
  Trash2
} from 'lucide-react'
import { supabase } from '../services/supabase'

type Formulario = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
}

export default function Formularios() {
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

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
    setMensagem('')

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
      setMensagem('Formulário criado com sucesso.')
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

  async function alterarStatus(formulario: Formulario) {
    const arquivado = formulario.status === 'arquivado'
    const novoStatus = arquivado ? 'rascunho' : 'arquivado'

    const confirmado = window.confirm(
      arquivado
        ? `Deseja restaurar "${formulario.title}" como rascunho?`
        : `Deseja arquivar "${formulario.title}"?\n\nEle deixará de aparecer para os funcionários, mas suas respostas serão preservadas.`
    )

    if (!confirmado) return

    setProcessandoId(formulario.id)
    setErro('')
    setMensagem('')

    try {
      const { data, error } = await supabase
        .from('forms')
        .update({ status: novoStatus })
        .eq('id', formulario.id)
        .select('id')

      if (error) throw error

      if (!data?.length) {
        throw new Error(
          'A alteração não foi autorizada pelo banco de dados.'
        )
      }

      await carregarFormularios()

      setMensagem(
        arquivado
          ? 'Formulário restaurado como rascunho. Publique-o novamente quando desejar.'
          : 'Formulário arquivado com sucesso.'
      )
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar o status.'
      )
    } finally {
      setProcessandoId(null)
    }
  }

  async function excluirFormulario(formulario: Formulario) {
    setProcessandoId(formulario.id)
    setErro('')
    setMensagem('')

    try {
      // Verifica se o formulário já recebeu respostas.
      const { count, error: erroConsulta } = await supabase
        .from('form_responses')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formulario.id)

      if (erroConsulta) {
        console.error(
          'Erro ao consultar respostas:',
          erroConsulta
        )
        throw erroConsulta
      }

      if (count === null) {
        throw new Error(
          'Não foi possível verificar se o formulário possui respostas.'
        )
      }

      // Preserva formulários com respostas enviadas.
      if (count > 0) {
        throw new Error(
          `Não é possível excluir "${formulario.title}" porque ele possui ${count} resposta(s). Arquive o formulário para preservar o histórico.`
        )
      }

      const confirmado = window.confirm(
        `ATENÇÃO!\n\nDeseja excluir permanentemente o formulário "${formulario.title}"?\n\nAs perguntas vinculadas também poderão ser excluídas.\n\nEssa ação não poderá ser desfeita.`
      )

      if (!confirmado) return

      // O banco deve tratar as perguntas vinculadas
      // conforme a configuração da chave estrangeira.
      const { data, error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formulario.id)
        .select('id')

      if (error) {
        console.error('Erro ao excluir formulário:', {
          codigo: error.code,
          mensagem: error.message,
          detalhes: error.details,
          dica: error.hint
        })

        throw new Error(
          `Erro ${error.code || 'desconhecido'}: ${error.message}${
            error.details ? ` | Detalhes: ${error.details}` : ''
          }`
        )
      }

      if (!data?.length) {
        throw new Error(
          'O formulário não foi excluído. Verifique as permissões de exclusão no Supabase.'
        )
      }

      await carregarFormularios()
      setMensagem(
        `Formulário "${formulario.title}" excluído com sucesso.`
      )
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o formulário.'
      )
    } finally {
      setProcessandoId(null)
    }
  }

  const estiloBotao = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer'
  } as const

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
          <p>Crie, arquive, restaure e gerencie os formulários.</p>
        </div>

        <button
          type="button"
          onClick={() => setCriando(true)}
          style={{
            ...estiloBotao,
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none'
          }}
        >
          <Plus size={18} />
          Novo formulário
        </button>
      </header>

      {erro && (
        <p
          role="alert"
          style={{
            color: '#b91c1c',
            marginTop: '16px'
          }}
        >
          {erro}
        </p>
      )}

      {mensagem && (
        <p
          role="status"
          style={{
            color: '#166534',
            marginTop: '16px'
          }}
        >
          {mensagem}
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

          <label htmlFor="titulo-formulario">
            Título
          </label>

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

          <label htmlFor="descricao-formulario">
            Descrição
          </label>

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
                ...estiloBotao,
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none'
              }}
            >
              {salvando
                ? 'Salvando...'
                : 'Salvar formulário'}
            </button>

            <button
              type="button"
              onClick={() => setCriando(false)}
              disabled={salvando}
              style={estiloBotao}
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
            <p>
              Clique em Novo formulário para começar.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '16px'
            }}
          >
            {formularios.map((formulario) => {
              const ocupado =
                processandoId === formulario.id

              const arquivado =
                formulario.status === 'arquivado'

              return (
                <article
                  key={formulario.id}
                  style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '12px',
                    border: arquivado
                      ? '1px solid #cbd5e1'
                      : '1px solid transparent'
                  }}
                >
                  <h2>{formulario.title}</h2>

                  <p>
                    {formulario.description ||
                      'Sem descrição'}
                  </p>

                  <p>
                    Status:{' '}
                    <strong>
                      {formulario.status}
                    </strong>
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap',
                      marginTop: '12px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        editarFormulario(formulario.id)
                      }
                      disabled={ocupado}
                      style={{
                        ...estiloBotao,
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none'
                      }}
                    >
                      <FileSpreadsheet size={18} />
                      Editar / Importar Excel
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void alterarStatus(formulario)
                      }
                      disabled={ocupado}
                      style={{
                        ...estiloBotao,
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      {arquivado ? (
                        <ArchiveRestore size={18} />
                      ) : (
                        <Archive size={18} />
                      )}

                      {arquivado
                        ? 'Restaurar'
                        : 'Arquivar'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void excluirFormulario(formulario)
                      }
                      disabled={ocupado}
                      style={{
                        ...estiloBotao,
                        backgroundColor: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca'
                      }}
                    >
                      <Trash2 size={18} />
                      {ocupado
                        ? 'Aguarde...'
                        : 'Excluir'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void carregarFormularios()}
        style={{
          ...estiloBotao,
          marginTop: '24px'
        }}
      >
        <RefreshCw size={16} />
        Atualizar lista
      </button>
    </section>
  )
}
