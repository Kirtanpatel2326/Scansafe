import { analyzeLabel } from './lib/claude'

async function main() {
  try {
    const res = await analyzeLabel('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')
    console.log("SUCCESS:", res)
  } catch (err: any) {
    console.error("ERROR:", err.message)
    if (err.response) {
      console.error("RESPONSE:", err.response.data)
    }
  }
}
main()
