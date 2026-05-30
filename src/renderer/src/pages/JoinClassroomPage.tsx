import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinClassroom } from '../api/classroomApi'
import { PageHeader } from '../components/PageHeader'
import { getApiErrorMessage } from '../utils/apiError'

export function JoinClassroomPage(): JSX.Element {
  const navigate = useNavigate()
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')

    if (!classCode.trim()) {
      setError('Vui long nhap classCode.')
      return
    }

    setIsSubmitting(true)

    try {
      const member = await joinClassroom({ classCode: classCode.trim() })
      navigate(`/classrooms/${member.classroomId}`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Student"
        title="Join classroom"
        description="Student join classroom bang classCode tu backend."
      />

      <form className="form-card page-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}
        <label>
          Class code
          <input
            autoFocus
            required
            value={classCode}
            onChange={(event) => setClassCode(event.target.value)}
          />
        </label>
        <button className="button primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Dang join...' : 'Join classroom'}
        </button>
      </form>
    </div>
  )
}
