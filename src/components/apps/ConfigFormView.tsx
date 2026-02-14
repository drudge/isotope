import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function setDeepValue(obj: unknown, path: (string | number)[], value: unknown): unknown {
  const clone = deepClone(obj);
  let current: Record<string, unknown> | unknown[] = clone as Record<string, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    current = (current as Record<string, unknown>)[path[i] as string] as Record<string, unknown>;
  }
  const lastKey = path[path.length - 1];
  (current as Record<string, unknown>)[lastKey as string] = value;
  return clone;
}

function removeArrayItem(obj: unknown, path: (string | number)[], index: number): unknown {
  const clone = deepClone(obj);
  let current: Record<string, unknown> = clone as Record<string, unknown>;
  for (let i = 0; i < path.length; i++) {
    current = current[path[i] as string] as Record<string, unknown>;
  }
  (current as unknown as unknown[]).splice(index, 1);
  return clone;
}

function addArrayItem(obj: unknown, path: (string | number)[], defaultValue: unknown): unknown {
  const clone = deepClone(obj);
  let current: Record<string, unknown> = clone as Record<string, unknown>;
  for (let i = 0; i < path.length; i++) {
    current = current[path[i] as string] as Record<string, unknown>;
  }
  (current as unknown as unknown[]).push(deepClone(defaultValue));
  return clone;
}

function getDefaultForType(sample: unknown): unknown {
  if (typeof sample === 'string') return '';
  if (typeof sample === 'number') return 0;
  if (typeof sample === 'boolean') return false;
  if (sample === null) return null;
  if (Array.isArray(sample)) return [];
  if (typeof sample === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(sample as Record<string, unknown>)) {
      result[k] = getDefaultForType(v);
    }
    return result;
  }
  return '';
}

interface FieldRendererProps {
  label: string;
  value: unknown;
  path: (string | number)[];
  depth: number;
  onUpdate: (path: (string | number)[], value: unknown) => void;
  onRemoveArrayItem: (path: (string | number)[], index: number) => void;
  onAddArrayItem: (path: (string | number)[], defaultValue: unknown) => void;
}

const MAX_DEPTH = 4;

function FieldRenderer({
  label,
  value,
  path,
  depth,
  onUpdate,
  onRemoveArrayItem,
  onAddArrayItem,
}: FieldRendererProps) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  if (depth > MAX_DEPTH) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{formatKey(label)}</Label>
        <pre className="text-xs font-mono bg-muted/50 rounded-md p-2 overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-4 py-1">
        <Label className="text-sm font-normal">{formatKey(label)}</Label>
        <Switch
          checked={value}
          onCheckedChange={(checked) => onUpdate(path, checked)}
        />
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{formatKey(label)}</Label>
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            onUpdate(path, isNaN(num) ? 0 : num);
          }}
          className="font-mono text-sm"
        />
      </div>
    );
  }

  if (typeof value === 'string') {
    const isMultiline = value.includes('\n') || value.length > 100;
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{formatKey(label)}</Label>
        {isMultiline ? (
          <textarea
            value={value}
            onChange={(e) => onUpdate(path, e.target.value)}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y"
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onUpdate(path, e.target.value)}
            className="font-mono text-sm"
          />
        )}
      </div>
    );
  }

  if (value === null) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{formatKey(label)} <span className="opacity-50">(null)</span></Label>
        <Input
          value=""
          placeholder="null"
          onChange={(e) => onUpdate(path, e.target.value || null)}
          className="font-mono text-sm"
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    const sampleItem = value.length > 0 ? value[0] : '';
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <span className="text-sm font-medium">{formatKey(label)}</span>
          <span className="text-xs text-muted-foreground">({value.length} items)</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-2 pl-3 border-l-2 border-muted mt-2 space-y-3">
            {value.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 min-w-0">
                  <FieldRenderer
                    label={`${index}`}
                    value={item}
                    path={[...path, index]}
                    depth={depth + 1}
                    onUpdate={onUpdate}
                    onRemoveArrayItem={onRemoveArrayItem}
                    onAddArrayItem={onAddArrayItem}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 mt-5 text-muted-foreground hover:text-red-600"
                  onClick={() => onRemoveArrayItem(path, index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onAddArrayItem(path, getDefaultForType(sampleItem))}
            >
              <Plus className="h-3 w-3" />
              Add Item
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <span className="text-sm font-medium">{formatKey(label)}</span>
          <span className="text-xs text-muted-foreground">({entries.length} fields)</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-2 pl-3 border-l-2 border-muted mt-2 space-y-3">
            {entries.map(([key, val]) => (
              <FieldRenderer
                key={key}
                label={key}
                value={val}
                path={[...path, key]}
                depth={depth + 1}
                onUpdate={onUpdate}
                onRemoveArrayItem={onRemoveArrayItem}
                onAddArrayItem={onAddArrayItem}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return null;
}

interface ConfigFormViewProps {
  value: string;
  onChange: (value: string) => void;
}

export function ConfigFormView({ value, onChange }: ConfigFormViewProps) {
  const parsed = useMemo(() => {
    if (!value || !value.trim()) return { ok: true as const, data: {} };
    try {
      const data = JSON.parse(value);
      if (typeof data !== 'object' || data === null) {
        return { ok: false as const, error: 'Config must be a JSON object' };
      }
      return { ok: true as const, data };
    } catch {
      return { ok: false as const, error: 'Config is not valid JSON' };
    }
  }, [value]);

  const handleUpdate = useCallback(
    (path: (string | number)[], newValue: unknown) => {
      if (!parsed.ok) return;
      const updated = setDeepValue(parsed.data, path, newValue);
      onChange(JSON.stringify(updated, null, 2));
    },
    [parsed, onChange]
  );

  const handleRemoveArrayItem = useCallback(
    (path: (string | number)[], index: number) => {
      if (!parsed.ok) return;
      const updated = removeArrayItem(parsed.data, path, index);
      onChange(JSON.stringify(updated, null, 2));
    },
    [parsed, onChange]
  );

  const handleAddArrayItem = useCallback(
    (path: (string | number)[], defaultValue: unknown) => {
      if (!parsed.ok) return;
      const updated = addArrayItem(parsed.data, path, defaultValue);
      onChange(JSON.stringify(updated, null, 2));
    },
    [parsed, onChange]
  );

  if (!parsed.ok) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-1">{parsed.error}</p>
        <p className="text-sm text-muted-foreground">
          Use the <span className="font-medium">Raw</span> tab to edit the config directly.
        </p>
      </div>
    );
  }

  const entries = Object.entries(parsed.data as Record<string, unknown>);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No configuration fields</p>
        <p className="text-sm text-muted-foreground mt-1">
          This app has no configuration, or the config is empty.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, val]) => (
        <FieldRenderer
          key={key}
          label={key}
          value={val}
          path={[key]}
          depth={0}
          onUpdate={handleUpdate}
          onRemoveArrayItem={handleRemoveArrayItem}
          onAddArrayItem={handleAddArrayItem}
        />
      ))}
    </div>
  );
}
