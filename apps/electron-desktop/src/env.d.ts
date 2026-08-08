/// <reference types="vite/client" />

declare module '*?asset' {
    const source: string
    export default source
}

interface Window {
    electron: {
        ipcRenderer: {
            send(channel: string, ...args: any[]): void
            on(channel: string, func: (...args: any[]) => void): () => void
            once(channel: string, func: (...args: any[]) => void): void
        }
    }
}
