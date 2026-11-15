import { extract, type Message } from './extraction';
import { identifyIssues } from './issues';
import { nextQuestion } from './next-question';

/** Conserva cada resultado, incluidos errores y descartes, para su inspección. */
export async function runIntake(messages: Message[], transport: Parameters<typeof extract>[1]) {
  const extraction = await extract(messages, transport);
  const issues = identifyIssues(extraction, messages);
  const intervention = nextQuestion(extraction, issues);
  return { extraction, issues, intervention };
}
