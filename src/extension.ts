import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface DeletionInfo {
    text: string;
    fileName: string;
    lineNumber: number;
    timestamp: Date;
}

class DeletedCodeSaver {
    private disposables: vscode.Disposable[] = [];
    private documentVersions: Map<string, string> = new Map();

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Listen for document changes
        const changeDisposable = vscode.workspace.onDidChangeTextDocument(
            this.onDocumentChanged.bind(this)
        );
        this.disposables.push(changeDisposable);

        // Listen for document opens to track initial content
        const openDisposable = vscode.workspace.onDidOpenTextDocument(
            this.onDocumentOpened.bind(this)
        );
        this.disposables.push(openDisposable);

        // Track already open documents
        vscode.workspace.textDocuments.forEach(doc => {
            this.documentVersions.set(doc.uri.toString(), doc.getText());
        });
    }

    private onDocumentOpened(document: vscode.TextDocument) {
        this.documentVersions.set(document.uri.toString(), document.getText());
    }

    private onDocumentChanged(event: vscode.TextDocumentChangeEvent) {
        const config = vscode.workspace.getConfiguration('deletedCodeSaver');
        
        if (!config.get('enabled', true)) {
            return;
        }

        const document = event.document;
        const uri = document.uri.toString();
        const previousContent = this.documentVersions.get(uri) || '';
        const currentContent = document.getText();

        // Update stored version
        this.documentVersions.set(uri, currentContent);

        // Detect deletions
        const deletions = this.detectDeletions(previousContent, currentContent, document);
        
        for (const deletion of deletions) {
            this.saveDeletedCode(deletion);
        }
    }

    private detectDeletions(oldText: string, newText: string, document: vscode.TextDocument): DeletionInfo[] {
        const config = vscode.workspace.getConfiguration('deletedCodeSaver');
        const minLength = config.get('minDeletionLength', 10);
        const deletions: DeletionInfo[] = [];

        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');

        // Simple line-by-line deletion detection
        let oldIndex = 0;
        let newIndex = 0;

        while (oldIndex < oldLines.length && newIndex < newLines.length) {
            if (oldLines[oldIndex] === newLines[newIndex]) {
                oldIndex++;
                newIndex++;
            } else {
                // Look for matching line ahead
                let foundMatch = false;
                for (let i = newIndex + 1; i < Math.min(newLines.length, newIndex + 10); i++) {
                    if (oldLines[oldIndex] === newLines[i]) {
                        // Lines between newIndex and i were inserted
                        newIndex = i + 1;
                        oldIndex++;
                        foundMatch = true;
                        break;
                    }
                }

                if (!foundMatch) {
                    for (let i = oldIndex + 1; i < Math.min(oldLines.length, oldIndex + 10); i++) {
                        if (oldLines[i] === newLines[newIndex]) {
                            // Lines between oldIndex and i were deleted
                            const deletedText = oldLines.slice(oldIndex, i).join('\n');
                            if (deletedText.length >= minLength) {
                                deletions.push({
                                    text: deletedText,
                                    fileName: path.basename(document.fileName),
                                    lineNumber: oldIndex + 1,
                                    timestamp: new Date()
                                });
                            }
                            oldIndex = i + 1;
                            newIndex++;
                            foundMatch = true;
                            break;
                        }
                    }
                }

                if (!foundMatch) {
                    // Single line change/deletion
                    if (oldLines[oldIndex].length >= minLength) {
                        deletions.push({
                            text: oldLines[oldIndex],
                            fileName: path.basename(document.fileName),
                            lineNumber: oldIndex + 1,
                            timestamp: new Date()
                        });
                    }
                    oldIndex++;
                    newIndex++;
                }
            }
        }

        // Handle remaining deleted lines at end
        while (oldIndex < oldLines.length) {
            if (oldLines[oldIndex].length >= minLength) {
                deletions.push({
                    text: oldLines[oldIndex],
                    fileName: path.basename(document.fileName),
                    lineNumber: oldIndex + 1,
                    timestamp: new Date()
                });
            }
            oldIndex++;
        }

        return deletions;
    }

    private async saveDeletedCode(deletion: DeletionInfo) {
        const config = vscode.workspace.getConfiguration('deletedCodeSaver');
        const saveLocation = config.get('saveLocation', '.vscode/deleted-code.log');
        const includeTimestamp = config.get('includeTimestamp', true);

        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const logFilePath = path.join(workspaceRoot, saveLocation);

        // Ensure directory exists
        const logDir = path.dirname(logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const timestamp = includeTimestamp ? 
            `[${deletion.timestamp.toISOString()}] ` : '';
        
        const entry = `${timestamp}File: ${deletion.fileName}, Line: ${deletion.lineNumber}\n` +
                     `${'='.repeat(50)}\n` +
                     `${deletion.text}\n` +
                     `${'='.repeat(50)}\n\n`;

        fs.appendFileSync(logFilePath, entry, 'utf8');
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}

export function activate(context: vscode.ExtensionContext) {
    const deletedCodeSaver = new DeletedCodeSaver();
    context.subscriptions.push(deletedCodeSaver);

    // Register commands
    const openCommand = vscode.commands.registerCommand('deletedCodeSaver.openDeletedCodeFile', async () => {
        const config = vscode.workspace.getConfiguration('deletedCodeSaver');
        const saveLocation = config.get('saveLocation', '.vscode/deleted-code.log');
        
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder is open');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const logFilePath = path.join(workspaceRoot, saveLocation);

        if (fs.existsSync(logFilePath)) {
            const document = await vscode.workspace.openTextDocument(logFilePath);
            vscode.window.showTextDocument(document);
        } else {
            vscode.window.showInformationMessage('No deleted code file found');
        }
    });

    const clearCommand = vscode.commands.registerCommand('deletedCodeSaver.clearDeletedCodeFile', async () => {
        const config = vscode.workspace.getConfiguration('deletedCodeSaver');
        const saveLocation = config.get('saveLocation', '.vscode/deleted-code.log');
        
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder is open');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const logFilePath = path.join(workspaceRoot, saveLocation);

        const result = await vscode.window.showWarningMessage(
            'Are you sure you want to clear the deleted code file?',
            'Yes', 'No'
        );

        if (result === 'Yes' && fs.existsSync(logFilePath)) {
            fs.writeFileSync(logFilePath, '', 'utf8');
            vscode.window.showInformationMessage('Deleted code file cleared');
        }
    });

    context.subscriptions.push(openCommand, clearCommand);
}

export function deactivate() {}