# Deleted Code Saver

A VS Code extension that automatically saves deleted code to a file for easy recovery.

## Features

- **Automatic Detection**: Monitors text document changes and detects when code is deleted
- **Configurable Threshold**: Only saves deletions above a minimum character count
- **Timestamped Entries**: Each deleted code entry includes timestamp and file location
- **Easy Access**: Commands to open and clear the deleted code log file
- **Workspace-Scoped**: Saves deleted code per workspace in `.vscode/deleted-code.log`

## Configuration

The extension provides several configuration options:

| Setting | Default | Description |
|---------|---------|-------------|
| `deletedCodeSaver.enabled` | `true` | Enable/disable the extension |
| `deletedCodeSaver.saveLocation` | `.vscode/deleted-code.log` | File path to save deleted code (relative to workspace root) |
| `deletedCodeSaver.minDeletionLength` | `10` | Minimum characters to consider significant deletion |
| `deletedCodeSaver.includeTimestamp` | `true` | Include timestamp with deleted code entries |

## Commands

- **Deleted Code Saver: Open Deleted Code File** - Opens the file containing saved deleted code
- **Deleted Code Saver: Clear Deleted Code File** - Clears the deleted code log file

## Usage

1. Install the extension
2. Start coding in VS Code
3. When you delete code (lines or blocks), it will automatically be saved to `.vscode/deleted-code.log`
4. Use the command palette to open or clear the deleted code file

## Sample Output

```
[2024-01-15T10:30:45.123Z] File: example.js, Line: 42
==================================================
function oldFunction() {
    console.log("This was deleted");
    return someValue;
}
==================================================

[2024-01-15T10:31:20.456Z] File: example.js, Line: 15
==================================================
// This comment was removed
const unusedVariable = "deleted";
==================================================
```

## Development

To set up for development:

```bash
npm install
npm run compile
```

To run in development mode:

```bash
# Open the extension folder in VS Code
code .

# Press F5 to open a new Extension Development Host window
# The extension will be loaded and active in the development window
```

To package the extension:

```bash
npm install -g @vscode/vsce
vsce package
```

To install the packaged extension:

```bash
# Install the .vsix file in VS Code
code --install-extension deleted-code-saver-1.0.0.vsix
```

## Troubleshooting

If you encounter TypeScript compilation errors:

1. Make sure you have the correct VS Code types installed:
   ```bash
   npm install --save-dev @types/vscode @types/node
   ```

2. Ensure your TypeScript version is compatible:
   ```bash
   npm install --save-dev typescript@^4.7.4
   ```

## License

MIT