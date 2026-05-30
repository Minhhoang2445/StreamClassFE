declare module '*?asset' {
  const src: string
  export default src
}

declare namespace JSX {
  type Element = import('react').ReactElement
}
