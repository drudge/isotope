import { useState } from 'react';
import { Plus, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BlockList {
  name: string;
  description: string;
  url: string;
  category: 'popular' | 'ads' | 'malware' | 'privacy' | 'social';
}

const POPULAR_BLOCK_LISTS: BlockList[] = [
  // Popular / Recommended
  {
    name: 'OISD Big',
    description: 'Comprehensive list blocking ads, trackers, and malware',
    url: 'https://big.oisd.nl/',
    category: 'popular',
  },
  {
    name: 'OISD Small',
    description: 'Lightweight version with fewer false positives',
    url: 'https://small.oisd.nl/',
    category: 'popular',
  },
  {
    name: 'Steven Black Unified',
    description: 'Unified hosts file with base adware/malware extensions',
    url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts',
    category: 'popular',
  },
  {
    name: 'Hagezi Pro',
    description: 'Multi-source blocklist with strong protection',
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/hosts/pro.txt',
    category: 'popular',
  },
  // Ads
  {
    name: 'AdGuard DNS Filter',
    description: 'Official AdGuard DNS filter list',
    url: 'https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt',
    category: 'ads',
  },
  {
    name: 'AdAway Default',
    description: 'Default blocklist from AdAway project',
    url: 'https://adaway.org/hosts.txt',
    category: 'ads',
  },
  {
    name: 'EasyList',
    description: 'Primary filter list for AdBlock',
    url: 'https://easylist.to/easylist/easylist.txt',
    category: 'ads',
  },
  {
    name: 'Peter Lowe Ad/Tracking',
    description: 'Known ad and tracking servers',
    url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0',
    category: 'ads',
  },
  // Malware
  {
    name: 'URLhaus Malicious URLs',
    description: 'Malware distribution sites from abuse.ch',
    url: 'https://urlhaus.abuse.ch/downloads/hostfile/',
    category: 'malware',
  },
  {
    name: 'Phishing Army',
    description: 'Phishing domain blocklist',
    url: 'https://phishing.army/download/phishing_army_blocklist.txt',
    category: 'malware',
  },
  {
    name: 'Malware Domain List',
    description: 'Community-driven malware domains',
    url: 'https://www.malwaredomainlist.com/hostslist/hosts.txt',
    category: 'malware',
  },
  // Privacy
  {
    name: 'EasyPrivacy',
    description: 'Tracking and privacy protection',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    category: 'privacy',
  },
  {
    name: 'Fanboy Annoyances',
    description: 'Blocks banners, pop-ups, and social media widgets',
    url: 'https://easylist.to/easylist/fanboy-annoyance.txt',
    category: 'privacy',
  },
  {
    name: 'NoTrack Tracker Blocklist',
    description: 'Comprehensive tracker blocking',
    url: 'https://gitlab.com/quidsup/notrack-blocklists/raw/master/notrack-blocklist.txt',
    category: 'privacy',
  },
  // Social Media
  {
    name: 'Steven Black + Social',
    description: 'Base list with social media sites blocked',
    url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/social/hosts',
    category: 'social',
  },
  {
    name: 'Fanboy Social',
    description: 'Social media tracking and widgets',
    url: 'https://easylist.to/easylist/fanboy-social.txt',
    category: 'social',
  },
];

interface AddBlockListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string) => Promise<void>;
  existingUrls: string[];
}

export function AddBlockListDialog({
  open,
  onOpenChange,
  onAdd,
  existingUrls,
}: AddBlockListDialogProps) {
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const validateUrl = (value: string): string | null => {
    if (!value.trim()) {
      return 'URL is required';
    }
    try {
      const parsed = new URL(value.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'URL must use HTTP or HTTPS';
      }
    } catch {
      return 'Invalid URL format';
    }
    if (existingUrls.includes(value.trim())) {
      return 'This block list is already added';
    }
    return null;
  };

  const handleAdd = async () => {
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsAdding(true);
    setError('');
    try {
      await onAdd(url.trim());
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add block list');
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickAdd = async (listUrl: string) => {
    setAddingUrl(listUrl);
    try {
      await onAdd(listUrl);
    } catch {
      // Error handled by parent
    } finally {
      setAddingUrl(null);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUrl('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  const isUrlAdded = (listUrl: string) => existingUrls.includes(listUrl);

  const renderBlockList = (list: BlockList) => {
    const added = isUrlAdded(list.url);
    const loading = addingUrl === list.url;

    return (
      <div
        key={list.url}
        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{list.name}</span>
            {added && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Added
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {list.description}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={list.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-accent rounded"
            title="View list"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
          <Button
            size="sm"
            variant={added ? 'ghost' : 'default'}
            disabled={added || loading}
            onClick={() => handleQuickAdd(list.url)}
            className="h-7 px-2"
          >
            {loading ? (
              'Adding...'
            ) : added ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const getListsByCategory = (category: BlockList['category']) =>
    POPULAR_BLOCK_LISTS.filter((list) => list.category === category);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Block List</DialogTitle>
          <DialogDescription>
            Choose from popular block lists or enter a custom URL
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="popular" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="ads">Ads</TabsTrigger>
            <TabsTrigger value="malware">Malware</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="popular" className="mt-0 space-y-2">
              {getListsByCategory('popular').map(renderBlockList)}
            </TabsContent>

            <TabsContent value="ads" className="mt-0 space-y-2">
              {getListsByCategory('ads').map(renderBlockList)}
            </TabsContent>

            <TabsContent value="malware" className="mt-0 space-y-2">
              {getListsByCategory('malware').map(renderBlockList)}
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-2">
              {getListsByCategory('privacy').map(renderBlockList)}
            </TabsContent>

            <TabsContent value="social" className="mt-0 space-y-2">
              {getListsByCategory('social').map(renderBlockList)}
            </TabsContent>

            <TabsContent value="custom" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="block-list-url">Block List URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="block-list-url"
                    placeholder="https://example.com/blocklist.txt"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd();
                    }}
                  />
                  <Button onClick={handleAdd} disabled={isAdding || !url.trim()}>
                    {isAdding ? 'Adding...' : 'Add'}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/50">
                <p className="font-medium">Supported formats:</p>
                <ul className="list-disc list-inside pl-2">
                  <li>Standard hosts file format</li>
                  <li>Plain text with one domain per line</li>
                  <li>AdBlock-style filter lists</li>
                </ul>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
