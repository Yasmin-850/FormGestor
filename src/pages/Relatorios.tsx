
import { useEffect, useState } from 'react'
import {
  BarChart3,
  ClipboardList,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  RefreshCw
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import { supabase } from '../services/supabase'

type Formulario = {
  id: string
  title: string
}

type Resposta = {
  id: string
  form_id: string
  status: string
  submitted_at: string | null
  answers: Record<string, unknown>
}

type Pergunta = {
  id: string
  form_id: string
  title: string
  position: number
}

type DadoGrafico = {
  nome: string
  respostas: number
}

type LinhaExportacao = Record<string, string | number>

function formatarData(data: string | null): string {
  if (!data) return 'Data não informada'

  const valor = new Date(data)

  return Number.isNaN(valor.getTime())
    ? 'Data inválida'
    : valor.toLocaleString('pt-BR')
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

// Impede que textos fornecidos por usuários sejam interpretados
// como fórmulas ao abrir o arquivo em programas de planilhas.
function protegerCelula(valor: string): string {
  return /^[\s]*[=+\-@\t\r]/.test(valor)
    ? "'" + valor
    : valor
}

function nomeArquivo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'relatorio'
}

export default function Relatorios() {
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])

  const [carregando, setCarregando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('')

  async function buscarTodasRespostas(): Promise<Resposta[]> {
    const todas: Resposta[] = []
    const tamanhoPagina = 500

    for (let inicio = 0; ; inicio += tamanhoPagina) {
      const { data, error } = await supabase
        .from('form_responses')
        .select('id, form_id, status, submitted_at, answers')
        .eq('status', 'enviado')
        .order('id', { ascending: true })
        .range(inicio, inicio + tamanhoPagina - 1)

      if (error) throw error

      const pagina = (data ?? []) as Resposta[]
      todas.push(...pagina)

      if (pagina.length < tamanhoPagina) break
    }

    return todas
  }

  async function buscarTodasPerguntas(): Promise<Pergunta[]> {
    const todas: Pergunta[] = []
    const tamanhoPagina = 500

    for (let inicio = 0; ; inicio += tamanhoPagina) {
      const { data, error } = await supabase
        .from('form_questions')
        .select('id, form_id, title, position')
        .order('id', { ascending: true })
        .range(inicio, inicio + tamanhoPagina - 1)

      if (error) throw error

      const pagina = (data ?? []) as Pergunta[]
      todas.push(...pagina)

      if (pagina.length < tamanhoPagina) break
    }

    return todas
  }

  async function carregarDados() {
    setCarregando(true)
    setErro('')

    try {
      const [resultadoFormularios, todasRespostas, todasPerguntas] =
        await Promise.all([
          supabase.from('forms').select('id, title'),
          buscarTodasRespostas(),
          buscarTodasPerguntas()
        ])

      if (resultadoFormularios.error) {
        throw resultadoFormularios.error
      }

      setFormularios(resultadoFormularios.data ?? [])
      setRespostas(todasRespostas)
      setPerguntas(todasPerguntas)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os relatórios.'
      )
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregarDados()
  }, [])

  const respostasFiltradas = filtro
    ? respostas.filter((resposta) => resposta.form_id === filtro)
    : respostas

  const formulariosFiltrados = formularios.filter(
    (formulario) => !filtro || formulario.id === filtro
  )

  const formulariosComRespostas = new Set(
    respostasFiltradas.map((resposta) => resposta.form_id)
  ).size

  const dadosGrafico: DadoGrafico[] = formulariosFiltrados.map(
    (formulario) => ({
      nome: formulario.title,
      respostas: respostasFiltradas.filter(
        (resposta) => resposta.form_id === formulario.id
      ).length
    })
  )

  function tituloFormulario(id: string): string {
    return formularios.find(
      (formulario) => formulario.id === id
    )?.title ?? 'Formulário não encontrado'
  }

  function perguntasDaResposta(resposta: Resposta) {
    const perguntasDoFormulario = perguntas
      .filter((pergunta) => pergunta.form_id === resposta.form_id)
      .sort((a, b) => a.position - b.position)

    const identificadores = new Set(
      perguntasDoFormulario.map((pergunta) => pergunta.id)
    )

    const resultado = perguntasDoFormulario.map((pergunta) => ({
      id: pergunta.id,
      titulo: pergunta.title,
      valor: formatarValor(
        resposta.answers?.[pergunta.id]
      )
    }))

    // Preserva também respostas de perguntas que tenham sido
    // excluídas ou alteradas depois do envio.
    for (const [id, valor] of Object.entries(resposta.answers ?? {})) {
      if (!identificadores.has(id)) {
        resultado.push({
          id,
          titulo: `Pergunta antiga (${id})`,
          valor: formatarValor(valor)
        })
      }
    }

    return resultado
  }

  function prepararLinhasExcel(): LinhaExportacao[] {
    return respostasFiltradas.map((resposta) => {
      const linha: LinhaExportacao = {
        'ID da resposta': resposta.id,
        'Formulário': protegerCelula(
          tituloFormulario(resposta.form_id)
        ),
        'Status': resposta.status,
        'Data de envio': formatarData(resposta.submitted_at)
      }

      for (const pergunta of perguntasDaResposta(resposta)) {
        // O ID evita colisões quando duas perguntas possuem
        // exatamente o mesmo título.
        const coluna = `${pergunta.titulo} [${pergunta.id}]`

        linha[protegerCelula(coluna)] =
          protegerCelula(pergunta.valor)
      }

      return linha
    })
  }

  function obterNomeRelatorio(): string {
    const titulo = filtro
      ? tituloFormulario(filtro)
      : 'todos_os_formularios'

    const data = new Date().toISOString().slice(0, 10)

    return `relatorio_${nomeArquivo(titulo)}_${data}`
  }

  async function exportarExcel() {
    if (respostasFiltradas.length === 0) {
      setErro('Não existem respostas para exportar.')
      return
    }

    setExportando(true)
    setErro('')

    try {
      const XLSX = await import('xlsx')

      const linhas = prepararLinhasExcel()

      const planilha = XLSX.utils.json_to_sheet(linhas)

      planilha['!cols'] = [
        { wch: 38 },
        { wch: 35 },
        { wch: 16 },
        { wch: 24 },
        ...Array.from(
          { length: Math.max(0, Object.keys(linhas[0]).length - 4) },
          () => ({ wch: 38 })
        )
      ]

      const arquivo = XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(
        arquivo,
        planilha,
        'Respostas'
      )

      const resumo = XLSX.utils.json_to_sheet([
        {
          'Indicador': 'Respostas enviadas',
          'Quantidade': respostasFiltradas.length
        },
        {
          'Indicador': 'Formulários com respostas',
          'Quantidade': formulariosComRespostas
        },
        {
          'Indicador': 'Formulários cadastrados no filtro',
          'Quantidade': formulariosFiltrados.length
        }
      ])

      resumo['!cols'] = [
        { wch: 40 },
        { wch: 20 }
      ]

      XLSX.utils.book_append_sheet(
        arquivo,
        resumo,
        'Resumo'
      )

      XLSX.writeFile(
        arquivo,
        `${obterNomeRelatorio()}.xlsx`
      )
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao exportar o Excel.'
      )
    } finally {
      setExportando(false)
    }
  }

  async function exportarPDF() {
    if (respostasFiltradas.length === 0) {
      setErro('Não existem respostas para exportar.')
      return
    }

    setExportando(true)
    setErro('')

    try {
      const { jsPDF } = await import('jspdf')

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const larguraPagina = pdf.internal.pageSize.getWidth()
      const alturaPagina = pdf.internal.pageSize.getHeight()
      const margem = 18
      const larguraTexto = larguraPagina - margem * 2
      const limiteInferior = alturaPagina - 20

      let y = 22
      let numeroPagina = 1

      function novaPagina() {
        pdf.addPage()
        numeroPagina += 1
        y = 22
      }

      function garantirEspaco(altura: number) {
        if (y + altura > limiteInferior) {
          novaPagina()
        }
      }

      function adicionarTexto(
        conteudo: string,
        tamanho = 10,
        negrito = false
      ) {
        pdf.setFont(
          'helvetica',
          negrito ? 'bold' : 'normal'
        )
        pdf.setFontSize(tamanho)

        // jsPDF usa fontes básicas por padrão.
        // O texto é normalizado para evitar caracteres
        // que não podem ser representados nessas fontes.
        const texto = conteudo
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\x20-\x7E]/g, '?')

        const linhas = pdf.splitTextToSize(
          texto,
          larguraTexto
        ) as string[]

        const alturaLinha = tamanho * 0.42 + 1.5

        for (const linha of linhas) {
          garantirEspaco(alturaLinha)

          pdf.text(linha, margem, y)
          y += alturaLinha
        }
      }

      adicionarTexto('FORMGESTOR', 18, true)
      y += 3

      adicionarTexto('Relatorio de formularios', 15, true)
      y += 5

      adicionarTexto(
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`
      )

      adicionarTexto(
        `Filtro: ${
          filtro ? tituloFormulario(filtro) : 'Todos os formularios'
        }`
      )

      y += 6

      adicionarTexto('RESUMO', 13, true)
      y += 3

      adicionarTexto(
        `Respostas enviadas: ${respostasFiltradas.length}`
      )

      adicionarTexto(
        `Formularios com respostas: ${formulariosComRespostas}`
      )

      adicionarTexto(
        `Formularios cadastrados no filtro: ${formulariosFiltrados.length}`
      )

      y += 7

      adicionarTexto('RESPOSTAS DETALHADAS', 13, true)
      y += 5

      respostasFiltradas.forEach((resposta, indice) => {
        garantirEspaco(35)

        pdf.setDrawColor(210, 220, 230)
        pdf.line(margem, y, larguraPagina - margem, y)

        y += 6

        adicionarTexto(
          `${indice + 1}. ${tituloFormulario(resposta.form_id)}`,
          12,
          true
        )

        y += 2

        adicionarTexto(
          `Enviado em: ${formatarData(resposta.submitted_at)}`
        )

        adicionarTexto(`Status: ${resposta.status}`)

        y += 4

        const itens = perguntasDaResposta(resposta)

        if (itens.length === 0) {
          adicionarTexto('Nenhuma resposta registrada.')
        }

        itens.forEach((pergunta) => {
          garantirEspaco(15)

          adicionarTexto(pergunta.titulo, 10, true)
          adicionarTexto(pergunta.valor, 10)

          y += 3
        })

        y += 8
      })

      // Insere a numeração após todas as páginas terem sido criadas.
      const totalPaginas = pdf.getNumberOfPages()

      for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        pdf.setPage(pagina)
        pdf.setFontSize(9)
        pdf.setTextColor(100, 116, 139)

        pdf.text(
          `FormGestor - Pagina ${pagina} de ${totalPaginas}`,
          margem,
          alturaPagina - 10
        )
      }

      pdf.save(`${obterNomeRelatorio()}.pdf`)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao exportar o PDF.'
      )
    } finally {
      setExportando(false)
    }
  }

  const cardStyle = {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0'
  }

  const botaoStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    cursor: 'pointer'
  }

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
          <h1>Relatórios</h1>
          <p>Acompanhe os resultados dos formulários.</p>
        </div>

        <button
          type="button"
          onClick={() => void carregarDados()}
          disabled={carregando || exportando}
          style={botaoStyle}
        >
          <RefreshCw size={18} />
          Atualizar
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

      <div style={{ marginTop: '24px' }}>
        <label htmlFor="filtro-relatorio">
          <strong>Filtrar por formulário</strong>
        </label>

        <select
          id="filtro-relatorio"
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
            <option
              key={formulario.id}
              value={formulario.id}
            >
              {formulario.title}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '20px'
        }}
      >
        <button
          type="button"
          onClick={() => void exportarExcel()}
          disabled={
            carregando ||
            exportando ||
            respostasFiltradas.length === 0
          }
          style={{
            ...botaoStyle,
            background: '#15803d',
            color: '#fff',
            border: 'none'
          }}
        >
          <FileSpreadsheet size={18} />
          Exportar Excel
          <Download size={16} />
        </button>

        <button
          type="button"
          onClick={() => void exportarPDF()}
          disabled={
            carregando ||
            exportando ||
            respostasFiltradas.length === 0
          }
          style={{
            ...botaoStyle,
            background: '#dc2626',
            color: '#fff',
            border: 'none'
          }}
        >
          <FileText size={18} />
          Exportar PDF
          <Download size={16} />
        </button>
      </div>

      {exportando && (
        <p role="status">
          Preparando arquivo para download...
        </p>
      )}

      {carregando ? (
        <p style={{ marginTop: '24px' }}>
          Carregando relatórios...
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginTop: '24px'
            }}
          >
            <div style={cardStyle}>
              <FileCheck size={26} />
              <h3>Respostas enviadas</h3>
              <strong style={{ fontSize: '32px' }}>
                {respostasFiltradas.length}
              </strong>
            </div>

            <div style={cardStyle}>
              <ClipboardList size={26} />
              <h3>Formulários com respostas</h3>
              <strong style={{ fontSize: '32px' }}>
                {formulariosComRespostas}
              </strong>
            </div>

            <div style={cardStyle}>
              <BarChart3 size={26} />
              <h3>Formulários cadastrados</h3>
              <strong style={{ fontSize: '32px' }}>
                {formulariosFiltrados.length}
              </strong>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              marginTop: '24px'
            }}
          >
            <h2>Respostas por formulário</h2>

            {dadosGrafico.length === 0 ? (
              <p>Nenhum formulário encontrado.</p>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 350
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={dadosGrafico}
                    margin={{
                      top: 20,
                      right: 20,
                      left: 0,
                      bottom: 50
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="nome"
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={75}
                    />

                    <YAxis allowDecimals={false} />

                    <Tooltip />

                    <Bar
                      dataKey="respostas"
                      name="Respostas enviadas"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
