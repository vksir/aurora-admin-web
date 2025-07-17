export function convertTime(t: string) {
  let t2 = t.split('.')[0]
  if (!t2) {
    return ''
  }
  return t2.replace('T', ' ');
}
