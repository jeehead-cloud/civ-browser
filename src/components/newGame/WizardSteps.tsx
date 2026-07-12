import type { NewGameStepId } from '../../newGame/constants'
import { NEW_GAME_STEPS } from '../../newGame/constants'

interface WizardStepsProps {
  current: NewGameStepId
  onSelect?: (step: NewGameStepId) => void
  /** Highest step the user may jump back to (completed or current). */
  maxReachable: NewGameStepId
}

export function WizardSteps({ current, onSelect, maxReachable }: WizardStepsProps) {
  return (
    <nav className="wizard-steps" aria-label="New Game steps">
      <ol className="wizard-steps__list">
        {NEW_GAME_STEPS.map((step, index) => {
          const reachable = step.id <= maxReachable
          const isCurrent = step.id === current
          const isComplete = step.id < current
          return (
            <li key={step.id} className="wizard-steps__item">
              {index > 0 ? <span className="wizard-steps__connector" aria-hidden="true" /> : null}
              <button
                type="button"
                className={[
                  'wizard-steps__btn',
                  isCurrent ? 'is-current' : '',
                  isComplete ? 'is-complete' : '',
                  !reachable ? 'is-disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={isCurrent ? 'step' : undefined}
                aria-disabled={!reachable}
                disabled={!reachable || !onSelect}
                onClick={() => {
                  if (reachable && onSelect) onSelect(step.id)
                }}
              >
                <span className="wizard-steps__index" aria-hidden="true">
                  {step.id}
                </span>
                <span className="wizard-steps__label">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
