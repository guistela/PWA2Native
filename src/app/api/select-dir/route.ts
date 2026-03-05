import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    let command = '';
    
    if (process.platform === 'darwin') {
      command = 'osascript -e \'POSIX path of (choose folder)\'';
    } else if (process.platform === 'win32') {
      // Basic fallback for Windows via PowerShell
      command = 'powershell -Command "(New-Object -ComObject Shell.Application).BrowseForFolder(0, \'Select Folder\', 0, 0).Self.Path"';
    } else {
      command = 'zenity --file-selection --directory';
    }

    const { stdout } = await execAsync(command);
    const selectedPath = stdout.trim();

    return NextResponse.json({ path: selectedPath });
  } catch (error) {
    console.error('Failed to open directory selector:', error);
    return NextResponse.json({ error: 'Failed to select directory or user cancelled.' }, { status: 500 });
  }
}
