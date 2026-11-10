export async function helloWorkflow(name: string) {
  "use workflow";
  const greeting = await makeGreeting(name);
  return { greeting };
}

async function makeGreeting(name: string) {
  "use step";
  return `Hello, ${name}!`;
}