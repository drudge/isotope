import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CopyableTextProps {
  text: string;
  className?: string;
  showIcon?: boolean;
}

export function CopyableText({ text, className = '', showIcon = true }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  if (!showIcon) {
    return (
      <span
        onClick={handleCopy}
        className={`cursor-pointer hover:bg-muted/50 px-1 rounded ${className}`}
        title="Click to copy"
      >
        {text}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span>{text}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 hover:bg-muted"
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
