export const RECAPTCHA_VERSION_2 = 2

function isValid(formEl: HTMLFormElement) {
  return getResponseElementValue(formEl)?.length !== 0
}

function getResponseElementValue(formEl: HTMLFormElement) {
  return (formEl.querySelector('.g-recaptcha-response') as HTMLInputElement)?.value || ''
}

function clearError(formUuid: string) {
  document.querySelectorAll(`#b12-recaptcha-error-${formUuid}`).forEach(el => el.style.display = 'none')
}

function highlightError(formUuid: string) {
  const errorEl = document.querySelector(`#b12-form-error-${formUuid}`) as HTMLElement
  if (!errorEl) return
  // If the reCAPTCHA error element doesn't exist yet, create it by cloning
  // the form error element (to maintain consistent styling) and inserting it after the form error element.
  const recaptchaErrorId = `b12-recaptcha-error-${formUuid}`
  let recaptchaErrorEl = document.querySelector(`#${recaptchaErrorId}`) as HTMLElement

  if (!recaptchaErrorEl) {
    recaptchaErrorEl = errorEl.cloneNode(true) as HTMLElement
    recaptchaErrorEl.id = recaptchaErrorId
    recaptchaErrorEl.textContent = 'Please complete the reCAPTCHA verification.'
    errorEl.insertAdjacentElement('afterend', recaptchaErrorEl)
  }
  recaptchaErrorEl.style.display = 'block'
}

export const reCaptcha2 = {
  isValid,
  getResponseElementValue,
  clearError,
  highlightError
}

// Used for both v2 and v3
export function addReCaptchaTokenInput(token: string, formEl: HTMLFormElement) {
  const reCaptchaTokenInput = Object.assign(document.createElement('input'), {
    type: 'hidden',
    name: 'google_recaptcha_token',
    value: token
  })
  formEl.appendChild(reCaptchaTokenInput)
}
