
import { useState, type ChangeEvent } from 'react'
import * as XLSX from 'xlsx'
import {
  CheckCircle2,
  FileSpreadsheet,
  Save
} from 'lucide-react'
import { supabase } from '../services/supabase'

type Area = {
  nome: string
  linha: number
}

type AbaChecklist = {
  nome: string
  titulo: string
  areas: Area[]
  observacoes: string[]
}

type ImportarPlanilhaProps = {
  formularioId: string
}

type TipoPergunta =
  | 'texto'
  | 'texto_longo'
  | 'numero'
  | 'data'
  | 'selecao'
  | 'multipla_escolha'
  | 'checkbox'
  | 'email'

type Pergunta = {
  form_id: string
  title: string
  description: string | null
  question_type: TipoPergunta
  required: boolean
  options: string[]
  position: number
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

function textoCelula(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return ''
  }

  return String(valor).trim()
}

function analisarAba(
  nome: string,
  planilha: XLSX.WorkSheet
): AbaChecklist {
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(
    planilha,
    {
      header: 1,
      defval: '',
      blankrows: false
    }
  )

  let titulo = nome
  let indiceCabecalho = -1

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].map(textoCelula)

    const tituloEncontrado = linha.find((celula) =>
      normalizar(celula).includes(
        'CHECKLIST HIGIENIZACAO'
      )
    )

    if (tituloEncontrado) {
      titulo = tituloEncontrado
    }

    if (
      normalizar(linha[0] || '').includes(
        'AREAS HIGIENIZADAS'
      )
    ) {
      indiceCabecalho = i
      break
    }
  }

  if (indiceCabecalho === -1) {
    return {
      nome,
      titulo,
      areas: [],
      observacoes: []
    }
  }

  const areas: Area[] = []
  const observacoes: string[] = []

  let terminouTabela = false

  for (
    let i = indiceCabecalho + 1;
    i < linhas.length;
    i++
  ) {
    const linha = linhas[i].map(textoCelula)
    const primeira = linha[0] || ''
    const texto = normalizar(primeira)

    if (!primeira) continue

    if (
      texto.startsWith('LIDER') ||
      texto.startsWith('EM CASO') ||
      texto.startsWith('CONSIDERAR PARA') ||
      texto.startsWith('FCM-POP')
    ) {
      terminouTabela = true
    }

    if (terminouTabela) {
      if (primeira.length > 10) {
        observacoes.push(primeira)
      }

      continue
    }

    areas.push({
      nome: primeira.replace(/\s+/g, ' ').trim(),
      linha: i + 1
    })
  }

  return {
    nome,
    titulo,
    areas,
    observacoes
  }
}

export default function ImportarPlanilha({
  formularioId
}: ImportarPlanilhaProps) {
  const [arquivoNome, setArquivoNome] = useState('')
  const [abas, setAbas] = useState<AbaChecklist[]>([])
  const [abaSelecionada, setAbaSelecionada] =
    useState(0)

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [carregando, setCarregando] =
    useState(false)

  const [salvando, setSalvando] =
    useState(false)

  const [confirmarAdicao, setConfirmarAdicao] =
    useState(false)

  async function importarArquivo(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = event.target.files?.[0]

    if (!arquivo) return

    setErro('')
    setSucesso('')
    setAbas([])
    setAbaSelecionada(0)
    setConfirmarAdicao(false)
    setArquivoNome(arquivo.name)
    setCarregando(true)

    try {
      const buffer = await arquivo.arrayBuffer()

      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true
      })

      const encontradas = workbook.SheetNames.map(
        (nome) =>
          analisarAba(
            nome,
            workbook.Sheets[nome]
          )
      )

      const validas = encontradas.filter(
        (aba) => aba.areas.length > 0
      )

      if (validas.length === 0) {
        throw new Error(
          'Não foram encontradas tabelas com ' +
          'o cabeçalho ÁREAS HIGIENIZADAS.'
        )
      }

      setAbas(validas)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível importar a planilha.'
      )
    } finally {
      setCarregando(false)
    }
  }

  const abaAtual = abas[abaSelecionada]

  function gerarPerguntas(
    aba: AbaChecklist
  ): Pergunta[] {
    const perguntas: Pergunta[] = []

    function adicionar(
      titulo: string,
      tipo: TipoPergunta,
      opcoes: string[] = [],
      obrigatoria = false
    ) {
      perguntas.push({
        form_id: formularioId,
        title: titulo,
        description:
          `Origem: ${arquivoNome} | Aba: ${aba.nome}`,
        question_type: tipo,
        required: obrigatoria,
        options: opcoes,
        position: perguntas.length + 1
      })
    }

    // Data da higienização
    adicionar(
      'Data da higienização',
      'data',
      [],
      true
    )

    // Perguntas para cada área identificada
    aba.areas.forEach((area) => {
      adicionar(
        `${area.nome} — Higienização realizada?`,
        'selecao',
        ['SIM', 'NÃO'],
        true
      )

      adicionar(
        `${area.nome} — Tipo de higienização`,
        'selecao',
        ['TERMINAL', 'CONCORRENTE']
      )

      adicionar(
        `${area.nome} — Responsável`,
        'texto'
      )

      adicionar(
        `${area.nome} — Observação`,
        'texto_longo'
      )
    })

    // Identificação do líder
    adicionar(
      'Líder',
      'texto'
    )

    return perguntas
  }

  async function salvarPerguntas() {
    if (!abaAtual || salvando) return

    setErro('')
    setSucesso('')
    setSalvando(true)

    try {
      const {
        data: usuario,
        error: erroUsuario
      } = await supabase.auth.getUser()

      if (erroUsuario || !usuario.user) {
        throw new Error(
          'Sua sessão expirou. Faça login novamente.'
        )
      }

      const {
        data: formulario,
        error: erroFormulario
      } = await supabase
        .from('forms')
        .select('id, status')
        .eq('id', formularioId)
        .single()

      if (erroFormulario) {
        throw new Error(
          `Erro ao consultar formulário: ${erroFormulario.message}`
        )
      }

      if (!formulario) {
        throw new Error(
          'Formulário não encontrado.'
        )
      }

      if (formulario.status !== 'rascunho') {
        throw new Error(
          'Só é possível importar perguntas ' +
          'para formulários em rascunho.'
        )
      }

      const {
        count,
        error: erroContagem
      } = await supabase
        .from('form_questions')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('form_id', formularioId)

      if (erroContagem) {
        throw new Error(
          `Erro ao consultar perguntas: ${erroContagem.message}`
        )
      }

      const quantidadeExistente = count ?? 0

      if (
        quantidadeExistente > 0 &&
        !confirmarAdicao
      ) {
        throw new Error(
          'Este formulário já possui perguntas. ' +
          'Marque a confirmação abaixo para adicionar ' +
          'novas perguntas sem apagar as anteriores.'
        )
      }

      const perguntas = gerarPerguntas(
        abaAtual
      ).map((pergunta) => ({
        ...pergunta,
        position:
          pergunta.position + quantidadeExistente
      }))

      const {
        error: erroSalvar
      } = await supabase
        .from('form_questions')
        .insert(perguntas)

      if (erroSalvar) {
        console.error(
          'Erro ao salvar no Supabase:',
          erroSalvar
        )

        throw new Error(
          `Erro do Supabase: ${erroSalvar.message}` +
          (
            erroSalvar.code
              ? ` (Código: ${erroSalvar.code})`
              : ''
          )
        )
      }

      setSucesso(
        `${perguntas.length} perguntas salvas ` +
        'com sucesso no Supabase!'
      )

      setConfirmarAdicao(false)
      setAbas([])
    } catch (error) {
      console.error(
        'Erro na importação:',
        error
      )

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar as perguntas.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const perguntas = abaAtual
    ? gerarPerguntas(abaAtual)
    : []

  return (
    <section style={{ width: '100%' }}>
      <h2>
        Importar checklist de higienização
      </h2>

      <p>
        Selecione uma planilha Excel para
        identificar automaticamente as áreas
        e perguntas.
      </p>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(event) =>
          void importarArquivo(event)
        }
        disabled={carregando || salvando}
      />

      {carregando && (
        <p>Analisando planilha...</p>
      )}

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

      {sucesso && (
        <p
          role="status"
          style={{
            color: '#15803d',
            fontWeight: 600,
            marginTop: '16px'
          }}
        >
          <CheckCircle2
            size={18}
            style={{
              display: 'inline'
            }}
          />
          {' '}
          {sucesso}
        </p>
      )}

      {abaAtual && (
        <div style={{ marginTop: '28px' }}>
          <p style={{ color: '#15803d' }}>
            <CheckCircle2
              size={20}
              style={{
                display: 'inline'
              }}
            />
            {' '}
            Planilha identificada com sucesso!
          </p>

          <p>
            <FileSpreadsheet
              size={16}
              style={{
                display: 'inline'
              }}
            />
            {' '}
            {arquivoNome}
          </p>

          <label htmlFor="aba-importada">
            <strong>Selecione a aba:</strong>
          </label>

          <select
            id="aba-importada"
            value={abaSelecionada}
            onChange={(event) => {
              setAbaSelecionada(
                Number(event.target.value)
              )

              setErro('')
              setSucesso('')
              setConfirmarAdicao(false)
            }}
            style={{
              display: 'block',
              marginTop: '8px',
              padding: '10px',
              width: '100%',
              maxWidth: '480px'
            }}
          >
            {abas.map((aba, indice) => (
              <option
                key={indice}
                value={indice}
              >
                {aba.nome} — {aba.areas.length} áreas
              </option>
            ))}
          </select>

          <div
            style={{
              marginTop: '24px',
              padding: '24px',
              background: '#f8fafc',
              borderRadius: '12px'
            }}
          >
            <h2>{abaAtual.titulo}</h2>

            <p>
              <strong>
                Áreas identificadas:
              </strong>
              {' '}
              {abaAtual.areas.length}
            </p>

            <p>
              <strong>
                Perguntas que serão salvas:
              </strong>
              {' '}
              {perguntas.length}
            </p>

            <div
              style={{
                display: 'grid',
                gap: '12px',
                marginTop: '20px'
              }}
            >
              {perguntas.map(
                (pergunta, indice) => (
                  <article
                    key={indice}
                    style={{
                      padding: '16px',
                      background: '#fff',
                      border:
                        '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  >
                    <strong>
                      {indice + 1}.{' '}
                      {pergunta.title}
                    </strong>

                    <p>
                      Tipo:{' '}
                      {pergunta.question_type}
                    </p>

                    {pergunta.options.length > 0 && (
                      <p>
                        Opções:{' '}
                        {pergunta.options.join(' / ')}
                      </p>
                    )}
                  </article>
                )
              )}
            </div>

            {abaAtual.observacoes.length > 0 && (
              <div
                style={{
                  marginTop: '24px'
                }}
              >
                <h3>
                  Orientações da planilha
                </h3>

                {abaAtual.observacoes.map(
                  (observacao, indice) => (
                    <p key={indice}>
                      {observacao}
                    </p>
                  )
                )}
              </div>
            )}

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginTop: '24px'
              }}
            >
              <input
                type="checkbox"
                checked={confirmarAdicao}
                onChange={(event) =>
                  setConfirmarAdicao(
                    event.target.checked
                  )
                }
              />

              Se este formulário já tiver
              perguntas, autorizo adicionar
              as novas sem apagar as anteriores.
            </label>

            <button
              type="button"
              onClick={() =>
                void salvarPerguntas()
              }
              disabled={salvando}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '20px',
                padding: '12px 20px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: salvando
                  ? 'wait'
                  : 'pointer'
              }}
            >
              <Save size={18} />

              {salvando
                ? 'Salvando...'
                : 'Salvar perguntas no Supabase'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
