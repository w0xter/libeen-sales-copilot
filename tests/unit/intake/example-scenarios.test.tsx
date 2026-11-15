import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { IntakeWorkspace } from '../../../src/components/intake/workspace';
import { exampleScenarios, randomScenario } from '../../../src/components/intake/example-scenarios';
import { parseConversation } from '../../../src/intake/parse-conversation';

let renderer: ReactTestRenderer;
afterEach(() => { if (renderer) act(() => renderer.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('uses parseable fictional transcripts and avoids repeating the previous scenario', () => {
  expect(exampleScenarios.length).toBeGreaterThan(1);
  for (const example of exampleScenarios) {
    expect(example.description).toBeTruthy();
    expect(parseConversation(example.conversation).ok).toBe(true);
  }
  const first = randomScenario(null, () => 0);
  expect(randomScenario(first.id, () => 0).id).not.toBe(first.id);
});

it('loads an explained example in free text and protects existing edits', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(false) });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  await act(async () => { renderer = create(<IntakeWorkspace />); });
  const button = (label: string) => renderer.root.findAllByType('button').find(item => item.children.includes(label))!;
  act(() => button('Texto libre').props.onClick());
  act(() => button('Cargar conversación aleatoria').props.onClick());
  const editor = renderer.root.findByProps({ 'aria-label': 'Texto original de la conversación' });
  expect(editor.props.value).toBe(exampleScenarios[0].conversation);
  expect(renderer.root.findAllByType('strong').some(item => item.children.includes('Qué observar:'))).toBe(true);
  act(() => button('Cargar conversación aleatoria').props.onClick());
  expect(window.confirm).toHaveBeenCalled();
  expect(renderer.root.findByProps({ 'aria-label': 'Texto original de la conversación' }).props.value).toBe(exampleScenarios[0].conversation);
});
