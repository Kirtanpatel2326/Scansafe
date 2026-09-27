declare module 'gtts' {
  class gTTS {
    constructor(text: string, lang?: string);
    stream(): import('stream').Readable;
  }
  export default gTTS;
}
