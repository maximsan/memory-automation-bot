export type HelpActionCommand = {
  command: string;
  usage: string;
  description: string;
};

export const helpActionCommands = [
  {
    command: "active",
    usage: "active",
    description: "show pending reviews and next work",
  },
  {
    command: "project",
    usage: "project <name>",
    description: "show one project state only",
  },
  {
    command: "addproject",
    usage: "addproject <name> [| alias, alias]",
    description: "add a project",
  },
  {
    command: "clean",
    usage: "clean",
    description: "remove temporary chat messages",
  },
  {
    command: "help",
    usage: "help",
    description: "show this",
  },
] as const satisfies readonly HelpActionCommand[];

export function helpCommandLines(): string[] {
  return helpActionCommands.map(
    (command) => `/${command.usage} - ${command.description}`,
  );
}

export function telegramMenuCommands(): {
  command: string;
  description: string;
}[] {
  return helpActionCommands.map(({ command, description }) => ({
    command,
    description,
  }));
}
