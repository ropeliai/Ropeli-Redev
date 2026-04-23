import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  onTerminalReady: (terminal: XTerm) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ onTerminalReady }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    });

    if (!window.crossOriginIsolated) {
      term.write('\r\n\x1b[31m[Error] Browser is not Cross-Origin Isolated.\x1b[0m\r\n');
      term.write('\x1b[33mPlease restart your dev server and refresh the page.\x1b[0m\r\n');
      term.write('\x1b[33mIf the issue persists, try an Incognito window.\x1b[0m\r\n\r\n');
    }

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    onTerminalReady(term);

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />;
};
