import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/components/theme-provider';

interface ConfigRawEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function useResolvedTheme() {
  const { theme } = useTheme();
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ConfigRawEditor({ value, onChange, readOnly }: ConfigRawEditorProps) {
  const resolvedTheme = useResolvedTheme();
  const extensions = useMemo(() => [json()], []);

  const validationStatus = useMemo(() => {
    if (!value || !value.trim()) return null;
    try {
      JSON.parse(value);
      return { valid: true, message: 'Valid JSON' };
    } catch (e) {
      return { valid: false, message: (e as Error).message };
    }
  }, [value]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg border">
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={extensions}
          theme={resolvedTheme === 'dark' ? githubDark : githubLight}
          readOnly={readOnly}
          height="100%"
          minHeight="300px"
          className="h-full [&_.cm-editor]:h-full"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
          }}
        />
      </div>
      {validationStatus && (
        <div className={`flex items-center gap-1.5 mt-2 text-xs ${
          validationStatus.valid
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            validationStatus.valid ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {validationStatus.message}
        </div>
      )}
    </div>
  );
}
