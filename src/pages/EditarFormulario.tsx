
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import ImportarPlanilha from './ImportarPlanilha'

type EditarFormularioProps = {
  formularioId: string
}

export default function EditarFormulario({
  formularioId
}: EditarFormularioProps) {
  return (
    <section style={{ padding: '32px', width: '100%' }}>
      <button
        type="button"
        onClick={() => {
          window.location.hash = 'formularios'
        }}
        style={{
          display: 'inline-flex',
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

      <h1>Editar formulário</h1>

      <p>
        Identificador do formulário: {formularioId}
      </p>

      <div
        style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '12px',
          marginTop: '24px'
        }}
      >
        <h2>
          <FileSpreadsheet
            size={22}
            style={{ display: 'inline' }}
          />
          {' '}
          Importar perguntas do Excel
        </h2>

        <p>
          Importe uma planilha, confira as perguntas
          identificadas e salve no Supabase.
        </p>

        <ImportarPlanilha formularioId={formularioId} />
      </div>
    </section>
  )
}
