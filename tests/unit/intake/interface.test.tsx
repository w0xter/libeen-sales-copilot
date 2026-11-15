import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntakeWorkspace } from '../../../src/components/intake/workspace';

describe('interfaz de intake', () => {
  it('ofrece entrada ficticia y análisis sin mostrar el producto anterior', () => {
    const html = renderToStaticMarkup(<IntakeWorkspace />);
    expect(html).toContain('Conversación');
    expect(html).toContain('Analizar conversación');
    expect(html).toContain('Laura');
    expect(html).toContain('Sin analizar');
  });
});
