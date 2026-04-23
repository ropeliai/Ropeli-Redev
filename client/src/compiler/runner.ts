import { WebContainer } from '@webcontainer/api';

/**
 * Runs a command in the WebContainer and returns the process
 */
export async function runCommand(webcontainer: WebContainer, command: string, args: string[]) {
  const process = await webcontainer.spawn(command, args);
  
  return process;
}

/**
 * Specifically runs npm install and returns the exit code
 */
export async function installDependencies(webcontainer: WebContainer) {
  const installProcess = await webcontainer.spawn('npm', ['install']);
  return installProcess.exit;
}

/**
 * Specifically runs npm start and returns the process
 */
export async function startDevServer(webcontainer: WebContainer) {
  const serverProcess = await webcontainer.spawn('npm', ['run', 'dev']);
  return serverProcess;
}
