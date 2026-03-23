const KEY = 'obrapro_approval_code'
const DEFAULT = '1234'

export const approvalCode = {
  get: (): string => localStorage.getItem(KEY) || DEFAULT,
  set: (code: string): void => { localStorage.setItem(KEY, code) },
  validate: (input: string): boolean => input === (localStorage.getItem(KEY) || DEFAULT),
}
