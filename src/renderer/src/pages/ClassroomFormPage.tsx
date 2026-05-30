import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createClassroom, getClassroom, updateClassroom } from '../api/classroomApi'
import { PageHeader } from '../components/PageHeader'
import { StatusMessage } from '../components/StatusMessage'
import { getApiErrorMessage } from '../utils/apiError'

interface ClassroomFormPageProps {
  mode: 'create' | 'edit'
}

export function ClassroomFormPage({ mode }: ClassroomFormPageProps): JSX.Element {
  const { id } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(mode === 'edit')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (mode !== 'edit' || !id) {
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const classroom = await getClassroom(id)
        setName(classroom.name)
        setDescription(classroom.description ?? '')
        setTeacherId(classroom.teacherId)
        setClassCode(classroom.classCode)
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [id, mode])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')

    if (!name.trim() || !teacherId.trim() || !classCode.trim()) {
      setError('Name, teacherId va classCode la bat buoc.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: name.trim(),
        description,
        teacherId: teacherId.trim(),
        classCode: classCode.trim()
      }
      const classroom =
        mode === 'create' ? await createClassroom(payload) : await updateClassroom(id ?? '', payload)
      navigate(`/classrooms/${classroom.id}`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Admin"
        title={mode === 'create' ? 'Tao classroom' : 'Sua classroom'}
        description="Backend chua co user/list-teachers API, nen teacherId phai nhap thu cong."
      />

      {isLoading ? <StatusMessage title="Dang tai du lieu classroom..." /> : null}

      <form className="form-card page-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}

        <label>
          Name
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>

        <label>
          Teacher ID
          <input required value={teacherId} onChange={(event) => setTeacherId(event.target.value)} />
        </label>

        <label>
          Class code
          <input required value={classCode} onChange={(event) => setClassCode(event.target.value)} />
        </label>

        <div className="form-actions">
          <button className="button primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Dang luu...' : 'Luu classroom'}
          </button>
          <button className="button ghost" type="button" onClick={() => navigate('/classrooms')}>
            Huy
          </button>
        </div>
      </form>
    </div>
  )
}
