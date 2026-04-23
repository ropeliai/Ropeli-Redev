import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;

/**
 * Get or initialize the WebContainer instance
 */
export async function getWebContainer() {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }
  
  webcontainerInstance = await WebContainer.boot();
  return webcontainerInstance;
}
