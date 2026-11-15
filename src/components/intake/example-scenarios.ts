import { cases, scenarios } from '../../fixtures';

// Descriptions describe the conversation, not an expected model decision.
const descriptions: Record<string, string> = {
  'laura-initial': 'Ingresos y ahorros conjuntos, con una cuota cuya relación con los ingresos no está clara.',
  'laura-included': 'El cliente aclara que la cuota del coche ya está incluida en los ingresos declarados.',
  'laura-excluded': 'El cliente aclara que la cuota del coche se paga después de los ingresos declarados.',
  'laura-gross-correction': 'El cliente rectifica la base de sus ingresos de netos a brutos.',
  'laura-conflict': 'Dos declaraciones de ingresos diferentes invitan a revisar una posible contradicción.',
  'javier-trust': 'Ingresos variables, un audio sin transcripción y una duda sobre la confianza en el servicio.',
  'javier-opt-out': 'El cliente expresa dudas y pide que no se le contacte más.',
  'rosa-urgent': 'Urgencia de vivienda y petición de una confirmación de aprobación que requiere revisión humana.',
  'rosa-rental-only': 'La conversación incluye una petición explícita de alquiler tradicional.',
};

export const exampleScenarios = scenarios.filter(s => s.id in descriptions).map(scenario => {
  const base = cases.find(item => item.caseId === scenario.caseId)!;
  const conversation = [...base.messages, ...scenario.additions].map(message => {
    const content = message.content.type === 'text' ? message.content.text : '[audio sin transcripción]';
    return `${message.role === 'customer' ? 'Cliente' : 'Asesor'}: ${content}`;
  }).join('\n\n');
  return { id: scenario.id, description: descriptions[scenario.id], conversation };
});

export function randomScenario(previousId: string | null, random = Math.random) {
  const choices = exampleScenarios.filter(scenario => scenario.id !== previousId);
  return choices[Math.floor(random() * choices.length)];
}
