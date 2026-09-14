import { framer } from 'framer-plugin';
import { canvasControls, ENDWISE_CODE_FILE_NAME, ENDWISE_FRAMER_COMPONENT } from './code-source.ts';
import type { PluginConfig } from './config.ts';

type CodeExport = { name?: string; insertURL?: string; url?: string };
type CodeFile = {
  name?: string;
  exports?: CodeExport[];
  setFileContent?: (code: string) => Promise<void>;
};
type FramerCanvas = {
  isAllowedTo?: (...methods: string[]) => boolean;
  createCodeFile?: (
    name: string,
    code: string,
    opts?: { editViaPlugin?: boolean },
  ) => Promise<CodeFile>;
  getCodeFiles?: () => Promise<CodeFile[]>;
  addComponentInstance?: (input: {
    url: string;
    attributes?: { controls?: Record<string, unknown> };
  }) => Promise<{ setAttributes?: (a: { controls?: Record<string, unknown> }) => Promise<void> }>;
  notify?: (message: string, opts?: { variant?: 'success' | 'error' | 'info' }) => void;
};

function api(): FramerCanvas {
  return framer as unknown as FramerCanvas;
}

function fileName(file: CodeFile): string {
  return (file.name ?? '').replace(/\.tsx$/i, '');
}

function insertUrl(file: CodeFile): string | null {
  const exp =
    file.exports?.find((e) => (e.name ?? '').toLowerCase() === 'endwise') ?? file.exports?.[0];
  return exp?.insertURL ?? exp?.url ?? null;
}

/**
 * Oppretter Code File én gang og setter inn instans med Property Controls.
 * Ikke F4-11-synk: eksisterende fil overskrives ikke automatisk.
 */
export async function insertEndwiseComponent(config: PluginConfig): Promise<string> {
  const f = api();
  if (!f.createCodeFile || !f.addComponentInstance) {
    throw new Error('Denne Framer-versjonen kan ikke sette inn Code Components ennå.');
  }
  if (f.isAllowedTo && !f.isAllowedTo('createCodeFile', 'addComponentInstance')) {
    throw new Error('Pluginen mangler tillatelse til å legge til komponenter.');
  }

  const existing = (await f.getCodeFiles?.()) ?? [];
  let file = existing.find((c) => fileName(c) === ENDWISE_CODE_FILE_NAME);
  if (!file) {
    file = await f.createCodeFile(ENDWISE_CODE_FILE_NAME, ENDWISE_FRAMER_COMPONENT, {
      editViaPlugin: true,
    });
  }
  const url = insertUrl(file);
  if (!url) {
    throw new Error('Komponenten ble opprettet, men Framer ga ingen insert-URL. Prøv igjen.');
  }

  const node = await f.addComponentInstance({
    url,
    attributes: { controls: canvasControls(config) },
  });
  if (node.setAttributes) {
    await node.setAttributes({ controls: canvasControls(config) });
  }
  f.notify?.('Endwise-komponenten er satt inn på lerretet.', { variant: 'success' });
  return url;
}
