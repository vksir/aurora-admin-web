import {ElMessage} from "element-plus";

export function convertTime(t: string) {
  let t2 = t.split('.')[0]
  if (!t2) {
    return ''
  }
  return t2.replace('T', ' ');
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('ID 已复制');
  });
}
