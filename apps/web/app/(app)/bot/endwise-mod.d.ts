declare module '@endwise/ui/morph-bot/endwise-splice' {
  export const ENDWISE_SHAPE_ID: 'endwise';
  export const ENDWISE_BLOB: {
    color: {
      body: string;
      eyes: string;
      darkBody: string;
      darkEyes: string;
    };
  };
  export const ENDWISE_OYE_FOR_TILSTAND: Readonly<Record<string, string>>;
  export const ENDWISE_OYE_INDEKS: Readonly<Record<string, number>>;
}

declare module '@endwise/ui/morph-bot/endwise-blob' {
  export const ENDWISE_SHAPE_ID: 'endwise';
  export const ENDWISE_BLOB: {
    shapeId: string;
    body96: [number, number][];
    eyes48: Record<string, { L: [number, number][]; R: [number, number][] }>;
  };
}
