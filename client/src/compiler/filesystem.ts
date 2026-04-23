import { WebContainer, FileSystemTree } from '@webcontainer/api';

/**
 * Mounts generated files into the WebContainer filesystem
 */
export async function mountFiles(webcontainer: WebContainer, files: { path: string; content: string }[]) {
  const tree: FileSystemTree = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // It's a file
        current[part] = {
          file: {
            contents: file.content,
          },
        };
      } else {
        // It's a directory
        if (!current[part]) {
          current[part] = {
            directory: {},
          };
        }
        current = (current[part] as any).directory;
      }
    }
  }

  await webcontainer.mount(tree);
}
