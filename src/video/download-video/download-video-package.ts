export interface DownloadVideoPackageConfig {
  ffmpeg?: FfmpegOption
}
export class DownloadVideoPackage {
  static lastPackageUrl: string = ''
  entries: { name: string; data: Blob | string }[] = []
  constructor(private config: DownloadVideoPackageConfig = {}) {
  }
  private download(filename: string, blob: Blob) {
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    if (DownloadVideoPackage.lastPackageUrl) {
      URL.revokeObjectURL(DownloadVideoPackage.lastPackageUrl)
    }
    DownloadVideoPackage.lastPackageUrl = url
    a.setAttribute('href', url)
    a.setAttribute('download', filename)
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  add(name: string, data: string | Blob | null | undefined) {
    if (data === null || data === undefined) {
      return
    }
    this.entries.push({ name, data })
  }
  private async preEmit() {
    const videoFiles = this.entries
      .filter(it => ['.flv', '.mp4', '.m4s']
        .some(ext => it.name.endsWith(ext)))
    if (this.config.ffmpeg !== undefined && videoFiles.length >= 2) {
      if (this.config.ffmpeg === '文件列表' || this.config.ffmpeg === '文件列表+脚本') {
        this.entries.push({
          name: 'ffmpeg-files.txt',
          data: videoFiles.map(it => `file '${it.name}'`).join('\n'),
        })
      }
      if (this.config.ffmpeg === '文件列表+脚本') {
        const command = `ffmpeg -f concat -i ffmpeg-files.txt -c copy ""`
        this.entries.push(
          {
            name: 'ffmpeg.bat',
            data: command,
          },
          {
            name: 'ffmpeg.sh',
            data: command.replace(/"/g, "'"),
          }
        )
      }
    }
  }
  async blob(): Promise<Blob | null> {
    await this.preEmit()
    if (this.entries.length === 0) {
      return null
    }
    if (this.entries.length === 1) {
      const data = this.entries[0].data
      return typeof data === 'string' ? new Blob([data]) : data
    }
    const zip = new JSZip()
    this.entries.forEach(({ name, data }) => {
      zip.file(name, data)
    })
    return await zip.generateAsync({ type: 'blob' })
  }
  async emit(filename?: string) {
    if (!filename || this.entries.length === 1) {
      filename = this.entries[0].name
    }
    const blob = await this.blob()
    if (!blob) {
      return
    }
    return this.download(filename, blob)
  }
  static async single(filename: string, data: string | Blob, config: DownloadVideoPackageConfig = {}) {
    const pack = new DownloadVideoPackage(config)
    pack.add(filename, data)
    return await pack.emit()
  }
}
export default {
  export: {
    DownloadVideoPackage,
  },
}